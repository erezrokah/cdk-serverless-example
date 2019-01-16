import AWS = require('aws-sdk');
import { getEnvs } from './env';
import { apiStackNamePrefix, frontendStackNamePrefix } from './stacks';

const { STAGE: stage, REGION: region } = getEnvs();

const getStackFirstOutput = async (stackName: string) => {
  const cloudformation = new AWS.CloudFormation({ region });
  const data = await cloudformation
    .describeStacks({ StackName: stackName })
    .promise();

  if (
    data.Stacks &&
    data.Stacks[0] &&
    data.Stacks[0].Outputs &&
    data.Stacks[0].Outputs[0]
  ) {
    return data.Stacks[0].Outputs[0].OutputValue || '';
  }
  return '';
};

export const getApiServiceEndpoint = async () => {
  return getStackFirstOutput(`${apiStackNamePrefix}-${stage}`);
};

export const getFrontendDomain = async () => {
  return getStackFirstOutput(`${frontendStackNamePrefix}-${stage}`);
};
