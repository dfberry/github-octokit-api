import { AppDataSource } from './data-source.js';
import { In } from 'typeorm';
import { Repository } from './Repository.js';
import { Contributor } from './Contributor.js';
import { DependabotAlert } from './DependabotAlert.js';
import { ContributorIssuePr } from './ContributorIssuePr.js';
import { Workflow } from './Workflow.js';
import logger from '../logger.js';

// Ensure all batch insert methods are present and correct for all tables
// - Contributor: insertContributorBatch
// - Repository: insertRepositoryBatch
// - Workflow: insertWorkflowBatch
// - DependabotAlert: insertDependabotAlertBatch
// - ContributorIssuePr: insertContributorIssuePrBatch

export class DbService {
  static Contributor = class {
    static async insertBatch(
      data: Partial<Contributor>[]
    ): Promise<Contributor[]> {
      await DbService.init();
      if (!data.length) return [];
      const repo = AppDataSource.getRepository(Contributor);
      const filtered = data.filter(
        (d): d is Partial<Contributor> & { id: string } =>
          typeof d.id === 'string'
      );
      const existing = await repo.findBy({ id: In(filtered.map(d => d.id)) });
      const existingIds = new Set(existing.map(e => e.id));
      const toInsert = filtered.filter(d => !existingIds.has(d.id));
      if (!toInsert.length) return [];
      const records = repo.create(toInsert);
      await repo.save(records);
      return records;
    }
    static async upsertBatch(
      data: Partial<Contributor>[]
    ): Promise<Contributor[]> {
      await DbService.init();
      if (!data.length) return [];
      const repo = AppDataSource.getRepository(Contributor);
      const filtered = data.filter(
        (d): d is Partial<Contributor> & { id: string } =>
          typeof d.id === 'string'
      );
      const upserted: Contributor[] = [];
      for (const d of filtered) {
        let record = await repo.findOneBy({ id: d.id });
        if (record) {
          await repo.update({ id: d.id }, d);
          record = await repo.findOneBy({ id: d.id });
        } else {
          record = repo.create(d);
          await repo.save(record);
        }
        if (record) upserted.push(record);
      }
      return upserted;
    }
    static async getById(id: string): Promise<Contributor | null> {
      await DbService.init();
      return AppDataSource.getRepository(Contributor).findOneBy({ id });
    }
    static async getAll(): Promise<Contributor[]> {
      await DbService.init();
      return AppDataSource.getRepository(Contributor).find();
    }
  };

  static Repository = class {
    static async insertBatch(
      data: Partial<Repository>[]
    ): Promise<Repository[]> {
      await DbService.init();
      if (!data.length) return [];
      const repo = AppDataSource.getRepository(Repository);
      const filtered = data.filter(
        (d): d is Partial<Repository> & { id: string } =>
          typeof d.id === 'string'
      );
      const existing = await repo.findBy({ id: In(filtered.map(d => d.id)) });
      const existingIds = new Set(existing.map(e => e.id));
      const toInsert = filtered.filter(d => !existingIds.has(d.id));
      if (!toInsert.length) return [];
      const records = repo.create(toInsert);
      await repo.save(records);
      return records;
    }
    static async upsertBatch(
      data: Partial<Repository>[]
    ): Promise<Repository[]> {
      await DbService.init();
      if (!data.length) return [];
      const repo = AppDataSource.getRepository(Repository);
      const filtered = data.filter(
        (d): d is Partial<Repository> & { id: string } =>
          typeof d.id === 'string'
      );
      const upserted: Repository[] = [];
      for (const d of filtered) {
        let record = await repo.findOneBy({ id: d.id });
        if (record) {
          await repo.update({ id: d.id }, d);
          record = await repo.findOneBy({ id: d.id });
        } else {
          record = repo.create(d);
          await repo.save(record);
        }
        if (record) upserted.push(record);
      }
      return upserted;
    }
    static async getById(id: string): Promise<Repository | null> {
      await DbService.init();
      return AppDataSource.getRepository(Repository).findOneBy({ id });
    }
    static async getAll(): Promise<Repository[]> {
      await DbService.init();
      return AppDataSource.getRepository(Repository).find();
    }
  };

  static Workflow = class {
    static async insertBatch(data: Partial<Workflow>[]): Promise<Workflow[]> {
      await DbService.init();
      if (!data.length) return [];
      const repo = AppDataSource.getRepository(Workflow);
      const filtered = data.filter(
        (d): d is Partial<Workflow> & { id: number } => typeof d.id === 'number'
      );
      const existing = await repo.findBy({ id: In(filtered.map(d => d.id)) });
      const existingIds = new Set(existing.map(e => e.id));
      const toInsert = filtered.filter(d => !existingIds.has(d.id));
      if (!toInsert.length) return [];
      const records = repo.create(toInsert);
      await repo.save(records);
      return records;
    }
    static async upsertBatch(data: Partial<Workflow>[]): Promise<Workflow[]> {
      await DbService.init();
      if (!data.length) return [];
      const repo = AppDataSource.getRepository(Workflow);
      const filtered = data.filter(
        (d): d is Partial<Workflow> & { id: number } => typeof d.id === 'number'
      );
      const upserted: Workflow[] = [];
      for (const d of filtered) {
        let record = await repo.findOneBy({ id: d.id });
        if (record) {
          await repo.update({ id: d.id }, d);
          record = await repo.findOneBy({ id: d.id });
        } else {
          record = repo.create(d);
          await repo.save(record);
        }
        if (record) upserted.push(record);
      }
      return upserted;
    }
    static async getById(id: number): Promise<Workflow | null> {
      await DbService.init();
      return AppDataSource.getRepository(Workflow).findOneBy({ id });
    }
    static async getAll(): Promise<Workflow[]> {
      await DbService.init();
      return AppDataSource.getRepository(Workflow).find();
    }
  };

  static DependabotAlert = class {
    static async insertBatch(
      data: Partial<DependabotAlert>[]
    ): Promise<DependabotAlert[]> {
      await DbService.init();
      if (!data.length) return [];
      const repo = AppDataSource.getRepository(DependabotAlert);
      const filtered = data.filter(
        (d): d is Partial<DependabotAlert> & { id: number } =>
          typeof d.id === 'number'
      );
      const existing = await repo.findBy({ id: In(filtered.map(d => d.id)) });
      const existingIds = new Set(existing.map(e => e.id));
      const toInsert = filtered.filter(d => !existingIds.has(d.id));
      if (!toInsert.length) return [];
      const records = repo.create(toInsert);
      await repo.save(records);
      return records;
    }
    static async upsertBatch(
      data: Partial<DependabotAlert>[]
    ): Promise<DependabotAlert[]> {
      await DbService.init();
      if (!data.length) return [];
      const repo = AppDataSource.getRepository(DependabotAlert);
      const filtered = data.filter(
        (d): d is Partial<DependabotAlert> & { id: number } =>
          typeof d.id === 'number'
      );
      const upserted: DependabotAlert[] = [];
      for (const d of filtered) {
        let record = await repo.findOneBy({ id: d.id });
        if (record) {
          await repo.update({ id: d.id }, d);
          record = await repo.findOneBy({ id: d.id });
        } else {
          record = repo.create(d);
          await repo.save(record);
        }
        if (record) upserted.push(record);
      }
      return upserted;
    }
    static async getById(id: number): Promise<DependabotAlert | null> {
      await DbService.init();
      return AppDataSource.getRepository(DependabotAlert).findOneBy({ id });
    }
    static async getAll(): Promise<DependabotAlert[]> {
      await DbService.init();
      return AppDataSource.getRepository(DependabotAlert).find();
    }
  };

  static ContributorIssuePr = class {
    static async insertBatch(
      data: Partial<ContributorIssuePr>[]
    ): Promise<ContributorIssuePr[]> {
      await DbService.init();
      if (!data.length) return [];
      const repo = AppDataSource.getRepository(ContributorIssuePr);
      const filtered = data.filter(
        (
          d
        ): d is Partial<ContributorIssuePr> & {
          username: string;
          type: string;
          id: string;
        } =>
          typeof d.username === 'string' &&
          typeof d.type === 'string' &&
          typeof d.id === 'string'
      );
      // Find existing by composite PK
      const existing = await repo.findBy({
        username: In(filtered.map(d => d.username)),
        type: In(filtered.map(d => d.type)),
        id: In(filtered.map(d => d.id)),
      });
      const existingSet = new Set(
        existing.map(e => `${e.username}|${e.type}|${e.id}`)
      );
      const toInsert = filtered.filter(
        d => !existingSet.has(`${d.username}|${d.type}|${d.id}`)
      );
      if (!toInsert.length) return [];
      const records = repo.create(toInsert);
      await repo.save(records);
      return records;
    }
    static async upsertBatch(
      data: Partial<ContributorIssuePr>[]
    ): Promise<ContributorIssuePr[]> {
      await DbService.init();
      if (!data.length) return [];
      const repo = AppDataSource.getRepository(ContributorIssuePr);
      const filtered = data.filter(
        (
          d
        ): d is Partial<ContributorIssuePr> & {
          username: string;
          type: string;
          id: string;
        } =>
          typeof d.username === 'string' &&
          typeof d.type === 'string' &&
          typeof d.id === 'string'
      );
      const upserted: ContributorIssuePr[] = [];
      for (const d of filtered) {
        let record = await repo.findOneBy({
          username: d.username,
          type: d.type,
          id: d.id,
        });
        if (record) {
          await repo.update(
            { username: d.username, type: d.type, id: d.id },
            d
          );
          record = await repo.findOneBy({
            username: d.username,
            type: d.type,
            id: d.id,
          });
        } else {
          record = repo.create(d);
          await repo.save(record);
        }
        if (record) upserted.push(record);
      }
      return upserted;
    }
    static async getById(
      username: string,
      type: string,
      id: string
    ): Promise<ContributorIssuePr | null> {
      await DbService.init();
      return AppDataSource.getRepository(ContributorIssuePr).findOneBy({
        username,
        type,
        id,
      });
    }
    static async getAll(): Promise<ContributorIssuePr[]> {
      await DbService.init();
      return AppDataSource.getRepository(ContributorIssuePr).find();
    }
  };

  // ...existing methods for single inserts, queries, etc...
  static async init() {
    if (!AppDataSource.isInitialized) {
      logger.info('[TypeORM] Initializing data source...');
      await AppDataSource.initialize();
      logger.info('[TypeORM] Data source initialized.');
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
    logger.info('[TypeORM] Fetching repository by id: %s', id);
    return AppDataSource.getRepository(Repository).findOneBy({ id });
  }
  static async getRepositoryByOrgAndRepo(
    org: string,
    repo: string
  ): Promise<Repository | null> {
    await this.init();
    logger.info('[TypeORM] Fetching repository by org/repo: %s/%s', org, repo);
    return AppDataSource.getRepository(Repository).findOneBy({
      nameWithOwner: `${org}/${repo}`,
    });
  }
  static async getAllRepositories(): Promise<Repository[]> {
    await this.init();
    logger.info('[TypeORM] Fetching all repositories');
    return AppDataSource.getRepository(Repository).find();
  }
  static async updateRepositoryDependabotStatus(
    org: string,
    repo: string,
    status: string
  ): Promise<void> {
    await this.init();
    const nameWithOwner = `${org}/${repo}`;
    logger.info(
      '[TypeORM] Updating dependabot_alerts_status for repo: %s, status: %s',
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
    logger.info('[TypeORM] Fetching contributor by id: %s', id);
    return AppDataSource.getRepository(Contributor).findOneBy({ id });
  }
  static async getAllContributors(): Promise<Contributor[]> {
    await this.init();
    logger.info('[TypeORM] Fetching all contributors');
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
    if (!data.length) return [];
    const repo = AppDataSource.getRepository(ContributorIssuePr);
    // Only insert records that do not already exist
    const filteredWithId = data.filter(
      (
        d
      ): d is Partial<ContributorIssuePr> & {
        username: string;
        type: string;
        id: string;
      } =>
        typeof d.username === 'string' &&
        typeof d.type === 'string' &&
        typeof d.id === 'string'
    );
    // Find existing by composite PK
    const existing = await repo.findBy({
      username: In(filteredWithId.map(d => d.username)),
      type: In(filteredWithId.map(d => d.type)),
      id: In(filteredWithId.map(d => d.id)),
    });
    const existingSet = new Set(
      existing.map(e => `${e.username}|${e.type}|${e.id}`)
    );
    const toInsert = filteredWithId.filter(
      d => !existingSet.has(`${d.username}|${d.type}|${d.id}`)
    );
    if (!toInsert.length) return [];
    const records = repo.create(toInsert);
    await repo.save(records);
    return records;
  }
  static async getContributorIssuePrById(
    username: string,
    type: string,
    id: string
  ): Promise<ContributorIssuePr | null> {
    await this.init();
    logger.info(
      '[TypeORM] Fetching contributor issue/pr by PK: %s, %s, %s',
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
    logger.info('[TypeORM] Fetching all contributor issues/prs');
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
      logger.error('Error in insertWorkflow: %O', error);
      throw error;
    }
  }
  static async getWorkflowById(id: number): Promise<Workflow | null> {
    await this.init();
    logger.info('[TypeORM] Fetching workflow by id: %d', id);
    return AppDataSource.getRepository(Workflow).findOneBy({ id });
  }
  static async getWorkflowByName(name: string): Promise<Workflow | null> {
    await this.init();
    logger.info('[TypeORM] Fetching workflow by name: %s', name);
    return AppDataSource.getRepository(Workflow).findOneBy({ name });
  }
  static async getAllWorkflows(): Promise<Workflow[]> {
    await this.init();
    logger.info('[TypeORM] Fetching all workflows');
    return AppDataSource.getRepository(Workflow).find();
  }

  // Dependabot methods (placeholder, implement as needed)
  static async insertDependabot(
    dependabot: DependabotAlert
  ): Promise<DependabotAlert> {
    await this.init();
    logger.info('[TypeORM] Inserting dependabot alert: %d', dependabot.id);
    const repo = AppDataSource.getRepository(DependabotAlert);
    const record = repo.create(dependabot);
    await repo.save(record);
    return record;
  }

  static async getDependabotById(id: number): Promise<DependabotAlert | null> {
    await this.init();
    logger.info('[TypeORM] Fetching dependabot alert by id: %d', id);
    return AppDataSource.getRepository(DependabotAlert).findOneBy({ id });
  }
  static async getAllDependabots(): Promise<DependabotAlert[]> {
    await this.init();
    logger.info('[TypeORM] Fetching all dependabot alerts');
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
      logger.info('[TypeORM] Dependabot alert inserted: %d', alertData.id);
    } else {
      // Optionally update existing alert
      await alertRepo.update({ id: alertData.id }, alertData);
      alert = await alertRepo.findOneBy({ id: alertData.id });
      logger.info('[TypeORM] Dependabot alert updated: %d', alertData.id);
    }
    return alert;
  }
}
