import program = require('commander');
import * as dotenv from 'dotenv';
import fs = require('fs-extra');
import request = require('request-promise-native');
import { replaceInEnvFile } from './utils';

dotenv.config();

const {
  AUTH0_CLIENT_ID = '',
  AUTH0_DOMAIN = '',
  AUTH0_MANAGEMNET_CLIENT_ID = '',
  AUTH0_MANAGEMNET_CLIENT_SECRECT = '',
} = process.env;

const checkManagementCreds = () => {
  if (
    !AUTH0_DOMAIN ||
    !AUTH0_MANAGEMNET_CLIENT_ID ||
    !AUTH0_MANAGEMNET_CLIENT_SECRECT
  ) {
    throw new Error(
      'Missing AUTH0_DOMAIN || AUTH0_MANAGEMNET_CLIENT_ID or AUTH0_MANAGEMNET_CLIENT_SECRECT',
    );
  }
};

const getAuthToken = async () => {
  const response = JSON.parse(
    await request({
      body: JSON.stringify({
        audience: `https://${AUTH0_DOMAIN}/api/v2/`,
        client_id: AUTH0_MANAGEMNET_CLIENT_ID,
        client_secret: AUTH0_MANAGEMNET_CLIENT_SECRECT,
        grant_type: 'client_credentials',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
      url: `https://${AUTH0_DOMAIN}/oauth/token`,
    }),
  );
  return `${response.token_type} ${response.access_token}`;
};

const appName = 'Serverless Test App';
const url = `https://${AUTH0_DOMAIN}/api/v2/clients`;
const getServerlessApp = async (authorization: string) => {
  const response = JSON.parse(
    await request({
      headers: {
        authorization,
      },
      method: 'GET',
      url,
    }),
  );

  const client = response.filter(
    (c: any) => c.client_id === AUTH0_CLIENT_ID,
  )[0];
  return client;
};

export const createServerlessApp = async () => {
  checkManagementCreds();

  const authorization = await getAuthToken();
  const app = await getServerlessApp(authorization);
  if (!app) {
    const response = JSON.parse(
      await request({
        body: JSON.stringify({
          app_type: 'spa',
          name: appName,
          oidc_conformant: true,
        }),
        headers: { authorization, 'content-type': 'application/json' },
        method: 'POST',
        url,
      }),
    );
    const { client_id, signing_keys } = response;
    console.log('auth0 app created with client_id:', client_id);
    const certfile = 'public_key.pem';
    await Promise.all([
      replaceInEnvFile('.env', {
        AUTH0_CLIENT_ID: response.client_id,
        AUTH0_CLIENT_PUBLIC_KEY: certfile,
      }),
      fs.writeFile(certfile, signing_keys[0].cert),
    ]);
  } else {
    console.log('auth0 serverless app exists, skipping creation');
  }
};

export const updateServerlessApp = async () => {
  checkManagementCreds();
  const authorization = await getAuthToken();
  const app = await getServerlessApp(authorization);
  if (app) {
    // update callbacks and web origins
    const callbacks = [
      'http://localhost:3000/',
      'http://localhost:5000/',
      'https://dx5y025s04hkr.cloudfront.net/',
    ];
    const webOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'https://dx5y025s04hkr.cloudfront.net',
    ];
    const response = JSON.parse(
      await request({
        body: JSON.stringify({ callbacks, web_origins: webOrigins }),
        headers: { authorization, 'content-type': 'application/json' },
        method: 'PATCH',
        url: `${url}/${app.client_id}`,
      }),
    );
    console.log('auth0 app updated, client_id', response.client_id);
  } else {
    throw new Error('Could not find serverless app');
  }
};

program.command('create').action(async () => await createServerlessApp());
program.command('update').action(async () => await updateServerlessApp());

program.parse(process.argv);
