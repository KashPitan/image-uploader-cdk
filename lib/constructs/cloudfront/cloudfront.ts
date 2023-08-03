import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import {
  ViewerProtocolPolicy,
  AllowedMethods,
  OriginRequestPolicy,
  ResponseHeadersPolicy,
  CachePolicy,
  CacheHeaderBehavior,
  SecurityPolicyProtocol,
  OriginAccessIdentity,
  ErrorResponse,
} from 'aws-cdk-lib/aws-cloudfront';

import * as cdk from 'aws-cdk-lib';
import { aws_cloudfront as cloudfront, aws_s3 as s3 } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NagSuppressions } from 'cdk-nag';

import createLogBucket from '../s3/log-bucket';

type distributionBuckets = {
  assetBucket: s3.Bucket;
  siteBucket: s3.Bucket;
};

const createDistribution = (scope: Construct, buckets: distributionBuckets) => {
  const cachePolicy = new CachePolicy(scope, `cdn-CachePolicy`, {
    headerBehavior: CacheHeaderBehavior.allowList(
      'Access-Control-Request-Headers',
      'Access-Control-Request-Method',
      'Origin'
    ),
  });

  // for some reason these don't create unless defined externally?
  const errorResponses: ErrorResponse[] = [
    {
      httpStatus: 403,
      responseHttpStatus: 200,
      responsePagePath: '/index.html',
      ttl: cdk.Duration.seconds(10),
    },
    {
      httpStatus: 404,
      responsePagePath: '/index.html',
      responseHttpStatus: 200,
      ttl: cdk.Duration.seconds(10),
    },
  ];

  const cdnAccessLogsBucket = createLogBucket(scope, 'imageUploadCdn');

  const siteCDN = new cloudfront.Distribution(scope, `image-upload-cdn`, {
    defaultRootObject: 'index.html',
    // handle react routing
    errorResponses,
    defaultBehavior: {
      origin: new S3Origin(buckets.siteBucket),
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      originRequestPolicy: OriginRequestPolicy.CORS_S3_ORIGIN,
      responseHeadersPolicy: ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
      cachePolicy,
    },
    additionalBehaviors: {
      '/images/*': {
        origin: new S3Origin(buckets.assetBucket),
        cachePolicy,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      },
    },
    logBucket: cdnAccessLogsBucket,
    enableLogging: true,
    minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
    // TODO: add viewer certificate
  });

  suppressions(siteCDN);
  return siteCDN;
};

const suppressions = function (cdn: cloudfront.Distribution) {
  NagSuppressions.addResourceSuppressions(cdn, [
    {
      id: 'AwsSolutions-CFR4',
      reason: 'Adding viewer certificate later',
    },
    {
      id: 'AwsSolutions-CFR5',
      reason: 'Adding viewer certificate later',
    },
  ]);
};

export default createDistribution;
