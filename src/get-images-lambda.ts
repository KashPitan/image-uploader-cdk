import * as AWS from 'aws-sdk';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

import middy from '@middy/core';
import { ObjectList } from 'aws-sdk/clients/s3';
import { PromiseResult } from 'aws-sdk/lib/request';

// import httpErrorHandler from '@middy/http-error-handler';

const getImages = async (event: APIGatewayProxyEventV2) => {
  const s3 = new AWS.S3();

  const bucket = process.env.BUCKET;
  if (!bucket) {
    throw Error('No bucket name exists');
  }

  const params = {
    Bucket: bucket,
  };

  let imageObjects: ObjectList | undefined;

  //extract into s3 functions
  try {
    imageObjects = (await s3.listObjectsV2(params).promise()).Contents;
    // list objects then run get objects
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

  let imagePromises: Promise<
    PromiseResult<AWS.S3.GetObjectOutput, AWS.AWSError>
  >[] = [];
  imageObjects.forEach((imageObject) => {
    if (imageObject.Key) {
      imagePromises.push(
        s3.getObject({ Bucket: bucket, Key: imageObject.Key }).promise()
      );
    }
  });

  const data = await Promise.allSettled(imagePromises);
  console.log(data);

  return {
    statusCode: 200,
    body: JSON.stringify({ data }),
  };
};

export const handler = middy(getImages);

exports.handler = handler;
