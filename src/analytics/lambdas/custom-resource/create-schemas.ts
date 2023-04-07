/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */
import { RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { CdkCustomResourceHandler, CdkCustomResourceEvent, CdkCustomResourceResponse } from 'aws-lambda';
import { logger } from '../../../common/powertools';
import { CreateDatabaseAndSchemas } from '../../private/model';
import { getRedshiftClient, executeStatementWithWait } from '../redshift-data';

type ResourcePropertiesType = CreateDatabaseAndSchemas & {
  readonly ServiceToken: string;
}

export const handler: CdkCustomResourceHandler = async (event) => {
  logger.info(JSON.stringify(event));
  const response: CdkCustomResourceResponse = {
    PhysicalResourceId: 'create-redshift-db-schemas-custom-resource',
    Data: {
      DatabaseName: event.ResourceProperties.databaseName,
    },
    Status: 'SUCCESS',
  };

  try {
    await _handler(event);
  } catch (e) {
    if (e instanceof Error) {
      logger.error('Error when creating database and schema in redshift', e);
    }
    throw e;
  }
  return response;
};

async function _handler(event: CdkCustomResourceEvent) {
  const requestType = event.RequestType;

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

async function onCreate(event: CdkCustomResourceEvent) {
  logger.info('onCreate()');

  const props = event.ResourceProperties as ResourcePropertiesType;
  // 1. create database in Redshift
  // FIXME: if work on redshift cluster
  const client = getRedshiftClient(props.serverlessRedshiftProps?.superUserIAMRoleArn ?? props.userRoleArn);
  const roleName = props.userRoleArn.split('/')[1];
  await createDatabaseInRedshift(client, props.databaseName, `IAMR:${roleName}`, props);

  // 2. create schemas in Redshift for applications
  await createSchemas(props);
}

async function onUpdate(event: CdkCustomResourceEvent) {
  logger.info('onUpdate()');

  const props = event.ResourceProperties as ResourcePropertiesType;
  await createSchemas(props);
}

async function onDelete(_event: CdkCustomResourceEvent) {
  logger.info('onDelete()');
  logger.info('doNothing to keep the database and schema');
}

function splitString(str: string): string[] {
  if (!str.trim()) { // checks if string is blank or only whitespace characters
    return []; // return an empty array
  } else {
    return str.split(','); // split the string by comma
  }
}

async function createSchemas(props: ResourcePropertiesType) {
  const odsTableName = props.odsTableName;

  const appIds = splitString(props.appIds);
  const sqlStatement : string[] = [];
  appIds.forEach(app => {
    sqlStatement.push(`CREATE SCHEMA IF NOT EXISTS ${app}`);
    const createTblStatement = `CREATE TABLE IF NOT EXISTS ${app}.${odsTableName}(`
      + '    app_info SUPER, '
      + '    device SUPER, '
      + '    ecommerce SUPER,'
      + '    event_bundle_sequence_id BIGINT,'
      + '    event_date VARCHAR(255), '
      + '    event_dimensions SUPER,'
      + '    event_id VARCHAR(255)  DEFAULT RANDOM(),'
      + '    event_name VARCHAR(255),'
      + '    event_params SUPER,'
      + '    event_previous_timestamp BIGINT,'
      + '    event_server_timestamp_offset BIGINT,'
      + '    event_timestamp BIGINT,'
      + '    event_value_in_usd VARCHAR(255),'
      + '    geo SUPER, '
      + '    ingest_timestamp BIGINT,'
      + '    items SUPER,'
      + '    platform VARCHAR(255),'
      + '    privacy_info SUPER,'
      + '    stream_id VARCHAR(255),'
      + '    traffic_source SUPER,'
      + '    user_first_touch_timestamp BIGINT,'
      + '    user_id VARCHAR(255),'
      + '    user_ltv SUPER,'
      + '    user_properties SUPER,'
      + '    user_pseudo_id VARCHAR(255)'
      + ') DISTSTYLE AUTO '
      + 'SORTKEY AUTO';
    sqlStatement.push(createTblStatement);
  });

  if (sqlStatement.length == 0) {
    logger.info('Ignore creating schema in Redshift due to there is no application.');
  } else {
    const redShiftClient = getRedshiftClient(props.userRoleArn);
    await createSchemasInRedshift(redShiftClient, sqlStatement.join(';'), props);
  }
}

const createDatabaseInRedshift = async (redshiftClient: RedshiftDataClient, databaseName: string, owner: string,
  props: CreateDatabaseAndSchemas) => {
  try {
    await executeStatementWithWait(redshiftClient, `CREATE USER "${owner}" PASSWORD DISABLE;`,
      props.serverlessRedshiftProps?.defaultDatabaseName ?? databaseName,
      props.serverlessRedshiftProps, props.provisionedRedshiftProps);
    await executeStatementWithWait(redshiftClient, `CREATE DATABASE ${databaseName} WITH OWNER "${owner}";`,
      props.serverlessRedshiftProps?.defaultDatabaseName ?? databaseName,
      props.serverlessRedshiftProps, props.provisionedRedshiftProps);
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when creating schema in serverless Redshift.', err);
    }
    throw err;
  }
};

const createSchemasInRedshift = async (redshiftClient: RedshiftDataClient, sqlStatement: string, props: CreateDatabaseAndSchemas) => {
  try {
    await executeStatementWithWait(redshiftClient, sqlStatement, props.databaseName,
      props.serverlessRedshiftProps, props.provisionedRedshiftProps);
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when creating schema in serverless Redshift.', err);
    }
    throw err;
  }
};