import { DataSource, InsertResult } from 'typeorm';
import { GitHubContributorIssuePrEntity } from '../entity/ContributorIssuePr.js';
import { Repository } from 'typeorm/repository/Repository.js';

export class GitHubContributorIssuePrService {
  #repo: Repository<GitHubContributorIssuePrEntity>;

  constructor(dataSource: DataSource) {
    this.#repo = dataSource.getRepository(GitHubContributorIssuePrEntity);
  }

  async insertBatch(data): Promise<InsertResult | null> {
    if (!data.length) return null;
    if (!this.#repo) {
      throw new Error('Repository is not provided');
    }
    return this.#repo.insert(data);
  }
  getById(id): Promise<GitHubContributorIssuePrEntity | null> {
    return this.#repo.findOneBy({ id });
  }
  getAll(): Promise<GitHubContributorIssuePrEntity[]> {
    if (!this.#repo) {
      throw new Error('Repository is not provided');
    }
    return this.#repo.find();
  }
  getUniqueOrgsAndRepos(): Promise<{ org: string; repo: string }[]> {
    return this.#repo
      .createQueryBuilder('contributor_issue_prs')
      .select([
        'contributor_issue_prs.org AS org',
        'contributor_issue_prs.repo AS repo',
      ])
      .where('contributor_issue_prs.org IS NOT NULL')
      .andWhere('contributor_issue_prs.repo IS NOT NULL')
      .distinct(true)
      .getRawMany();
  }
}
