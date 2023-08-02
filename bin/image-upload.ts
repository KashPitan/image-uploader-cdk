#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ImageUploadStack } from '../lib/image-upload-stack';
import { Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';

const app = new cdk.App();
new ImageUploadStack(app, 'ImageUploadStack', {});
Aspects.of(app).add(new AwsSolutionsChecks({verbose: true}));
