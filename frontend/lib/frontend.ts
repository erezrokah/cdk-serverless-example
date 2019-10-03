import cloudfront = require('@aws-cdk/aws-cloudfront');
import s3 = require('@aws-cdk/aws-s3');
import s3Deploy = require('@aws-cdk/aws-s3-deployment');
import cdk = require('@aws-cdk/core');
import fs = require('fs-extra');
import path = require('path');

const frontend = path.join('.', 'resources');
const frontendBuild = path.join(frontend, 'build');

const buildApp = () => {
  const frontendSrc = path.join(frontend, 'src');
  // copy src to build
  fs.removeSync(frontendBuild);
  fs.copySync(frontendSrc, frontendBuild);

  // update app.js with relevant values
  const appJs = 'app.js';
  const content = fs.readFileSync(path.join(frontendBuild, appJs));
  const {
    AUTH0_CLIENT_ID = '',
    AUTH0_DOMAIN = '',
    ENDPOINT_URL = '',
  } = process.env;
  const replaced = content
    .toString()
    .replace(/AUTH0_CLIENT_ID_VALUE/g, AUTH0_CLIENT_ID)
    .replace(/AUTH0_DOMAIN_VALUE/g, AUTH0_DOMAIN)
    .replace(/ENDPOINT_URL/g, ENDPOINT_URL);

  fs.writeFileSync(path.join(frontendBuild, appJs), replaced);
};

export class SinglePageApp extends cdk.Construct {
  constructor(parent: cdk.Construct, name: string) {
    super(parent, name);

    buildApp();

    const indexPage = 'index.html';
    const websiteBucket = new s3.Bucket(this, 'SinglePageAppBucket', {
      publicReadAccess: true,
      websiteErrorDocument: indexPage,
      websiteIndexDocument: indexPage,
    });
    
    websiteBucket.grantPublicAccess();
    
    new s3Deploy.BucketDeployment(this, 'DeploySinglePageApp', {
      destinationBucket: websiteBucket,
      sources: [s3Deploy.Source.asset(frontendBuild)]
    });

    const distribution = new cloudfront.CloudFrontWebDistribution(
      this,
      'SinglePageAppDistribution',
      {
        defaultRootObject: indexPage,
        errorConfigurations: [
          {
            errorCode: 404,
            responseCode: 200,
            responsePagePath: '/' + indexPage,
          },
        ],
        originConfigs: [
          {
            behaviors: [
              {
                allowedMethods: cloudfront.CloudFrontAllowedMethods.ALL,
                forwardedValues: {
                  cookies: { forward: 'none' },
                  queryString: false,
                },
                isDefaultBehavior: true,
              },
            ],
            s3OriginSource: { s3BucketSource: websiteBucket }
          },
        ],
        priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    );

    new cdk.CfnOutput(this, 'DomainName', {
      value: distribution.domainName,
    });
  }
}
