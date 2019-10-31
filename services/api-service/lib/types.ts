import apigateway = require('@aws-cdk/aws-apigateway');
import cdk = require('@aws-cdk/core');

const stage = process.env.stage || 'dev';

export class RestApi extends apigateway.RestApi {
  constructor(
    parent: cdk.Construct,
    id: string,
    props: apigateway.RestApiProps,
  ) {
    super(parent, id, {
      ...props,
      deployOptions: { stageName: stage, ...props.deployOptions },
      restApiName: `${props.restApiName}-${stage}`,
    });
  }
}
