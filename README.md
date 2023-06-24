# Clickstream Analytics on AWS

An AWS Solution builds clickstream analytic system on AWS with a click-through experience.
This solution automates the data pipeline creation per configurations,
and provides SDKs for web and mobiles apps to help users to collect and ingest client-side data into the data pipeline on AWS.
The solution allows you to further enrich, model, and distribute the event data for business function teams (e.g., marketing, operation) to consume,
and provides a dozen of built-in visualizations (e.g., acquisition, engagement, retention, user demographic)
and explorative reporting templates (e.g., funnel, use path, user explorer),
powering the use cases such as user behavior analytics, marketing analytics, and product analytics.

## Architecutre of solution

![architecture diagram](./docs/images/architecture/01-architecture-end-to-end.png)

1. Amazon CloudFront distributes the frontend web UI assets hosted in the Amazon S3 bucket, and the backend APIs hosted with Amazon API Gateway and AWS Lambda.
2. The Amazon Cognito user pool or OpenID Connect (OIDC) is used for authentication.
3. The web UI console uses Amazon DynamoDB to store persistent data.
4. AWS Step Functions, AWS CloudFormation, AWS Lambda, and Amazon EventBridge are used for orchestrating the lifecycle management of data pipelines.
5. The data pipeline is provisioned in the region specified by the system operator. It consists of Application Load Balancer (ALB),
Amazon ECS, Amazon Managed Streaming for Kafka (Amazon MSK), Amazon Kinesis Data Streams, Amazon S3, Amazon EMR Serverless, Amazon Redshift, and Amazon QuickSight.

See [the doc][doc-arch] for more detail.

## SDKs

Clickstream Analytics on AWS provides different client-side SDKs, which can make it easier for you to report events to the data pipeline created in the solution. Currently, the solution supports the following platforms:

- [Android][android-sdk]
- [Swift][swift-sdk]

## How to deploy the solution

### Deploy from one-click CloudFormation templates

Follow the [implementation guide][doc-deployment] to deploy the solution with few clicks.

### Deploy from source

#### Prerequisites

- An AWS account
- Configure [credential of aws cli][configure-aws-cli]
- Install node.js LTS version 16.18.0 at least
- Install Docker Engine
- Install the dependencies of solution via executing command `yarn install --check-files && npx projen`
- Initialize the CDK toolkit stack into AWS environment(only for deploying via [AWS CDK][aws-cdk] first time), run `npx cdk bootstrap`

#### Deploy web console

```shell
# deploy the web console of the solution
npx cdk deploy cloudfront-s3-control-plane-stack-global --parameters Email=<your email> --require-approval never
```

## How to test

```shell
yarn test
```

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.

## File Structure

Upon successfully cloning the repository into your local development environment but prior to running the initialization script, you will see the following file structure in your editor:

```
├── CHANGELOG.md                       [Change log file]
├── CODE_OF_CONDUCT.md                 [Code of conduct file]
├── CONTRIBUTING.md                    [Contribution guide]
├── LICENSE                            [LICENSE for this solution]
├── NOTICE.txt                         [Notice for 3rd-party libraries]
├── README.md                          [Read me file]
├── buildspec.yml
├── cdk.json
├── codescan-prebuild-custom.sh
├── deployment                         [shell scripts for packaging distribution assets]
│   ├── build-open-source-dist.sh
│   ├── build-s3-dist-1.sh
│   ├── build-s3-dist.sh
│   ├── cdk-solution-helper
│   ├── post-build-1
│   ├── run-all-test.sh
│   ├── solution_config
│   ├── test
│   ├── test-build-dist.sh
│   └── test-deploy-tag-images.sh
├── docs                               [document]
│   ├── en
│   ├── index.html
│   ├── mkdocs.base.yml
│   ├── mkdocs.en.yml
│   ├── mkdocs.zh.yml
│   ├── site
│   ├── test-deploy-mkdocs.sh
│   └── zh
├── examples                           [example code]
│   ├── custom-plugins
│   └── standalone-data-generator
├── frontend                           [frontend source code]
│   ├── README.md
│   ├── build
│   ├── config
│   ├── esbuild.ts
│   ├── node_modules
│   ├── package.json
│   ├── public
│   ├── scripts
│   ├── src
│   ├── tsconfig.json
│   └── yarn.lock
├── package.json
├── sonar-project.properties
├── src                                [all backend source code]
│   ├── alb-control-plane-stack.ts
│   ├── analytics
│   ├── cloudfront-control-plane-stack.ts
│   ├── common
│   ├── control-plane
│   ├── data-analytics-redshift-stack.ts
│   ├── data-modeling-athena-stack.ts
│   ├── data-pipeline
│   ├── data-pipeline-stack.ts
│   ├── data-reporting-quicksight-stack.ts
│   ├── ingestion-server
│   ├── ingestion-server-stack.ts
│   ├── kafka-s3-connector-stack.ts
│   ├── main.ts
│   ├── metrics
│   ├── metrics-stack.ts
│   └── reporting
├── test                               [test code]
│   ├── analytics
│   ├── common
│   ├── constants.ts
│   ├── control-plane
│   ├── data-pipeline
│   ├── ingestion-server
│   ├── jestEnv.js
│   ├── metrics
│   ├── reporting
│   ├── rules.ts
│   └── utils.ts
├── tsconfig.dev.json
├── tsconfig.json
└── yarn.lock
```

[android-sdk]: https://github.com/awslabs/clickstream-android
[swift-sdk]: https://github.com/awslabs/clickstream-swift
[configure-aws-cli]: https://docs.aws.amazon.com/zh_cn/cli/latest/userguide/cli-chap-configure.html
[aws-cdk]: https://aws.amazon.com/cdk/
[doc-arch]: ./docs/en/architecture.md
[doc-deployment]: ./docs/en/deployment/index.md
