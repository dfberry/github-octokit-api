import { DataSource, InsertResult, UpdateResult } from 'typeorm';
import { GitHubRepositoryEntity } from '../entity/Repository.js';
import { Repository } from 'typeorm/repository/Repository.js';

export class GitHubRepositoryService {
  #repo: Repository<GitHubRepositoryEntity>;

  constructor(dataSource: DataSource) {
    this.#repo = dataSource.getRepository(GitHubRepositoryEntity);
  }

  async insertBatch(
    data: Partial<GitHubRepositoryEntity>[]
  ): Promise<InsertResult | null> {
    if (!data.length) return null;
    return this.#repo.insert(data);
  }

  async getById(id: string): Promise<GitHubRepositoryEntity | null> {
    return this.#repo.findOneBy({ id });
  }

  async getByOrgRepo(
    nameWithOwner: string
  ): Promise<GitHubRepositoryEntity | null> {
    return this.#repo.findOneBy({ nameWithOwner });
  }

  async getAll(): Promise<GitHubRepositoryEntity[]> {
    return this.#repo.find();
  }

  async updateRepositoryWorkflowStatus(
    nameWithOwner: string,
    workflow_status: string
  ): Promise<UpdateResult | null> {
    return this.#repo.update({ nameWithOwner }, { workflow_status });
  }
}
