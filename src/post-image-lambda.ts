import { PostImageEndpointEvent } from './types';

import middy from '@middy/core';
import validator from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';

// import httpErrorHandler from '@middy/http-error-handler';
import jsonBodyParser from '@middy/http-json-body-parser';

import PostImageSchema from './schemas/image-post-schema';
import { s3ImagePut } from './helper/s3/put-image';

const postImage = async (event: PostImageEndpointEvent) => {
  console.log(event.body);

  const { fileName, contents } = event.body.image;

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

  return await s3ImagePut(process.env.BUCKET, {
    base64Data,
    fileName,
    fileType,
  });
};

export const handler = middy(postImage)
  .use(jsonBodyParser())
  .use(validator({ eventSchema: transpileSchema(PostImageSchema) }));

exports.handler = handler;
