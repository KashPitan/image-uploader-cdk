import {
  Stack,
  StackProps,
  aws_s3 as s3,
  aws_lambda as lambda,
  aws_cloudfront as cloudfront,
} from 'aws-cdk-lib';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as apigwv2 from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { BlockPublicAccess, BucketAccessControl } from 'aws-cdk-lib/aws-s3';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import {
  ViewerProtocolPolicy,
  AllowedMethods,
  OriginRequestPolicy,
  ResponseHeadersPolicy,
  CachePolicy,
  CacheHeaderBehavior,
  SecurityPolicyProtocol,
} from 'aws-cdk-lib/aws-cloudfront';

import pascalCase from 'just-pascal-case';
import {
  ArnPrincipal,
  Effect,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { CfnStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { NagSuppressions } from 'cdk-nag';

const kebabCase = require('just-kebab-case');

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
    const assetBucket = this._createS3Bucket('asset-bucket', accountNumber);
    const siteBucket = this._createS3Bucket('site-bucket', accountNumber);

    const LAMBDA_ENVIRONMENT = {
      BUCKET: assetBucket.bucketName,
    };

    const {
      handler: postImagesLambda,
      integration: imagePostLambgaIntegration,
    } = this._createLambdaResources('post-image-lambda', LAMBDA_ENVIRONMENT);

    const {
      handler: getImagesLambda,
      integration: imagesGetLambdaIntegration,
    } = this._createLambdaResources('get-images-lambda', LAMBDA_ENVIRONMENT);

    // assetBucket.grantReadWrite(postImagesLambda);
    // auto generated policies from function above are not security compliant TODO: why?
    assetBucket.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [assetBucket.bucketArn],
        actions: ['s3:GetObject', 's3:DeleteObject*', 's3:PutObject*'],
        principals: [new ArnPrincipal(postImagesLambda.functionArn)],
      })
    );

    // assetBucket.grantRead(getImagesLambda);
    assetBucket.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [assetBucket.bucketArn],
        actions: ['s3:GetObject'],
        principals: [new ArnPrincipal(getImagesLambda.functionArn)],
      })
    );

    const api = new apigwv2.HttpApi(this, 'image-api', {
      apiName: 'image-api',
      corsPreflight: {
        allowOrigins: ['*'],
        allowHeaders: ['Content-Type'],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.HEAD,
          apigwv2.CorsHttpMethod.OPTIONS,
          apigwv2.CorsHttpMethod.POST,
        ],
      },
    });

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
    NagSuppressions.addResourceSuppressionsByPath(
      this,
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

    const cachePolicy = new CachePolicy(this, `${id}CachePolicy`, {
      headerBehavior: CacheHeaderBehavior.allowList(
        'Access-Control-Request-Headers',
        'Access-Control-Request-Method',
        'Origin'
      ),
    });

    const cdnAccessLogsBucket = this._createLogBucket('imageUploadCdn');
    const siteCDN = new cloudfront.Distribution(this, `image-upload-cdn`, {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new S3Origin(siteBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        originRequestPolicy: OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
        cachePolicy,
      },
      additionalBehaviors: {
        '/images/*': {
          origin: new S3Origin(assetBucket),
          cachePolicy,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        },
      },
      logBucket: cdnAccessLogsBucket,
      enableLogging: true,
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_1_2016,
      // TODO: add viewer certificate
    });

    NagSuppressions.addResourceSuppressions(siteCDN, [
      {
        id: 'AwsSolutions-CFR4',
        reason: 'Adding viewer certificate later',
      },
    ]);

    // this is a config that will be uploaded to the site s3 bucket to allow it to access the api url
    const appConfig = {
      API_URL: api.url,
      CDN_URL: siteCDN.distributionDomainName,
    };

    new BucketDeployment(this, 'imageUploadSiteDeployment', {
      destinationBucket: siteBucket,
      distribution: siteCDN,
      distributionPaths: ['/*'],
      sources: [
        Source.asset('src/site/build'),
        Source.jsonData('config.json', appConfig),
      ],
    });

    // by path instead of by construct as I'm suppressing errors from the constructs created
    // under the hood e.g. lambda created to upload files for bucket deployment
    NagSuppressions.addResourceSuppressionsByPath(
      this,
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
  }

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

  private _createLambdaResources = (fileName: string, environment?: {}) => {
    const functionName = `${pascalCase(fileName)}`;

    const logGroup = new LogGroup(this, `${functionName}LogGroup`, {
      logGroupName: `/aws/lambda/${functionName}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: 1, // set to a day for this project but ideally would be 30+
    });

    /* the auto generated execution role (AWSLambdaBasicExecutionRole) doesn't abide by least privellege rule.
    as it sets the resource to all (*) so I've overriden it here to apply to a single log group
    https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaBasicExecutionRole.html */
    const lambdaExecutionRole = new Role(
      this,
      `${functionName}LambdaExecutionRole`,
      {
        roleName: `${functionName}LambdaExecutionRole`,
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          basicExecutionRole: new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'logs:CreateLogGroup',
                  'logs:CreateLogStream',
                  'logs:PutLogEvents',
                ],
                resources: [logGroup.logGroupArn],
              }),
            ],
          }),
        },
      }
    );

    // TODO: add timeout
    const handler = new lambda.Function(this, `${functionName}Function`, {
      functionName: functionName,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: `${fileName}.handler`,
      code: lambda.Code.fromAsset('dist'),
      environment,
      role: lambdaExecutionRole,
    });

    const integration = new HttpLambdaIntegration(
      `${fileName}Integration`,
      handler
    );

    return { handler, integration };
  };

  private _createS3Bucket = (
    bucketName: string,
    accountNumber: string,
    options = {}
  ) => {
    return new s3.Bucket(this, bucketName, {
      bucketName: `${bucketName}-${kebabCase(accountNumber)}`,
      versioned: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL, // security compliance
      accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL, // security compliance
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      serverAccessLogsBucket: this._createLogBucket(bucketName), // security compliance
      serverAccessLogsPrefix: 'access-logs',
      enforceSSL: true, // security compliance
      ...options,
    });
  };

  // TODO: refactor into new file
  private _createLogBucket = (id: string) => {
    const bucket = new s3.Bucket(this, `${id}AccessLogBucket`, {
      enforceSSL: true,
    });

    NagSuppressions.addResourceSuppressions(bucket, [
      {
        id: 'AwsSolutions-S1',
        reason: 'Log bucket does not need access logs',
      },
    ]);

    return bucket;
  };
}
