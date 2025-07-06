import { GitHubContributorEntity } from '../entity/Contributor.js';
import { DataSource, InsertResult } from 'typeorm';
import { Repository } from 'typeorm/repository/Repository.js';

export class GitHubContributorService {
  #repo: Repository<GitHubContributorEntity>;

  constructor(dataSource: DataSource) {
    this.#repo = dataSource.getRepository(GitHubContributorEntity);
  }

  async insertBatch(
    data: Partial<GitHubContributorEntity>[]
  ): Promise<InsertResult | null> {
    if (!data.length) return null;
    return this.#repo.insert(data);
  }

  async getById(id: string): Promise<GitHubContributorEntity | null> {
    return this.#repo.findOneBy({ id });
  }

  async getAll(): Promise<GitHubContributorEntity[]> {
    return this.#repo.find();
  }
}
