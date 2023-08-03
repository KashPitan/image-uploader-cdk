import { NagSuppressions } from 'cdk-nag';
import { aws_s3 as s3 } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BucketAccessControl } from 'aws-cdk-lib/aws-s3';

const kebabCase = require('just-kebab-case');

const createLogBucket = (scope: Construct, id: string) => {
  const bucket = new s3.Bucket(scope, `${id}AccessLogBucket`, {
    bucketName: `${kebabCase(`${id}AccessLogBucket`)}`,
    enforceSSL: true, // security compliance
    accessControl: BucketAccessControl.LOG_DELIVERY_WRITE,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    // block public access
  });

  NagSuppressions.addResourceSuppressions(bucket, [
    {
      id: 'AwsSolutions-S1',
      reason: 'Log bucket does not need access logs',
    },
  ]);

  return bucket;
};

export default createLogBucket;
