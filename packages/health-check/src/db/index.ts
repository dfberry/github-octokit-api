import {
  GitHubContributorEntity,
  GitHubRepositoryEntity,
  GitHubWorkflowEntity,
  GitHubContributorIssuePrEntity,
} from '@dfb/db';
import {
  GitHubContributorIssuePrService,
  GitHubContributorService,
  GitHubRepositoryService,
  GitHubWorkflowService,
} from '@dfb/db';
import path from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
export type DbManager = {
  databaseServices: {
    contributorService: GitHubContributorService;
    contributorIssuePrService: GitHubContributorIssuePrService;
    repositoryService: GitHubRepositoryService;
    workflowService: GitHubWorkflowService;
  };
  database: DataSource;
};

export class Db {
  #dataSource: DataSource;

  async connect(dataPath: string): Promise<DbManager> {
    const connectionOptions: DataSourceOptions = {
      type: 'sqlite',
      database: path.join(dataPath, 'github.db'),
      synchronize: true,
      entities: [
        GitHubContributorEntity,
        GitHubRepositoryEntity,
        GitHubWorkflowEntity,
        GitHubContributorIssuePrEntity,
      ],
    };

    // TypeOrm initialize DB
    this.#dataSource = new DataSource(connectionOptions);
    await this.#dataSource.initialize();

    // @dfb/db services
    const contributorService = new GitHubContributorService(this.#dataSource);
    const repositoryService = new GitHubRepositoryService(this.#dataSource);
    const workflowService = new GitHubWorkflowService(this.#dataSource);
    const contributorIssuePrService = new GitHubContributorIssuePrService(
      this.#dataSource
    );
    return {
      database: this.#dataSource,
      databaseServices: {
        contributorService,
        repositoryService,
        workflowService,
        contributorIssuePrService,
      },
    };
  }
  //   async disconnect(): Promise<void> {
  //     if (this.#dataSource.isInitialized) {
  //       await this.#dataSource.destroy();
  //     }
  //   }
}
