#!/usr/bin/env node
import cdk = require('@aws-cdk/core');
import * as dotenv from 'dotenv';
import { getApiServiceEndpoint } from '../../scripts/aws';
import { getEnvs } from '../../scripts/env';
import { frontendStackNamePrefix as stackNamePrefix } from '../../scripts/stacks';
import { FrontendStack } from '../lib/frontendStack';

dotenv.config();

const { STAGE: stage, REGION: region } = getEnvs();

getApiServiceEndpoint().then(endpointUrl => {
  process.env.ENDPOINT_URL = endpointUrl;

  const app = new cdk.App();

  new FrontendStack(app, `${stackNamePrefix}-${stage}`, {
    env: { region },
  });
  app.synth();
});
