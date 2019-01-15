#!/usr/bin/env node
import cdk = require('@aws-cdk/cdk');
import AWS = require('aws-sdk');
import * as dotenv from 'dotenv';
import fs = require('fs');
import { ApiServiceStack } from '../lib/apiServiceStack';
import { FrontendStack } from '../lib/frontendStack';

dotenv.config();

const {
  STAGE: stage = 'dev',
  REGION: region = 'us-east-1',
  AUTH0_CLIENT_PUBLIC_KEY = '',
} = process.env;

process.env.AUTH0_CLIENT_PUBLIC_KEY = fs
  .readFileSync(AUTH0_CLIENT_PUBLIC_KEY)
  .toString();

const app = new cdk.App();

new ApiServiceStack(app, `ServerlessAppApiStack-${stage}`, {
  env: { region },
});
new FrontendStack(app, `ServerlessAppFrontendStack-${stage}`, {
  env: { region },
});
app.run();

const cloudformation = new AWS.CloudFormation({ region });
cloudformation
  .describeStacks({ StackName: `ServerlessAppApiStack-${stage}` })
  .promise()
  .then(data => {
    if (
      data.Stacks &&
      data.Stacks[0] &&
      data.Stacks[0].Outputs &&
      data.Stacks[0].Outputs[0]
    ) {
      console.log(data.Stacks[0].Outputs[0].OutputValue);
    } else {
      console.log(data);
    }
  });
