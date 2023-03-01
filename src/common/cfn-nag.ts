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

import { Aspects, CfnResource, IAspect, Stack } from 'aws-cdk-lib';
import { ISecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { IConstruct } from 'constructs';

/**
 * cfn-nag suppression rule interface
 */
interface CfnNagSuppressRule {
  readonly id: string;
  readonly reason: string;
}

export function addCfnNagSuppressRules(
  resource: CfnResource,
  rules: CfnNagSuppressRule[],
) {
  resource.addMetadata('cfn_nag', {
    rules_to_suppress: rules,
  });
}

export interface CfnNagMetadata {
  readonly rules_to_suppress: CfnNagSuppressRule[];
}

export interface AddCfnNagItem {
  readonly paths_endswith: string[];
  readonly rules_to_suppress: CfnNagSuppressRule[];
}

export function addCfnNagToStack(stack: Stack, cfnNagList: AddCfnNagItem[]) {
  Aspects.of(stack).add(new AddCfnNagForCdkPath(cfnNagList));
}

export function addCfnNagForCustomResource(stack: Stack, extraCfnNagList: AddCfnNagItem[] = []) {
  const cfnNagListForCustomResource : AddCfnNagItem[]= [
    {
      paths_endswith: [
        'CustomResource.*/DefaultPolicy/Resource',
      ],
      rules_to_suppress: [
        {
          id: 'W12',
          reason: 'Policy is generated by CDK, * resource for read only access',
        },
      ],
    },

    {
      paths_endswith: [
        '/framework-onEvent/Resource',
      ],
      rules_to_suppress: [
        {
          id: 'W89',
          reason:
            'Lambda functions only for deployment/cloudformation custom resources, no need to be deployed in VPC',
        },

        {
          id: 'W92',
          reason:
            'Lambda functions only for deployment/cloudformation custom resources, no need to set ReservedConcurrentExecutions',
        },
      ],
    },
    ... extraCfnNagList,
  ];
  addCfnNagToStack(stack, cfnNagListForCustomResource);
}

export function lambdaInVpcRolePolicyRulesToSuppress() {
  // rules_to_suppress
  return [
    {
      id: 'W12',
      reason:
      'Lambda is deployed in VPC, the resource for network permission is *',
    },
  ];
}

export function addCfnNagFoLogRetention(stack: Stack, extraCfnNagList: AddCfnNagItem[] = []) {
  const cfnNagListForLogRetention : AddCfnNagItem[]= [
    {
      paths_endswith: [
        'LogRetention[a-f0-9]+/ServiceRole/DefaultPolicy/Resource',
      ],
      rules_to_suppress: [
        {
          id: 'W12',
          reason: 'Policy is generated by CDK, * resource for read only access',
        },
      ],
    },
    {
      paths_endswith: [
        'LogRetention[a-f0-9]+/Resource',
      ],
      rules_to_suppress: [
        {
          id: 'W89',
          reason:
            'Lambda functions only for deployment/cloudformation custom resources, no need to be deployed in VPC',
        },

        {
          id: 'W92',
          reason:
            'Lambda functions only for deployment/cloudformation custom resources, no need to set ReservedConcurrentExecutions',
        },
      ],
    },
    ... extraCfnNagList,
  ];
  addCfnNagToStack(stack, cfnNagListForLogRetention);
}


class AddCfnNagForCdkPath implements IAspect {
  cfnNagList: AddCfnNagItem[];
  constructor(cfnNagList: AddCfnNagItem[]) {
    this.cfnNagList = cfnNagList;
  }
  visit(node: IConstruct): void {
    if (node instanceof CfnResource) {
      for (const nagConfig of this.cfnNagList) {
        for (const path of nagConfig.paths_endswith) {
          if (
            node.node.path.endsWith(path) ||
            node.node.path.match(new RegExp(path + '$'))
          ) {
            (node as CfnResource).addMetadata('cfn_nag', {
              rules_to_suppress: nagConfig.rules_to_suppress,
            });
          }
        }
      }
    }
  }
}


export function addCfnNagToSecurityGroup(securityGroup: ISecurityGroup, wIds: string[] = ['W40', 'W5']) {

  const wIdsAllForSecurityGroup = [
    {
      id: 'W29',
      reason: 'Disallow all egress traffic',
    },
    {
      id: 'W27',
      reason: 'Allow all traffic from application load balancer',
    },

    {
      id: 'W40',
      reason: 'Design intent: Security Groups egress with an IpProtocol of -1',
    },
    {
      id: 'W5',
      reason: 'Design intent: Security Groups found with cidr open to world on egress',
    },

  ];
  addCfnNagSuppressRules(securityGroup.node.defaultChild as CfnResource, wIdsAllForSecurityGroup.filter(it => wIds.includes(it.id)));
}