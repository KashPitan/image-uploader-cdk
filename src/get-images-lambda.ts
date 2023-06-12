import * as AWS from 'aws-sdk';

import middy from '@middy/core';
import { ListObjectsV2Request, ObjectList } from 'aws-sdk/clients/s3';
// import { PromiseResult } from 'aws-sdk/lib/request';

// import httpErrorHandler from '@middy/http-error-handler';

const getImages = async () => {
  const s3 = new AWS.S3();

  const bucket = process.env.BUCKET;
  if (!bucket) {
    throw Error('No bucket name exists');
  }

  const params: ListObjectsV2Request = {
    Bucket: bucket,
    Prefix: 'images/',
  };

  let imageObjects: ObjectList | undefined;
  //extract into s3 functions
  try {
    imageObjects = (await s3.listObjectsV2(params).promise()).Contents;
    console.log(imageObjects);
  } catch (err) {
    // add logger
    //  throw Error(JSON.stringify(err));
    return { statusCode: 500, body: JSON.stringify({ response: err }) };
  }

  if (!imageObjects) {
    return {
      statusCode: 204,
    };
  }

  const fileNames = imageObjects.map((image) => {
    return image.Key;
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ fileNames: fileNames }),
  };
};

export const handler = middy(getImages);

exports.handler = handler;
