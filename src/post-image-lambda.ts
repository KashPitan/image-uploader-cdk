import * as AWS from 'aws-sdk';
// IMPORT JUST s3 to reduce size
import { PostImageEndpointEvent } from './types';

import middy from '@middy/core';
import validator from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';

// import httpErrorHandler from '@middy/http-error-handler';
import jsonBodyParser from '@middy/http-json-body-parser';

import PostImageSchema from './schemas/image-post-schema';

const postImage = async (event: PostImageEndpointEvent) => {
  console.log(event.body);

  const { fileName, contents } = event.body.image;

  const s3 = new AWS.S3();

  if (!process.env.BUCKET) {
    throw Error('No bucket name exists');
  }

  const fileType = fileName.match(/(?<=\.)(jpg|jpeg|svg|png|gif)/);

  if (!fileType) {
    return {
      statusCode: 400,
      headers: {},
      body: JSON.stringify({ response: 'File type not accepted' }),
    };
  }

  // This converts the base64 image into binary data that is accepted by the S3 bucket
  const base64Data = Buffer.from(
    contents.replace(/^data:image\/\w+;base64,/, ''),
    'base64'
  );

  const params = {
    Bucket: process.env.BUCKET,
    Body: base64Data,
    Key: `images/${fileName}`, // in images folder to match cdn path pattern
    ContentEncoding: 'base64', // required
    ContentType: `image/${fileType[0]}`, // required
  };

  try {
    await s3.putObject(params).promise();
  } catch (err) {
    // add error logger
    //  throw Error(JSON.stringify(err));
    return { statusCode: 500, body: JSON.stringify({ response: err }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ response: 'Image upload successful' }),
  };
};

export const handler = middy(postImage)
  .use(jsonBodyParser())
  .use(validator({ eventSchema: transpileSchema(PostImageSchema) }));

exports.handler = handler;
