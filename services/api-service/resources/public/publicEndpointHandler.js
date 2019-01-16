module.exports.handler = (event, context, callback) => {
  callback(null, {
    body: JSON.stringify({
      message: 'Hi ⊂◉‿◉つ from Public API',
    }),
    headers: {
      /* Required for cookies, authorization headers with HTTPS */
      'Access-Control-Allow-Credentials': true,
      /* Required for CORS support to work */
      'Access-Control-Allow-Origin': '*',
    },
    statusCode: 200,
  });
};
