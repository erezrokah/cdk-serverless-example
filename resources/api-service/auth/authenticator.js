const jwt = require('jsonwebtoken');

const { AUTH0_CLIENT_ID, AUTH0_CLIENT_PUBLIC_KEY } = process.env;

// Policy helper function
const generatePolicy = (principalId, effect, resource) => {
  if (effect && resource) {
    const policyDocument = {
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
      Version: '2012-10-17',
    };
    return { principalId, policyDocument };
  } else {
    return { principalId };
  }
};

module.exports.decodeToken = async (authorizationToken, methodArn) => {
  const error = 'Unauthorized';
  if (!authorizationToken) {
    console.log('missing authorizationToken');
    return { response: null, error };
  }

  const tokenParts = authorizationToken.split(' ');
  const tokenValue = tokenParts[1];

  if (!(tokenParts[0].toLowerCase() === 'bearer' && tokenValue)) {
    console.log('invalid authorizationToken value');
    return { response: null, error };
  }

  const options = {
    audience: AUTH0_CLIENT_ID,
  };

  const promise = new Promise((resolve, reject) => {
    jwt.verify(tokenValue, AUTH0_CLIENT_PUBLIC_KEY, options, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });

  try {
    const decoded = await promise;
    console.log('valid from customAuthorizer', decoded);
    const response = generatePolicy(decoded.sub, 'Allow', methodArn);
    return { response, error: null };
  } catch (err) {
    console.log('verifyError', err);
    return { response: null, error };
  }
};
