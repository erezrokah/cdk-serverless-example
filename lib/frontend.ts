import cloudfront = require('@aws-cdk/aws-cloudfront');
import s3 = require('@aws-cdk/aws-s3');
import s3Deploy = require('@aws-cdk/aws-s3-deployment');
import cdk = require('@aws-cdk/cdk');
import fs = require('fs-extra');
import path = require('path');

const frontend = path.join('.', 'resources', 'frontend');
const frontendBuild = path.join(frontend, 'build');

const buildApp = (apiUrl: string) => {
  const frontendSrc = path.join(frontend, 'src');
  // copy src to build
  fs.removeSync(frontendBuild);
  fs.copySync(frontendSrc, frontendBuild);

  // update app.js with relevant values
  const appJs = 'app.js';
  const content = fs.readFileSync(path.join(frontendBuild, appJs));
  const { AUTH0_CLIENT_ID = '', AUTH0_DOMAIN = '' } = process.env;
  console.log(AUTH0_CLIENT_ID, AUTH0_DOMAIN, apiUrl);
  const replaced = content
    .toString()
    .replace(/AUTH0_CLIENT_ID_VALUE/g, AUTH0_CLIENT_ID)
    .replace(/AUTH0_DOMAIN_VALUE/g, AUTH0_DOMAIN)
    .replace(/ENDPOINT_URL/g, apiUrl);

  fs.writeFileSync(path.join(frontendBuild, appJs), replaced);
};

export class SinglePageApp extends cdk.Construct {
  constructor(parent: cdk.Construct, name: string) {
    super(parent, name);

    buildApp('apiUrl');

    const websiteBucket = new s3.Bucket(this, 'SinglePageAppBucket', {
      publicReadAccess: true,
      websiteIndexDocument: 'index.html',
    });

    new s3Deploy.BucketDeployment(this, 'DeploySinglePageApp', {
      destinationBucket: websiteBucket,
      source: s3Deploy.Source.asset(frontendBuild),
    });

    const distribution = new cloudfront.CloudFrontWebDistribution(
      this,
      'SinglePageAppDistribution',
      {
        originConfigs: [
          {
            behaviors: [{ isDefaultBehavior: true }],
            s3OriginSource: {
              s3BucketSource: websiteBucket,
            },
          },
        ],
      },
    );

    new cdk.Output(this, 'DomainName', {
      value: distribution.domainName,
    })
      .makeImportValue()
      .toString();
  }
}
