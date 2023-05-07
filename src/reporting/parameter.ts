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

import { CfnParameter } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  QUICKSIGHT_USER_NAME_PATTERN,
  QUICKSIGHT_NAMESPACE_PATTERN,
  REDSHIFT_DB_NAME_PATTERN,
  REDSHIFT_DB_SCHEMA_NAME_PATTERN,
  DOMAIN_NAME_PATTERN,
} from '../common/constant';

export function createStackParametersQuickSight(scope: Construct, paramGroups?: any[], paramLabels?: any) {

  const groups: any[] = paramGroups ?? [];
  const labels: any = paramLabels ?? {};

  const quickSightUserParam = new CfnParameter(scope, 'QuickSightUserParam', {
    description: 'The QuichSight user name.',
    type: 'String',
    allowedPattern: QUICKSIGHT_USER_NAME_PATTERN,
    constraintDescription: `QuickSight user name must match ${QUICKSIGHT_USER_NAME_PATTERN}`,
  });
  labels[quickSightUserParam.logicalId] = {
    default: 'QuickSight User Name',
  };

  const quickSightNamespaceParam = new CfnParameter(scope, 'QuickSightNamespaceParam', {
    description: 'QuickSight nameapce name.',
    type: 'String',
    default: 'default',
    allowedPattern: QUICKSIGHT_NAMESPACE_PATTERN,
    constraintDescription: `QuickSight namespace must match ${QUICKSIGHT_NAMESPACE_PATTERN}`,
  });
  labels[quickSightNamespaceParam.logicalId] = {
    default: 'QuickSight Nameapce Name',
  };

  const quickSightVpcConnectionParam = new CfnParameter(scope, 'QuickSightVpcConnectionParam', {
    description: 'QuickSight Vpc connection arn.',
    type: 'String',
    default: 'public',
  });
  labels[quickSightVpcConnectionParam.logicalId] = {
    default: 'QuickSight Vpc Connection Arn',
  };

  const quickSightPrincipalParam = new CfnParameter(scope, 'QuickSightPrincipalParam', {
    description: 'Arn of the QuickSight principal, QuickSight resource will be owned by this pricipal.',
    type: 'String',
    default: '',
  });
  labels[quickSightPrincipalParam.logicalId] = {
    default: 'QuickSight Principal Arn',
  };

  const quickSightTemplateArnParam = new CfnParameter(scope, 'QuickSightTemplateArnParam', {
    description: 'Arn of the QuickSight template.',
    type: 'String',
  });
  labels[quickSightTemplateArnParam.logicalId] = {
    default: 'QuickSight Template Arn',
  };

  const redshiftDBParam = new CfnParameter(scope, 'RedshiftDBParam', {
    description: 'Redshift database name.',
    type: 'String',
    allowedPattern: REDSHIFT_DB_NAME_PATTERN,
    constraintDescription: `Redshift database name must match ${REDSHIFT_DB_NAME_PATTERN}`,
  });
  labels[redshiftDBParam.logicalId] = {
    default: 'Redshift Database Name',
  };

  const redShiftDBSchemaParam = new CfnParameter(scope, 'RedShiftDBSchemaParam', {
    description: 'Comma delimited Redshift database schema name list ',
    type: 'CommaDelimitedList',
    allowedPattern: REDSHIFT_DB_SCHEMA_NAME_PATTERN,
    constraintDescription: `Redshift database schema name must match ${REDSHIFT_DB_SCHEMA_NAME_PATTERN}`,
  });
  labels[redShiftDBSchemaParam.logicalId] = {
    default: 'Redshift Database Schema Names',
  };

  const redshiftEndpointParam = new CfnParameter(scope, 'RedshiftEndpointParam', {
    description: 'Redshift endpoint url.',
    type: 'String',
    allowedPattern: `^${DOMAIN_NAME_PATTERN}$`,
    constraintDescription: `Redshift database name must match ${DOMAIN_NAME_PATTERN}`,
  });
  labels[redshiftEndpointParam.logicalId] = {
    default: 'Redshift Endpoint Url',
  };

  const redshiftPortParam = new CfnParameter(scope, 'RedshiftPortParam', {
    description: 'Redshift endpoint port.',
    type: 'Number',

  });
  labels[redshiftPortParam.logicalId] = {
    default: 'Redshift Endpoint Port',
  };

  const redshiftParameterKeyParam = new CfnParameter(scope, 'RedshiftParameterKeyParam', {
    description: 'Parameter key name which stores redshift user and password.',
    type: 'String',
  });
  labels[redshiftParameterKeyParam.logicalId] = {
    default: 'Parameter Key Name',
  };

  groups.push({
    Label: { default: 'QuickSight Information' },
    Parameters: [
      quickSightNamespaceParam.logicalId,
      quickSightUserParam.logicalId,
      quickSightVpcConnectionParam.logicalId,
      quickSightPrincipalParam.logicalId,
      quickSightTemplateArnParam.logicalId,
    ],
  });

  groups.push({
    Label: { default: 'Redshift Information' },
    Parameters: [
      redshiftEndpointParam.logicalId,
      redshiftDBParam.logicalId,
      redShiftDBSchemaParam.logicalId,
      redshiftPortParam.logicalId,
      redshiftParameterKeyParam.logicalId,
    ],
  });

  return {
    quickSightUserParam,
    quickSightNamespaceParam,
    quickSightVpcConnectionParam,
    quickSightPrincipalParam,
    quickSightTemplateArnParam,
    redshiftEndpointParam,
    redshiftDBParam,
    redShiftDBSchemaParam,
    redshiftPortParam,
    redshiftParameterKeyParam,
    paramLabels: labels,
    paramGroups: groups,
  };
}
