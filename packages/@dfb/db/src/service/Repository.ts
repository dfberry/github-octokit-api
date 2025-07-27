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
    name_with_owner: string
  ): Promise<GitHubRepositoryEntity | null> {
    return this.#repo.findOneBy({ name_with_owner });
  }

  async getAll(): Promise<GitHubRepositoryEntity[]> {
    return this.#repo.find();
  }

  async updateRepositoryWorkflowStatus(
    name_with_owner: string,
    workflow_status: string
  ): Promise<UpdateResult | null> {
    return this.#repo.update({ name_with_owner }, { workflow_status });
  }
}
