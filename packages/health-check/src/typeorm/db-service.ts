import { AppDataSource } from './data-source.js';
import { In } from 'typeorm';
import { Repository } from './Repository.js';
import { Contributor } from './Contributor.js';
import { DependabotAlert } from './DependabotAlert.js';
import { ContributorIssuePr } from './ContributorIssuePr.js';
import { Workflow } from './Workflow.js';

export class DbService {
  // Batch insert for Contributor
  static async insertContributorBatch(
    data: Partial<Contributor>[]
  ): Promise<Contributor[]> {
    await this.init();
    if (!data.length) return [];
    const repo = AppDataSource.getRepository(Contributor);
    // Filter out contributors with no id (login)
    const filtered = data.filter(d => d.id);
    if (!filtered.length) return [];
    // Only insert contributors that do not already exist
    const filteredWithId = filtered.filter(
      (d): d is Partial<Contributor> & { id: string } =>
        typeof d.id === 'string'
    );
    const existing = await repo.findBy({
      id: In(filteredWithId.map(d => d.id)),
    });
    const existingIds = new Set(existing.map(e => e.id));
    const toInsert = filteredWithId.filter(d => !existingIds.has(d.id));
    if (!toInsert.length) return [];
    const records = repo.create(toInsert);
    await repo.save(records);
    return records;
  }

  // Batch insert for Workflow
  static async insertWorkflowBatch(data: Workflow[]): Promise<Workflow[]> {
    await this.init();
    const repo = AppDataSource.getRepository(Workflow);
    const records = repo.create(data);
    await repo.save(records);
    return records;
  }

  // Batch insert for DependabotAlert
  static async insertDependabotAlertBatch(
    data: Partial<DependabotAlert>[]
  ): Promise<DependabotAlert[]> {
    await this.init();
    const repo = AppDataSource.getRepository(DependabotAlert);
    const records = repo.create(data);
    await repo.save(records);
    return records;
  }

  // ...existing methods for single inserts, queries, etc...
  static async init() {
    if (!AppDataSource.isInitialized) {
      console.log('[TypeORM] Initializing data source...');
      await AppDataSource.initialize();
      console.log('[TypeORM] Data source initialized.');
    }
  }

  // Repository methods
  static async insertRepository(
    repoData: Partial<Repository>
  ): Promise<Repository> {
    await this.init();

    if (!repoData.id) throw new Error('Repository id (org/repo) is required');
    const repoRepo = AppDataSource.getRepository(Repository);
    let repo = await repoRepo.findOneBy({ id: repoData.id });
    if (!repo) {
      repo = repoRepo.create(repoData);
      await repoRepo.save(repo);
    }
    return repo;
  }
  static async getRepositoryById(id: string): Promise<Repository | null> {
    await this.init();
    console.log('[TypeORM] Fetching repository by id:', id);
    return AppDataSource.getRepository(Repository).findOneBy({ id });
  }
  static async getRepositoryByOrgAndRepo(
    org: string,
    repo: string
  ): Promise<Repository | null> {
    await this.init();
    console.log('[TypeORM] Fetching repository by org/repo:', org, repo);
    return AppDataSource.getRepository(Repository).findOneBy({
      nameWithOwner: `${org}/${repo}`,
    });
  }
  static async getAllRepositories(): Promise<Repository[]> {
    await this.init();
    console.log('[TypeORM] Fetching all repositories');
    return AppDataSource.getRepository(Repository).find();
  }
  static async updateRepositoryDependabotStatus(
    org: string,
    repo: string,
    status: string
  ): Promise<void> {
    await this.init();
    const nameWithOwner = `${org}/${repo}`;
    console.log(
      '[TypeORM] Updating dependabot_alerts_status for repo:',
      nameWithOwner,
      status
    );
    const repoRepo = AppDataSource.getRepository(Repository);
    await repoRepo.update(
      { nameWithOwner },
      { dependabot_alerts_status: status }
    );
  }

  static async updateRepositoryWorkflowStatus(
    org: string,
    repo: string,
    status: string
  ): Promise<void> {
    await this.init();
    const nameWithOwner = `${org}/${repo}`;
    const repoRepo = AppDataSource.getRepository(Repository);
    await repoRepo.update(
      { nameWithOwner },
      {
        workflow_status: status,
      }
    );
  }

  // Contributor methods
  // Removed unused single insertContributor method (use batch insert instead)
  static async getContributorById(id: string): Promise<Contributor | null> {
    await this.init();
    console.log('[TypeORM] Fetching contributor by id:', id);
    return AppDataSource.getRepository(Contributor).findOneBy({ id });
  }
  static async getAllContributors(): Promise<Contributor[]> {
    await this.init();
    console.log('[TypeORM] Fetching all contributors');
    return AppDataSource.getRepository(Contributor).find();
  }

  // ContributorIssuePr methods
  static async insertContributorIssuePr(
    data: Partial<ContributorIssuePr>
  ): Promise<ContributorIssuePr> {
    await this.init();
    if (!data.username || !data.type || !data.id) {
      throw new Error(
        'username, type, and id are required for ContributorIssuePr'
      );
    }
    const repo = AppDataSource.getRepository(ContributorIssuePr);
    const record = repo.create(data);
    await repo.save(record);
    return record;
  }

  // Batch insert for ContributorIssuePr
  static async insertContributorIssuePrBatch(
    data: Partial<ContributorIssuePr>[]
  ): Promise<ContributorIssuePr[]> {
    await this.init();
    const repo = AppDataSource.getRepository(ContributorIssuePr);
    const records = repo.create(data);
    await repo.save(records);
    return records;
  }
  static async getContributorIssuePrById(
    username: string,
    type: string,
    id: string
  ): Promise<ContributorIssuePr | null> {
    await this.init();
    console.log(
      '[TypeORM] Fetching contributor issue/pr by PK:',
      username,
      type,
      id
    );
    return AppDataSource.getRepository(ContributorIssuePr).findOneBy({
      username,
      type,
      id,
    });
  }
  static async getAllContributorIssuesPrs(): Promise<ContributorIssuePr[]> {
    await this.init();
    console.log('[TypeORM] Fetching all contributor issues/prs');
    return AppDataSource.getRepository(ContributorIssuePr).find();
  }

  // Workflow methods
  static async insertWorkflow(data: Workflow): Promise<Workflow> {
    try {
      if (!data.id) throw new Error('Workflow id is required');

      await this.init();

      const repo = AppDataSource.getRepository(Workflow);

      const record = repo.create(data);
      await repo.save(record);

      return record;
    } catch (error) {
      console.error('Error in insertWorkflow:', error);
      throw error;
    }
  }
  static async getWorkflowById(id: number): Promise<Workflow | null> {
    await this.init();
    console.log('[TypeORM] Fetching workflow by id:', id);
    return AppDataSource.getRepository(Workflow).findOneBy({ id });
  }
  static async getWorkflowByName(name: string): Promise<Workflow | null> {
    await this.init();
    console.log('[TypeORM] Fetching workflow by name:', name);
    return AppDataSource.getRepository(Workflow).findOneBy({ name });
  }
  static async getAllWorkflows(): Promise<Workflow[]> {
    await this.init();
    console.log('[TypeORM] Fetching all workflows');
    return AppDataSource.getRepository(Workflow).find();
  }

  // Dependabot methods (placeholder, implement as needed)
  static async insertDependabot(
    dependabot: DependabotAlert
  ): Promise<DependabotAlert> {
    await this.init();
    console.log('[TypeORM] Inserting dependabot alert:', dependabot.id);
    const repo = AppDataSource.getRepository(DependabotAlert);
    const record = repo.create(dependabot);
    await repo.save(record);
    return record;
  }

  static async getDependabotById(id: number): Promise<DependabotAlert | null> {
    await this.init();
    console.log('[TypeORM] Fetching dependabot alert by id:', id);
    return AppDataSource.getRepository(DependabotAlert).findOneBy({ id });
  }
  static async getAllDependabots(): Promise<DependabotAlert[]> {
    await this.init();
    console.log('[TypeORM] Fetching all dependabot alerts');
    return AppDataSource.getRepository(DependabotAlert).find();
  }
  static async insertDependabotAlert(
    alertData: Partial<DependabotAlert>
  ): Promise<DependabotAlert | null> {
    await this.init();
    if (!alertData.id) throw new Error('Dependabot alert id is required');
    const alertRepo = AppDataSource.getRepository(DependabotAlert);
    let alert = await alertRepo.findOneBy({ id: alertData.id });
    if (!alert) {
      alert = alertRepo.create(alertData);
      await alertRepo.save(alert);
      console.log('[TypeORM] Dependabot alert inserted:', alertData.id);
    } else {
      // Optionally update existing alert
      await alertRepo.update({ id: alertData.id }, alertData);
      alert = await alertRepo.findOneBy({ id: alertData.id });
      console.log('[TypeORM] Dependabot alert updated:', alertData.id);
    }
    return alert;
  }
}
