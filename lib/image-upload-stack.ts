import { Stack, StackProps } from 'aws-cdk-lib';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as apigwv2 from '@aws-cdk/aws-apigatewayv2-alpha';
import { OriginAccessIdentity } from 'aws-cdk-lib/aws-cloudfront';

import {
  ArnPrincipal,
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { CfnStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { NagSuppressions } from 'cdk-nag';

import createS3Bucket from './constructs/s3/bucket';
import createLambdaResources from './constructs/lambda/lambda';
import createDistribution from './constructs/cloudfront/cloudfront';

// TODO: refactor and split out constructs
export class ImageUploadStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const accountNumber = this.node.tryGetContext('accountNumber');
    if (!accountNumber) {
      throw new Error(
        "You must specify an account number via context, e.g. 'cdk deploy -c accountNumber=...'"
      );
    }

    // move assets into single bucket?
    const assetBucket = createS3Bucket(this, 'asset-bucket', accountNumber);
    const siteBucket = createS3Bucket(this, 'site-bucket', accountNumber);

    NagSuppressions.addResourceSuppressions(siteBucket, [
      {
        id: 'AwsSolutions-S5',
        reason: 'ignore for now',
      },
    ]);

    const LAMBDA_ENVIRONMENT = {
      BUCKET: assetBucket.bucketName,
    };

    const {
      handler: postImagesLambda,
      integration: imagePostLambgaIntegration,
    } = createLambdaResources(this, 'post-image-lambda', LAMBDA_ENVIRONMENT);

    const {
      handler: getImagesLambda,
      integration: imagesGetLambdaIntegration,
    } = createLambdaResources(this, 'get-images-lambda', LAMBDA_ENVIRONMENT);

    // assetBucket.grantReadWrite(postImagesLambda);
    // auto generated policies from function above are not security compliant as they generate wildcard permissions
    // which by nature do not abide by the least privellege rule
    postImagesLambda.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [`${assetBucket.bucketArn}/*`],
        actions: ['s3:PutObject'],
      })
    );

    getImagesLambda.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [assetBucket.bucketArn],
        actions: ['s3:ListBucket'],
      })
    );

    const api = new apigwv2.HttpApi(this, 'image-api', {
      apiName: 'image-api',
      corsPreflight: {
        allowOrigins: ['*'], // update this to be more specific
        allowHeaders: ['Content-Type'],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.HEAD,
          apigwv2.CorsHttpMethod.OPTIONS,
          apigwv2.CorsHttpMethod.POST,
        ],
      },
    });

    // add config to each lambda?
    api.addRoutes({
      path: '/images',
      methods: [apigwv2.HttpMethod.POST],
      integration: imagePostLambgaIntegration,
    });

    api.addRoutes({
      path: '/images',
      methods: [apigwv2.HttpMethod.GET],
      integration: imagesGetLambdaIntegration,
    });

    this.enableApiGatewayLogging(api); // security compliance
    // TODO: Api auth

    const siteCDN = createDistribution(this, { siteBucket, assetBucket });

    const cdnOriginAccessIdentity = new OriginAccessIdentity(
      this,
      `ImageUploadCdnOAI`,
      {}
    );

    NagSuppressions.addResourceSuppressions(siteCDN, [
      {
        id: 'AwsSolutions-CFR4',
        reason: 'Adding viewer certificate later',
      },
      {
        id: 'AwsSolutions-CFR5',
        reason: 'Adding viewer certificate later',
      },
    ]);

    // this is a config that will be uploaded to the site s3 bucket to allow it to access the api url
    const appConfig = {
      API_URL: api.url,
      CDN_URL: siteCDN.distributionDomainName,
    };

    assetBucket.addToResourcePolicy(
      this.createOaiPolicyStatement(
        assetBucket.bucketArn,
        cdnOriginAccessIdentity.originAccessIdentityId
      )
    );
    siteBucket.addToResourcePolicy(
      this.createOaiPolicyStatement(
        siteBucket.bucketArn,
        cdnOriginAccessIdentity.originAccessIdentityId
      )
    );

    new BucketDeployment(this, 'imageUploadSiteDeployment', {
      destinationBucket: siteBucket,
      distribution: siteCDN,
      distributionPaths: ['/*'],
      sources: [
        Source.asset('src/site/build'),
        Source.jsonData('config.json', appConfig),
      ],
    });

    suppressNagErrors(this);
  }

  private createOaiPolicyStatement = (bucketArn: string, OaiId: string) => {
    return new PolicyStatement({
      sid: 'AllowCloudFront',
      effect: Effect.ALLOW,
      principals: [
        new ArnPrincipal(
          `arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity ${OaiId}`
        ),
      ],
      actions: ['s3:GetObject', 's3:ListBucket'],
      resources: [bucketArn, `${bucketArn}/*`],
    });
  };

  private enableApiGatewayLogging = (api: apigwv2.HttpApi) => {
    const logGroup = new LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/apigateway/${api.httpApiName}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: 1, // set to a day for this project but ideally would be 30+
    });

    const defaultStage = api.defaultStage!.node.defaultChild as CfnStage;
    defaultStage.accessLogSettings = {
      destinationArn: logGroup.logGroupArn,
      format: JSON.stringify({
        requestId: '$context.requestId',
        userAgent: '$context.identity.userAgent',
        sourceIp: '$context.identity.sourceIp',
        requestTime: '$context.requestTime',
        httpMethod: '$context.httpMethod',
        path: '$context.path',
        status: '$context.status',
        responseLength: '$context.responseLength',
      }),
    };
    logGroup.grantWrite(new ServicePrincipal('apigateway.amazonaws.com'));
  };
}

const suppressNagErrors = function (stack: Stack) {
  // by path instead of by construct as I'm suppressing errors from the constructs created
  // under the hood e.g. lambda created to upload files for bucket deployment
  NagSuppressions.addResourceSuppressionsByPath(
    stack,
    [
      '/ImageUploadStack/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C/Resource',
      '/ImageUploadStack/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C/ServiceRole/DefaultPolicy/Resource',
      '/ImageUploadStack/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C/ServiceRole/Resource',
    ],
    [
      {
        id: 'AwsSolutions-L1',
        reason: 'Auto created lambda function for bucket deployment',
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Auto created',
      },
      {
        id: 'AwsSolutions-IAM4',
        reason: 'Auto created lambda execution policy for bucket deployment',
      },
    ]
  );

  NagSuppressions.addResourceSuppressionsByPath(
    stack,
    [
      '/ImageUploadStack/image-api/POST--images/Resource',
      '/ImageUploadStack/image-api/GET--images/Resource',
    ],
    [
      {
        id: 'AwsSolutions-APIG4',
        reason: 'Adding auth later',
      },
    ]
  );

  NagSuppressions.addResourceSuppressionsByPath(
    stack,
    [
      '/ImageUploadStack/PostImageLambdaLambdaExecutionRole/DefaultPolicy/Resource',
    ],
    [
      {
        id: 'AwsSolutions-IAM5',
        reason:
          'S3 put object requires wildcard to add any object https://stackoverflow.com/questions/62222077/clienterror-an-error-occurred-accessdenied-when-calling-the-putobject-operati',
      },
    ]
  );
};
