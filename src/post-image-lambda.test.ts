import { beforeEach } from 'node:test';
import { handler } from '../src/post-image-lambda';

describe('PostImage handler', () => {
  beforeEach(() => {
    process.env.BUCKET = 'test';
  });
  test('should fail validation when missing image property from request', async () => {
    const event: any = {
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const context: any = {};

    await expect(handler(event, context)).rejects.toThrow(
      'Event object failed validation'
    );
  });

  test('should fail validation when missing image contents from request', async () => {
    const event: any = {
      body: JSON.stringify({
        image: { fileName: 'test' },
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const context: any = {};

    await expect(handler(event, context)).rejects.toThrow(
      'Event object failed validation'
    );
  });

  test('should throw error when s3 bucket is not specified in env', async () => {
    const event: any = {
      body: JSON.stringify({
        image: { fileName: 'test.jpg', contents: 'test' },
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const context: any = {};

    await expect(handler(event, context)).rejects.toThrow(
      'No bucket name exists'
    );
  });

  test('should fail with 400 when missing file extension is incorrect', async () => {
    process.env.BUCKET = 'test';

    const event: any = {
      body: JSON.stringify({
        image: { fileName: 'test.docx', contents: 'test' },
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const context: any = {};

    const res = await handler(event, context);

    expect(res).toStrictEqual({
      statusCode: 400,
      headers: {},
      body: JSON.stringify({ response: 'File type not accepted' }),
    });
  });
});
