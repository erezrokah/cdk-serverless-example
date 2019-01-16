#!/usr/bin/env node
import cdk = require('@aws-cdk/cdk');
import * as dotenv from 'dotenv';
import fs = require('fs');
import { ApiServiceStack } from '../lib/apiServiceStack';
import { getEnvs, publicKeyFilename } from '../../../scripts/env';
import { apiStackNamePrefix as stackNamePrefix } from '../../../scripts/stacks';

dotenv.config();

const { STAGE: stage, REGION: region } = getEnvs();

process.env.AUTH0_CLIENT_PUBLIC_KEY = fs
  .readFileSync(publicKeyFilename)
  .toString();

const app = new cdk.App();

new ApiServiceStack(app, `${stackNamePrefix}-${stage}`, {
  env: { region },
});

app.run();
