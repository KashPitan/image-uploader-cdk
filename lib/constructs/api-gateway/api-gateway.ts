import * as apigwv2 from '@aws-cdk/aws-apigatewayv2-alpha';
import { Stack} from 'aws-cdk-lib';

const createApiGateway = (scope: Stack) => {
  return new apigwv2.HttpApi(scope, 'image-api', {
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
};

export default createApiGateway;
