import cdk = require('@aws-cdk/cdk');
import frontend = require('../lib/frontend');

export class FrontendStack extends cdk.Stack {
  constructor(parent: cdk.App, name: string, props?: cdk.StackProps) {
    super(parent, name, props);
    new frontend.SinglePageApp(this, 'Frontend');
  }
}
