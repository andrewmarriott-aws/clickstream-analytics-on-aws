/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import fs from 'fs';
import { IncomingMessage } from 'http';
import https from 'https';
import path from 'path';
import { Logger } from '@aws-lambda-powertools/logger';
import {
  CreateConnectorCommand,
  CreateCustomPluginCommand,
  DeleteConnectorCommand,
  DeleteCustomPluginCommand,
  DescribeConnectorCommand,
  DescribeCustomPluginCommand,
  KafkaConnectClient,
  ListConnectorsCommand,
  ListCustomPluginsCommand,
  NotFoundException,
  UpdateConnectorCommand,
} from '@aws-sdk/client-kafkaconnect';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';

const logger = new Logger({ serviceName: 'ClickstreamAnalyticsOnAWS' });

const region = process.env.AWS_REGION;

const s3Client = new S3Client({ region });
const kafkaConnectClient = new KafkaConnectClient({ region });

let MAX_N = 30;
if (process.env.MAX_N) {
  MAX_N = parseInt(process.env.MAX_N);
}

let SLEEP_SEC = 30;
if (process.env.SLEEP_SEC) {
  SLEEP_SEC = parseInt(process.env.SLEEP_SEC);
}

interface ResourcePropertiesType {
  ServiceToken: string;
  dataS3Bucket: string;
  dataS3Prefix: string;
  pluginS3Bucket: string;
  pluginS3Prefix: string;
  logS3Bucket: string;
  logS3Prefix: string;
  kafkaTopics: string;
  kafkaBrokers: string;
  s3SinkConnectorRole: string;
  securityGroupId: string;
  maxWorkerCount: string;
  minWorkerCount: string;
  workerMcuCount: string;
  subnetIds: string;
  pluginUrl: string;
  kafkaConnectVersion: string;
  flushSize: string;
  rotateIntervalMS: string;
  customConnectorConfiguration: string;
}

type ResourceEvent = CloudFormationCustomResourceEvent;

export const handler = async (event: ResourceEvent, context: Context) => {
  logger.info(JSON.stringify(event));
  const response = {
    PhysicalResourceId: 'create-msk-s3-connector-custom-resource',
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Reason: '',
    Status: 'SUCCESS',
  };

  try {
    await _handler(event, context);
    logger.info('=== complete ===');
    return response;
  } catch (e: any) {
    logger.error(e);
    throw e;
  }
};

async function _handler(event: ResourceEvent, context: Context) {
  let requestType = event.RequestType;
  logger.info('functionName: ' + context.functionName);

  logger.info('RequestType: ' + requestType);
  if (requestType == 'Create') {
    await onCreate(event);
  }

  if (requestType == 'Update') {
    await onUpdate(event);
  }

  if (requestType == 'Delete') {
    await onDelete(event);
  }
}

function getResourceName(event: ResourceEvent) {
  //event.StackId="arn:aws:cloudformation:us-east-1:012345678912:stack/test/54bce910-a6c8-11ed-8ff3-1212426f2299";
  const props = event.ResourceProperties as ResourcePropertiesType;
  const stackShortId = event.StackId.split('/')[2].split('-')[4];
  const stackName = event.StackId.split('/')[1];
  const uid = `${stackName}-${stackShortId}`;
  const logicalResourceId = event.LogicalResourceId;
  const resourceSuffix = `${logicalResourceId}${stackShortId}`;
  const connectorName = `${stackName}-Connector-${resourceSuffix}`;
  const pluginName = `${stackName}-Plugin-${resourceSuffix}`;
  const awsPartition = event.StackId.split(':')[1];
  const pluginUrl = props.pluginUrl;
  const fileName = path.basename(pluginUrl);
  const fileS3Key = `${props.pluginS3Prefix}/${uid}-${fileName}`;

  return {
    connectorName,
    pluginName,
    uid,
    awsPartition,
    fileS3Key,
    fileName,
  };
}

async function onCreate(event: ResourceEvent) {
  logger.info('onCreate()');
  const { bucket: pluginBucket, key: pluginKey } =
    await downloadPluginZipFileToS3(event);

  // create plugin
  const customPluginArn = await createCustomPlugin(
    event,
    pluginBucket,
    pluginKey,
  );

  // createConnector
  if (customPluginArn) {
    await createConnector(event, customPluginArn);
  }
}

async function createCustomPlugin(
  event: ResourceEvent,
  pluginBucket: string,
  pluginKey: string,
) {
  logger.info('createCustomPlugin()');
  const { pluginName, awsPartition } = getResourceName(event);
  const pluginBucketArn = `arn:${awsPartition}:s3:::${pluginBucket}`;
  let res = await kafkaConnectClient.send(
    new CreateCustomPluginCommand({
      contentType: 'ZIP',
      description: `s3://${pluginBucket}/${pluginKey}`,
      location: {
        s3Location: {
          bucketArn: pluginBucketArn,
          fileKey: pluginKey,
        },
      },
      name: pluginName,
    }),
  );

  const customPluginArn = res.customPluginArn;
  let n = 0;
  while (n < MAX_N) {
    n++;
    await sleep(5);
    res = await kafkaConnectClient.send(
      new DescribeCustomPluginCommand({
        customPluginArn,
      }),
    );
    const customPluginState = res.customPluginState;
    logger.info(`${n} customPluginState: ${customPluginState}`);
    if (customPluginState == 'ACTIVE') {
      break;
    } else if (customPluginState == 'CREATE_FAILED') {
      throw new Error(`${customPluginArn} CREATE_FAILED`);
    }
  }
  logger.info('customPluginArn: ' + customPluginArn);
  return customPluginArn;
}

async function createConnector(event: ResourceEvent, customPluginArn: string) {
  logger.info('createConnector()');
  const props = event.ResourceProperties as ResourcePropertiesType;
  const { connectorName } = getResourceName(event);
  const connectorConfiguration: Record<string, string> =
    getConnectorConfiguration(
      event.ResourceProperties as ResourcePropertiesType,
    );

  const command = new CreateConnectorCommand({
    connectorName: connectorName,
    connectorDescription: `Created by stackId: ${event.StackId}, logicalResourceId: ${event.LogicalResourceId}`,
    plugins: [
      {
        customPlugin: {
          customPluginArn: customPluginArn,
          revision: 1,
        },
      },
    ],
    capacity: {
      autoScaling: {
        maxWorkerCount: parseInt(props.maxWorkerCount),
        mcuCount: parseInt(props.workerMcuCount),
        minWorkerCount: parseInt(props.minWorkerCount),
        scaleInPolicy: {
          cpuUtilizationPercentage: 20,
        },
        scaleOutPolicy: {
          cpuUtilizationPercentage: 80,
        },
      },
    },
    connectorConfiguration: connectorConfiguration,
    kafkaCluster: {
      apacheKafkaCluster: {
        bootstrapServers: props.kafkaBrokers,
        vpc: {
          securityGroups: [props.securityGroupId],
          subnets: props.subnetIds.split(','),
        },
      },
    },
    kafkaClusterClientAuthentication: {
      authenticationType: 'NONE',
    },
    kafkaClusterEncryptionInTransit: {
      encryptionType: 'PLAINTEXT',
    },
    kafkaConnectVersion: props.kafkaConnectVersion,
    logDelivery: {
      workerLogDelivery: {
        s3: {
          bucket: props.logS3Bucket,
          enabled: true,
          prefix: props.logS3Prefix,
        },
      },
    },
    serviceExecutionRoleArn: props.s3SinkConnectorRole,
  });
  logger.info(JSON.stringify(command));
  let res = await kafkaConnectClient.send(command);
  const connectorArn = res.connectorArn;
  logger.info('connectorArn: ' + connectorArn);
  let n = 0;
  while (n < MAX_N) {
    n++;
    await sleep();
    res = await kafkaConnectClient.send(
      new DescribeConnectorCommand({
        connectorArn,
      }),
    );

    const connectorState = res.connectorState;
    logger.info(`${n} connectorState: ${connectorState}`);
    if (connectorState == 'RUNNING') {
      break;
    } else if (connectorState == 'FAILED') {
      logger.error(`${connectorArn} ${connectorState}`);
      throw new Error(`${connectorArn} ${connectorState}`);
    }
  }
}

function getConnectorConfiguration(
  props: ResourcePropertiesType,
): Record<string, string> {
  // https://docs.confluent.io/kafka-connectors/s3-sink/current/configuration_options.html#connector
  let configuration: Record<string, string> = {
    'tasks.max': '2',
    'connector.class': 'io.confluent.connect.s3.S3SinkConnector',
    'topics': `${props.kafkaTopics}`,
    's3.region': `${region}`,
    's3.bucket.name': `${props.dataS3Bucket}`,
    'topics.dir': `${props.dataS3Prefix}`,
    'flush.size': `${props.flushSize}`,
    'rotate.interval.ms': `${props.rotateIntervalMS}`,
    's3.compression.type': 'gzip',
    'storage.class': 'io.confluent.connect.s3.storage.S3Storage',
    'format.class': 'io.confluent.connect.s3.format.json.JsonFormat',
    'partitioner.class':
      'io.confluent.connect.storage.partitioner.TimeBasedPartitioner',
    'path.format': "'year'=YYYY/'month'=MM/'day'=dd/'hour'=HH",
    'partition.duration.ms': '60000',
    'timezone': 'UTC',
    'locale': 'en-US',
    'schema.compatibility': 'NONE',
  };

  if (props.customConnectorConfiguration) {
    configuration = {
      ...configuration,
      ...JSON.parse(props.customConnectorConfiguration),
    };
  }

  logger.info('configuration:' + JSON.stringify(configuration));

  return configuration;
}

async function onUpdate(event: CloudFormationCustomResourceEvent) {
  logger.info('onUpdate()');
  const properties = event.ResourceProperties;
  logger.info(JSON.stringify(properties));
  try {
    await updateConnector(event);
  } catch (e: any) {
    if (
      (e.message as string)
        .toLowerCase()
        .indexOf(
          'the specified parameter value is identical to the current value for the connector',
        ) > -1
    ) {
      logger.info(e.message);
    } else {
      logger.error(e);
      throw e;
    }
  }
}

async function updateConnector(event: ResourceEvent) {
  logger.info('updateConnector()');
  const { connectorName } = getResourceName(event);
  logger.info('connectorName: ' + connectorName);
  const props = event.ResourceProperties as ResourcePropertiesType;

  const listRes = await kafkaConnectClient.send(
    new ListConnectorsCommand({
      connectorNamePrefix: connectorName,
      maxResults: 1,
    }),
  );
  if (listRes.connectors?.length == 1) {
    const connectorArn = listRes.connectors[0].connectorArn;
    logger.info('connectorArn: ' + connectorArn);
    const currentVersion = listRes.connectors[0].currentVersion;
    const command = new UpdateConnectorCommand({
      capacity: {
        autoScaling: {
          maxWorkerCount: parseInt(props.maxWorkerCount),
          mcuCount: parseInt(props.workerMcuCount),
          minWorkerCount: parseInt(props.minWorkerCount),
          scaleInPolicy: {
            cpuUtilizationPercentage: 20,
          },
          scaleOutPolicy: {
            cpuUtilizationPercentage: 80,
          },
        },
      },
      connectorArn,
      currentVersion,
    });

    await kafkaConnectClient.send(command);

    let n = 0;
    while (n < MAX_N) {
      n++;
      await sleep();
      const res = await kafkaConnectClient.send(
        new DescribeConnectorCommand({
          connectorArn,
        }),
      );
      logger.info(`${n} connectorState: ${res.connectorState}`);
      if (res.connectorState !== 'UPDATING') {
        break;
      }
    }
  }
}

async function onDelete(event: ResourceEvent) {
  logger.info('onDelete()');
  const properties = event.ResourceProperties;
  logger.info(JSON.stringify(properties));

  await deleteConnector(event);
  await deletePlugin(event);
  await deletePluginFileFromS3(event);
}

async function deletePlugin(event: ResourceEvent) {
  logger.info('deletePlugin()');
  const { pluginName } = getResourceName(event);
  logger.info('pluginName: ' + pluginName);
  const listRes = await kafkaConnectClient.send(
    new ListCustomPluginsCommand({
      maxResults: 100,
    }),
  );
  const plugins = listRes.customPlugins?.filter((p) => p.name == pluginName);
  if (plugins?.length == 1) {
    const customPluginArn = plugins[0].customPluginArn;
    await kafkaConnectClient.send(
      new DeleteCustomPluginCommand({
        customPluginArn,
      }),
    );
    let n = 0;
    while (n < MAX_N) {
      n++;
      await sleep();
      try {
        const res = await kafkaConnectClient.send(
          new DescribeCustomPluginCommand({
            customPluginArn,
          }),
        );
        logger.info(`${n} customPluginState: ${res.customPluginState}`);
      } catch (e: any) {
        if (e.name == 'NotFoundException' || e instanceof NotFoundException) {
          logger.info('deleted ' + customPluginArn);
          break;
        } else {
          logger.error(e);
          throw e;
        }
      }
    }
  }
}

async function deleteConnector(event: ResourceEvent) {
  logger.info('deleteConnector()');
  const { connectorName } = getResourceName(event);
  logger.info('connectorName: ' + connectorName);

  const listRes = await kafkaConnectClient.send(
    new ListConnectorsCommand({
      connectorNamePrefix: connectorName,
      maxResults: 1,
    }),
  );
  if (listRes.connectors?.length == 1) {
    const connectorArn = listRes.connectors[0].connectorArn;
    logger.info('connectorArn: ' + connectorArn);
    await kafkaConnectClient.send(
      new DeleteConnectorCommand({
        connectorArn,
      }),
    );
    let n = 0;
    while (n < MAX_N) {
      n++;
      await sleep();
      try {
        const res = await kafkaConnectClient.send(
          new DescribeConnectorCommand({
            connectorArn,
          }),
        );
        logger.info(`${n} connectorState: ${res.connectorState}`);
      } catch (e: any) {
        if (e.name == 'NotFoundException' || e instanceof NotFoundException) {
          logger.info('deleted ' + connectorName);
          break;
        } else {
          logger.error(e);
          throw e;
        }
      }
    }
  }
}

async function downloadPluginZipFileToS3(event: ResourceEvent) {
  const props = event.ResourceProperties as ResourcePropertiesType;
  const { pluginS3Bucket, pluginUrl } = props;
  const { fileName, fileS3Key } = getResourceName(event);

  const filePath = path.join('/tmp', fileName);
  logger.info('start download ' + pluginUrl);
  await download(pluginUrl, filePath);
  logger.info('download file to ' + filePath);
  const buffer = fs.readFileSync(filePath);
  await s3Client.send(
    new PutObjectCommand({
      Bucket: pluginS3Bucket,
      Key: fileS3Key,
      Body: buffer,
    }),
  );
  logger.info(`put file to s3://${pluginS3Bucket}/${fileS3Key}`);
  return { bucket: pluginS3Bucket, key: fileS3Key };
}

async function deletePluginFileFromS3(event: ResourceEvent) {
  const props = event.ResourceProperties as ResourcePropertiesType;
  const { pluginS3Bucket } = props;
  const { fileS3Key } = getResourceName(event);
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: pluginS3Bucket,
      Key: fileS3Key,
    }),
  );
  logger.info(`deleted s3://${pluginS3Bucket}/${fileS3Key}`);
}

async function download(url: string, outPath: string) {
  return new Promise<void>((resolve, reject) => {
    https.get(url, (res: IncomingMessage) => {
      const stream = fs.createWriteStream(outPath);
      res.pipe(stream);
      stream.on('finish', () => {
        stream.close();
        logger.info('Download Completed, outPath: ' + outPath);
        resolve();
      });
      stream.on('error', (err) => {
        logger.info('ERROR:' + err);
        reject(err);
      });
    });
  });
}

async function sleep(seconds: number = SLEEP_SEC) {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}