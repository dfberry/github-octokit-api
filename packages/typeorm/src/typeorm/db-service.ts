import { DataSource } from 'typeorm';
import { getContributorRepository } from './repositories/Contributor.js';
import { getRepositoryRepository } from './repositories/Repository.js';
import { getWorkflowRepository } from './repositories/Workflow.js';
import { getContributorIssuePrRepository } from './repositories/ContributorIssuePr.js';

export class DbService {
  private static dataSource: DataSource;
  constructor(dataSource: DataSource) {
    DbService.dataSource = dataSource;
  }

  static get Contributor() {
    if (!this.dataSource) throw new Error('Database not initialized');
    return getContributorRepository(this.dataSource);
  }

  static get Repository() {
    if (!this.dataSource) throw new Error('Database not initialized');
    return getRepositoryRepository(this.dataSource);
  }

  static get Workflow() {
    if (!this.dataSource) throw new Error('Database not initialized');
    return getWorkflowRepository(this.dataSource);
  }

  static get ContributorIssuePr() {
    if (!this.dataSource) throw new Error('Database not initialized');
    return getContributorIssuePrRepository(this.dataSource);
  }
}
