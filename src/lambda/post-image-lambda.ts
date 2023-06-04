import * as AWS from 'aws-sdk';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

// TODO: Add tests
// TODO: Create interface for request
export const postImage = async (event: APIGatewayProxyEventV2) => {
  console.log('Lambda hit: ', event);

  const data = event.body ? JSON.parse(event.body) : null;

  if (!data) {
    return {
      statusCode: 400,
      headers: {},
      body: JSON.stringify({ response: 'Request does not have a body' }),
    };
  }

  if (!data.image) {
    return {
      statusCode: 400,
      headers: {},
      body: JSON.stringify({
        response: 'Image property does not exist in request',
      }),
    };
  }

  const s3 = new AWS.S3();

  if (!process.env.BUCKET) {
    throw Error('No bucket name exists');
  }

  const fileName = data.image.fileName;
  const fileType = fileName.match(/(?<=\.)(jpg|jpeg|svg|png|gif)/);

  if (!fileType) {
    return {
      statusCode: 400,
      headers: {},
      body: JSON.stringify({ response: 'File type not accepted' }),
    };
  }

  if (!data.image.contents) {
    return {
      statusCode: 400,
      headers: {},
      body: JSON.stringify({ response: 'No image content' }),
    };
  }

  // This converts the base64 image into binary data that is accepted by the S3 bucket
  const base64Data = Buffer.from(
    data.image.contents.replace(/^data:image\/\w+;base64,/, ''),
    'base64'
  );

  const params = {
    Bucket: process.env.BUCKET,
    Body: base64Data,
    Key: data.image.fileName,
    ContentEncoding: 'base64', // required
    ContentType: `image/${fileType[0]}`, // required
  };

  try {
    await s3.putObject(params).promise();
  } catch (err) {
    //  throw Error(JSON.stringify(err));
    return { statusCode: 500, body: JSON.stringify({ response: err }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ response: 'Image upload successful' }),
  };
};

exports.handler = postImage;
