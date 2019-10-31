import cdk = require('@aws-cdk/core');
import apiService = require('../lib/apiService');

export class ApiServiceStack extends cdk.Stack {
  constructor(parent: cdk.App, name: string, props?: cdk.StackProps) {
    super(parent, name, props);

    new apiService.ApiService(this, 'Api');
  }
}
