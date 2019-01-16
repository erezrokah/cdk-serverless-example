import program = require('commander');
import * as dotenv from 'dotenv';
import fs = require('fs-extra');
import os = require('os');
import path = require('path');

dotenv.config();

export const apiServiceDir = path.join('services', 'api-service');
export const apiServiceEnvFile = path.join(apiServiceDir, '.env');
export const publicKeyFilename = 'public_key.pem';

export const frontendEnvFile = path.join('frontend', '.env');

export const replaceInEnvFile = async (
  envFile: string,
  envs: { [key: string]: string },
) => {
  const keys = Object.keys(envs);
  if (keys.length <= 0) {
    return;
  }

  await fs.ensureFile(envFile);
  const content = await fs.readFile(envFile);
  const envConfig = await dotenv.parse(content);

  keys.forEach(key => {
    envConfig[key] = envs[key];
  });

  await fs.remove(envFile);
  await Promise.all(
    Object.keys(envConfig).map(key =>
      fs.appendFile(envFile, `${key}=${envConfig[key]}${os.EOL}`),
    ),
  );
};

export const getEnvs = () => {
  const {
    AUTH0_CLIENT_ID = '',
    AUTH0_DOMAIN = '',
    AUTH0_MANAGEMNET_CLIENT_ID = '',
    AUTH0_MANAGEMNET_CLIENT_SECRECT = '',
    REGION = 'us-east-1',
    STAGE = 'dev',
  } = process.env;
  return {
    AUTH0_CLIENT_ID,
    AUTH0_DOMAIN,
    AUTH0_MANAGEMNET_CLIENT_ID,
    AUTH0_MANAGEMNET_CLIENT_SECRECT,
    REGION,
    STAGE,
  };
};

const syncEnvs = async () => {
  const { STAGE, REGION, AUTH0_DOMAIN, AUTH0_CLIENT_ID } = getEnvs();
  console.log('Syncing env variables');
  await Promise.all([
    replaceInEnvFile(apiServiceEnvFile, { STAGE, REGION, AUTH0_CLIENT_ID }),
    replaceInEnvFile(frontendEnvFile, {
      AUTH0_CLIENT_ID,
      AUTH0_DOMAIN,
      REGION,
      STAGE,
    }),
  ]);
  console.log('Done syncing env variables');
};

program.command('sync').action(async () => await syncEnvs());

program.parse(process.argv);
