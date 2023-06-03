#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ImageUploadStack } from '../lib/image-upload-stack';

const app = new cdk.App();
new ImageUploadStack(app, 'ImageUploadStack', {});