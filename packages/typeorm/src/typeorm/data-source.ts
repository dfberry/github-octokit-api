import { DataSource, DataSourceOptions } from 'typeorm';
import { Repository } from './entities/Repository.js';
import { Contributor } from './entities/Contributor.js';
import { ContributorIssuePr } from './entities/ContributorIssuePr.js';
import { Workflow } from './entities/Workflow.js';
import { DependabotAlert } from './entities/DependabotAlert.js';

export interface CreateDataSourceOptions {
  database: string;
  type?: 'sqlite' | 'postgres' | 'mysql' | 'mariadb' | 'mongodb';
  synchronize?: boolean;
  logging?: boolean;
  entities?: any[];
  [key: string]: any;
}

export function createDataSource(options: CreateDataSourceOptions): DataSource {
  const {
    database,
    type = 'sqlite',
    synchronize = true,
    logging = false,
    entities,
    ...rest
  } = options;
  return new DataSource({
    type,
    database,
    synchronize,
    logging,
    entities: entities || [
      Repository,
      Contributor,
      ContributorIssuePr,
      Workflow,
      DependabotAlert,
    ],
    ...rest,
  } as DataSourceOptions);
}
