import cloudfront = require('@aws-cdk/aws-cloudfront');
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');
import s3Deploy = require('@aws-cdk/aws-s3-deployment');
import cdk = require('@aws-cdk/cdk');
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
    const statement = new iam.PolicyStatement()
      .addActions('s3:ListBucket')
      .addResource(websiteBucket.bucketArn)
      .addPrincipal(new iam.Anyone());
    websiteBucket.addToResourcePolicy(statement);

    new s3Deploy.BucketDeployment(this, 'DeploySinglePageApp', {
      destinationBucket: websiteBucket,
      source: s3Deploy.Source.asset(frontendBuild),
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
            customOriginSource: {
              domainName: `${websiteBucket.bucketName}.s3.amazonaws.com`,
              httpPort: 80,
              httpsPort: 443,
              originProtocolPolicy: cloudfront.OriginProtocolPolicy.HttpsOnly,
            },
          },
        ],
        priceClass: cloudfront.PriceClass.PriceClassAll,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.RedirectToHTTPS,
      },
    );

    new cdk.Output(this, 'DomainName', {
      value: distribution.domainName,
    })
      .makeImportValue()
      .toString();
  }
}
