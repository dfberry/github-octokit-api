import { DataSource, InsertResult } from 'typeorm';
import { Repository } from 'typeorm/repository/Repository.js';
import { GitHubDependabotAlertEntity } from '../entity/DependabotAlert.js';

export class GitHubDependabotAlertService {
  #repo: Repository<GitHubDependabotAlertEntity>;

  constructor(dataSource: DataSource) {
    this.#repo = dataSource.getRepository(GitHubDependabotAlertEntity);
  }

  async insertBatch(
    data: Partial<GitHubDependabotAlertEntity>[]
  ): Promise<InsertResult | null> {
    if (!data.length) return null;
    return this.#repo.insert(data);
  }

  async getById(id: number): Promise<GitHubDependabotAlertEntity | null> {
    return this.#repo.findOneBy({ id });
  }

  async getAll(): Promise<GitHubDependabotAlertEntity[]> {
    return this.#repo.find();
  }
}
