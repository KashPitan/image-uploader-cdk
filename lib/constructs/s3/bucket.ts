import { aws_s3 as s3 } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BlockPublicAccess, BucketAccessControl } from 'aws-cdk-lib/aws-s3';

import createLogBucket from './log-bucket';

const kebabCase = require('just-kebab-case');

const createS3Bucket = (
  scope: Construct,
  bucketName: string,
  accountNumber: string,
  options: s3.BucketProps = {}
) => {
  return new s3.Bucket(scope, bucketName, {
    bucketName: `${bucketName}-${kebabCase(accountNumber)}`,
    versioned: true,
    blockPublicAccess: BlockPublicAccess.BLOCK_ALL, // security compliance
    accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL, // security compliance
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
    serverAccessLogsBucket: createLogBucket(scope, bucketName), // security compliance
    serverAccessLogsPrefix: 'access-logs',
    enforceSSL: true, // security compliance
    ...options,
  });
};

export default createS3Bucket;
