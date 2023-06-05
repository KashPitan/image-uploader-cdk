import { APIGatewayProxyEventV2 } from 'aws-lambda';

type PostImageRequestBody = {
  image: {
    contents: string;
    fileName: string;
  };
};

type APIGatewayOmitBody = Omit<APIGatewayProxyEventV2, 'body'>;

export interface PostImageEndpointEvent extends APIGatewayOmitBody {
  body: PostImageRequestBody;
}
