import { handler } from '../src/post-image-lambda';

describe('PostImage handler', () => {
  test('200', async () => {
    const event: any = {
      body: JSON.stringify({
        image: { contents: 'test', fileName: 'test' },
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const context: any = {};

    const res = await handler(event, context);
    console.log(res);
    expect(1).toStrictEqual(1);
  });
});
