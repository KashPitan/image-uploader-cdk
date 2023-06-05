import { APIGatewayProxyEventV2 } from 'aws-lambda';

type PostImageRequestBody = {
  image: {
    contents: string;
    fileName: string;
  };
};

export type PostImageEndpointEvent = Omit<APIGatewayProxyEventV2, 'body'> & {
  body: PostImageRequestBody;
};
