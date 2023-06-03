import { Stack, StackProps, aws_s3 as s3, aws_lambda as lambda, aws_apigateway as apigateway, aws_cloudfront_origins as origins, aws_cloudfront as cloudfront} from 'aws-cdk-lib';
import { BucketDeployment, Source} from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as apigwv2 from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { BlockPublicAccess, BucketAccessControl } from "aws-cdk-lib/aws-s3";

const kebabCase = require('just-kebab-case');

export class ImageUploadStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const accountNumber = this.node.tryGetContext('accountNumber');
    if(!accountNumber){
      throw new Error("You must specify an account number via context, e.g. 'cdk deploy -c accountNumber=...'");
    }

    const assetBucket = this._createS3Bucket('asset-bucket', accountNumber);
    const siteBucket = this._createS3Bucket('site-bucket', accountNumber, { isWebsite: true, websiteIndexDocument: "index.html", publicReadAccess: true });

    const siteCDN = new cloudfront.CloudFrontWebDistribution(this, `image-upload-cdn`, {
      originConfigs: [{customOriginSource: {
        domainName: siteBucket.bucketWebsiteDomainName,
        originProtocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY
      }, behaviors: [{
        isDefaultBehavior: true
      }]}],
    });

    new BucketDeployment(this, 'imageUploadSiteDeployment', {
      destinationBucket: siteBucket,
      distribution: siteCDN,
      distributionPaths: ['/*'],
      sources: [Source.asset('src/site/build')]
    });

    // TODO set up public access for url

    const uploadImageLambda = new lambda.Function(this, 'UploadImageFunction', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'uploadImageToLambda.handler',
      code: lambda.Code.fromAsset('dist'),
      environment: {
        BUCKET: assetBucket.bucketName
      }
    });

    // grant access to s3 bucket
    assetBucket.grantReadWrite(uploadImageLambda);

    const api = new apigwv2.HttpApi(this, 'image-api');
    const imageUploadLambdaIntegration = new HttpLambdaIntegration('ImageUploadLambdaIntegration', uploadImageLambda);

    api.addRoutes({
      path: '/upload-image',
      methods: [apigwv2.HttpMethod.POST],
      integration: imageUploadLambdaIntegration
    });
  }

  private _createS3Bucket = (bucketName: string, accountNumber: string, options={}) => {
    return new s3.Bucket(this, bucketName, {
      bucketName: `${bucketName}-${kebabCase(accountNumber)}`,
      versioned: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ACLS,
      accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      // If stack is deleted, bucket still remains. This deletes the bucket if the stack is deleted.
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true, //bucket can't be destoyed if it has objects in it
      ...options
    });
  }
}
