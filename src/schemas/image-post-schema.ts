const schema = {
  required: ['body'],
  type: 'object',
  properties: {
    body: {
      type: 'object',
      required: ['image'],
      properties: {
        image: {
          type: 'object',
          required: ['contents', 'fileName'],
          properties: {
            contents: {
              type: 'string',
            },
            fileName: {
              type: 'string',
            },
          },
        },
      },
    },
  },
};

export default schema;
