import program = require('commander');
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

export const invalidateCloudfrontCache = async () => {
  const cloudfront = new AWS.CloudFront({ region });
  const [domain, result] = await Promise.all([
    getFrontendDomain(),
    cloudfront.listDistributions().promise(),
  ]);

  const distributions = result.DistributionList || { Items: [] };
  const items = distributions.Items || [];
  const distribution = items.find(entry => entry.DomainName === domain);

  if (distribution) {
    console.log(
      `Invalidating CloudFront distribution with id: ${distribution.Id}`,
    );
    try {
      const params = {
        DistributionId: distribution.Id,
        InvalidationBatch: {
          CallerReference: `frontend-deployment-script-${new Date()
            .getTime()
            .toString()}`,
          Paths: {
            Quantity: 1,
            Items: ['/*'],
          },
        },
      };
      await cloudfront.createInvalidation(params).promise();
      console.log('Successfully invalidated CloudFront cache');
    } catch (error) {
      console.log(error);
      throw new Error('Failed invalidating CloudFront cache');
    }
  } else {
    const message = `Could not find distribution with domain ${domain}`;
    const error = new Error(message);
    console.log(message);
    throw error;
  }
};

program
  .command('invalidateCloudfrontCache')
  .action(async () => await invalidateCloudfrontCache());

program.parse(process.argv);
