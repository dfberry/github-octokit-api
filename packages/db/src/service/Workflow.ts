import { DataSource, InsertResult } from 'typeorm';
import { GitHubWorkflowEntity } from '../entity/Workflow.js';
import { Repository } from 'typeorm/repository/Repository.js';

export class GitHubWorkflowService {
  #repo: Repository<GitHubWorkflowEntity>;

  constructor(dataSource: DataSource) {
    this.#repo = dataSource.getRepository(GitHubWorkflowEntity);
  }

  async insertBatch(
    data: Partial<GitHubWorkflowEntity>[]
  ): Promise<InsertResult | null> {
    if (!data.length) return null;
    return this.#repo.insert(data);
  }

  async getById(id: number): Promise<GitHubWorkflowEntity | null> {
    return this.#repo.findOneBy({ id });
  }

  async getAll(): Promise<GitHubWorkflowEntity[]> {
    return this.#repo.find();
  }
}
