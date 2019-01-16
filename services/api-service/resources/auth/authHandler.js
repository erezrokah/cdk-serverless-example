const { decodeToken } = require('./authenticator');

module.exports.handler = (event, context, callback) => {
  console.log(event);
  return decodeToken(event.authorizationToken, event.methodArn).then(
    ({ response, error }) => {
      if (error) {
        callback && callback(error);
      } else {
        callback && callback(null, response);
      }
    },
  );
};
