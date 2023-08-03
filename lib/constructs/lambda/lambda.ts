import { Stack, StackProps, aws_lambda as lambda } from 'aws-cdk-lib';
import pascalCase from 'just-pascal-case';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import * as cdk from 'aws-cdk-lib';
import {
  ArnPrincipal,
  Effect,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';

import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';

const createLambdaResources = (
  scope: Stack,
  fileName: string,
  environment?: {}
) => {
  const functionName = `${pascalCase(fileName)}`;

  const logGroup = new LogGroup(scope, `${functionName}LogGroup`, {
    logGroupName: `/aws/lambda/${functionName}`,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    retention: 1, // set to a day for this project but ideally would be 30+
  });

  /* the auto generated execution role (AWSLambdaBasicExecutionRole) is for logging permissions but doesn't 
    abide by least privellege rule as it sets the resource to all (*) so I've overriden it here to apply to a single log group
    https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaBasicExecutionRole.html */
  const lambdaExecutionRole = new Role(
    scope,
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
  const handler = new lambda.Function(scope, `${functionName}Function`, {
    functionName: functionName,
    runtime: lambda.Runtime.NODEJS_18_X,
    handler: `${fileName}.handler`,
    code: lambda.Code.fromAsset('dist'),
    environment,
    role: lambdaExecutionRole, // security compliance
  });

  const integration = new HttpLambdaIntegration(
    `${fileName}Integration`,
    handler
  );

  return { handler, integration };
};

export default createLambdaResources;
