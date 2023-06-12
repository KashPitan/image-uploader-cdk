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
} from 'aws-cdk-lib/aws-cloudfront';

import pascalCase from 'just-pascal-case';

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

    const assetBucket = this._createS3Bucket('asset-bucket', accountNumber);
    const siteBucket = this._createS3Bucket('site-bucket', accountNumber, {
      publicReadAccess: true,
    });

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

    assetBucket.grantReadWrite(postImagesLambda);
    assetBucket.grantRead(getImagesLambda);

    const api = new apigwv2.HttpApi(this, 'image-api', {
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

    const cachePolicy = new CachePolicy(this, `${id}CachePolicy`, {
      headerBehavior: CacheHeaderBehavior.allowList(
        'Access-Control-Request-Headers',
        'Access-Control-Request-Method',
        'Origin'
      ),
    });

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
    });

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
  }

  private _createLambdaResources = (fileName: string, environment: {}) => {
    const handler = new lambda.Function(
      this,
      `${pascalCase(fileName)}Function`,
      {
        runtime: lambda.Runtime.NODEJS_16_X,
        handler: `${fileName}.handler`,
        code: lambda.Code.fromAsset('dist'),
        environment,
      }
    );

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
      blockPublicAccess: BlockPublicAccess.BLOCK_ACLS,
      accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      ...options,
    });
  };
}
