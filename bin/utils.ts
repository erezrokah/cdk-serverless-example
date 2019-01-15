import dotenv = require('dotenv');
import fs = require('fs-extra');
import os = require('os');

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
