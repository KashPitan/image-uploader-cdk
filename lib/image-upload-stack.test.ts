import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ImageUploadStack } from './image-upload-stack';

import { Code } from 'aws-cdk-lib/aws-lambda';

let stack: Stack;

describe('image upload stack', () => {
  beforeAll(() => {
    Code.fromAsset = jest.fn().mockReturnValue(Code.fromAsset('./test/mocks'));
  });

  beforeEach(() => {
    stack = new Stack();
  });
  test('should create image upload stack with correct resources', (done) => {
    const stack = new Stack();
    stack.node.setContext('accountNumber', '000000000');

    const imageUploadStack = new ImageUploadStack(
      stack,
      'testImageUploadStack',
      {}
    );

    const template = Template.fromStack(imageUploadStack);

    expect(template).toMatchSnapshot();

    done();
  });

  test('should throw an error when the env context argument is not defined', (done) => {
    expect(() => {
      new ImageUploadStack(stack, 'testImageUploadStack', {});
    }).toThrow(
      `You must specify an account number via context, e.g. 'cdk deploy -c accountNumber=...'`
    );

    done();
  });
});
