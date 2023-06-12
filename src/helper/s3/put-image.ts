import * as AWS from 'aws-sdk';

type s3ImagePutParams = {
  base64Data: Buffer;
  fileName: string;
  fileType: RegExpMatchArray;
};

export const s3ImagePut = async (bucket: string, params: s3ImagePutParams) => {
  const { base64Data, fileName, fileType } = params;

  const s3ClientParams = {
    Bucket: bucket,
    Body: base64Data,
    Key: `images/${fileName}`, // in images folder to match cdn path pattern
    ContentEncoding: 'base64', // required
    ContentType: `image/${fileType[0]}`, // required
  };

  const s3 = new AWS.S3();

  try {
    await s3.putObject(s3ClientParams).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ response: 'Image upload successful' }),
    };
  } catch (err) {
    // add error logger
    //  throw Error(JSON.stringify(err));
    return { statusCode: 500, body: JSON.stringify({ response: err }) };
  }
};
