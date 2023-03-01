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

import { logger } from '../common/powertools';
import { ApiFail, ApiSuccess } from '../common/request-valid';
import { Project } from '../model/project';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

export class ProjectServ {
  public async list(req: any, res: any, next: any) {
    try {
      const { pageNumber, pageSize } = req.query;
      const result = await store.listProjects(true, pageSize, pageNumber);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  };

  public async create(req: any, res: any, next: any) {
    try {
      let project: Project = req.body;
      const id = await store.createProject(project);
      return res.status(201).send(new ApiSuccess({ id }, 'Project created.'));
    } catch (error) {
      next(error);
    }
  };

  public async details(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      const result = await store.getProject(id);
      if (!result) {
        logger.warn(`No Project with ID ${id} found in the databases while trying to retrieve a Project`);
        return res.status(404).send(new ApiFail('Project not found'));
      }
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  };

  public async update(req: any, res: any, next: any) {
    try {
      const project: Project = req.body as Project;
      await store.updateProject(project);
      return res.status(201).send(new ApiSuccess(null, 'Project updated.'));
    } catch (error) {
      next(error);
    }
  };

  public async delete(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      await store.deleteProject(id);
      return res.json(new ApiSuccess(null, 'Project deleted.'));
    } catch (error) {
      next(error);
    }
  };

  public async verification(req: any, res: any, next: any) {
    try {
      const { tablename } = req.params;
      const result = await store.listProjects(false, 1, 1);
      let exist: boolean = false;
      for (let index in result.items) {
        if (result.items[index].tableName && result.items[index].tableName === tablename) {
          exist = true;
          break;
        }
      }
      return res.json(new ApiSuccess({ exist }));
    } catch (error) {
      next(error);
    }
  };

}