import apigateway = require('@aws-cdk/aws-apigateway');
import iam = require('@aws-cdk/aws-iam');
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/cdk');
import path = require('path');
import { RestApi } from './types';

// https://github.com/awslabs/aws-cdk/issues/906
const addCorsOptions = (apiResource: apigateway.IRestApiResource) => {
  const method = apiResource.addMethod(
    'OPTIONS',
    new apigateway.MockIntegration({
      integrationResponses: [
        {
          responseParameters: {
            'method.response.header.Access-Control-Allow-Credentials':
              "'false'",
            'method.response.header.Access-Control-Allow-Headers':
              "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
            'method.response.header.Access-Control-Allow-Methods':
              "'OPTIONS,POST,'",
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          },
          statusCode: '200',
        },
      ],
      passthroughBehavior: apigateway.PassthroughBehavior.Never,
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    }),
  );

  const methodResource = method.node.findChild(
    'Resource',
  ) as apigateway.CfnMethod;
  methodResource.propertyOverrides.methodResponses = [
    {
      responseModels: {
        'application/json': 'Empty',
      },
      responseParameters: {
        'method.response.header.Access-Control-Allow-Credentials': true,
        'method.response.header.Access-Control-Allow-Headers': true,
        'method.response.header.Access-Control-Allow-Methods': true,
        'method.response.header.Access-Control-Allow-Origin': true,
      },
      statusCode: '200',
    },
  ];
};

const resources = path.join('.', 'resources');

export class ApiService extends cdk.Construct {
  constructor(parent: cdk.Construct, name: string) {
    super(parent, name);

    const privateEndpointHandler = new lambda.Function(
      this,
      'PrivateEndpointHandler',
      {
        code: lambda.Code.directory(path.join(resources, 'private')),
        handler: 'privateEndpointHandler.handler',
        runtime: lambda.Runtime.NodeJS810,
      },
    );

    const publicEndpointHandler = new lambda.Function(
      this,
      'PublicEndpointHandler',
      {
        code: lambda.Code.directory(path.join(resources, 'public')),
        handler: 'publicEndpointHandler.handler',
        runtime: lambda.Runtime.NodeJS810,
      },
    );

    // Create an API Gateway REST API
    const api = new RestApi(this, 'rest-api', {
      description: 'This service serves widgets.',
      restApiName: 'Rest Api Service',
    });

    // required for custom auth lambda cors support
    new apigateway.CfnGatewayResponse(this, 'Expired Token', {
      responseParameters: {
        'gatewayresponse.header.Access-Control-Allow-Headers': "'*'",
        'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
      },
      responseType: 'EXPIRED_TOKEN',
      restApiId: api.restApiId,
      statusCode: '401',
    });
    new apigateway.CfnGatewayResponse(this, 'Unauthorized', {
      responseParameters: {
        'gatewayresponse.header.Access-Control-Allow-Headers': "'*'",
        'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
      },
      responseType: 'UNAUTHORIZED',
      restApiId: api.restApiId,
      statusCode: '401',
    });

    // create the custom auth lambda
    const authHandler = new lambda.Function(this, 'AuthHandler', {
      code: lambda.Code.directory(path.join(resources, 'auth')),
      environment: {
        AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
        AUTH0_CLIENT_PUBLIC_KEY: process.env.AUTH0_CLIENT_PUBLIC_KEY,
      },
      handler: 'authHandler.handler',
      runtime: lambda.Runtime.NodeJS810,
    });

    // create execution role for auth lambda
    const role = new iam.Role(this, 'RestApiAuthHandlerRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });
    authHandler.grantInvoke(role);

    // connect auth lambda with api
    const region = process.env.region || 'us-east-1';
    const authorizerUri = `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${
      authHandler.functionArn
    }/invocations`;

    const authorizer = new apigateway.CfnAuthorizer(this, 'Authorizer', {
      authorizerCredentials: role.roleArn,
      authorizerUri,
      identitySource: 'method.request.header.Authorization',
      name: 'rest-api-authorizer',
      restApiId: api.restApiId,
      type: 'TOKEN',
    });

    const restApi = api.root.addResource('api');

    // /api/private
    const privateApi = restApi.addResource('private');
    addCorsOptions(privateApi);
    privateApi.addMethod(
      'POST',
      new apigateway.LambdaIntegration(privateEndpointHandler),
      {
        authorizationType: apigateway.AuthorizationType.Custom,
        authorizerId: authorizer.authorizerId,
      },
    );

    // /api/public
    const publicApi = restApi.addResource('public');
    addCorsOptions(publicApi);
    publicApi.addMethod(
      'POST',
      new apigateway.LambdaIntegration(publicEndpointHandler),
    );
  }
}
