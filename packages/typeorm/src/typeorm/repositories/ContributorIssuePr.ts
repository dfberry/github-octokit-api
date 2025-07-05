import { ContributorIssuePr } from '../entities/ContributorIssuePr.js';
import { Repository, DataSource, In } from 'typeorm';

export class ContributorIssuePrRepository extends Repository<ContributorIssuePr> {
  async insertBatch(
    data: Partial<ContributorIssuePr>[]
  ): Promise<ContributorIssuePr[]> {
    if (!data.length) return [];
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
    const existing = await this.findBy({
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
    const records = this.create(toInsert);
    await this.save(records);
    return records;
  }

  async upsertBatch(
    data: Partial<ContributorIssuePr>[]
  ): Promise<ContributorIssuePr[]> {
    if (!data.length) return [];
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
    await this.upsert(filtered, ['username', 'type', 'id']);
    return this.findBy({
      username: In(filtered.map(d => d.username)),
      type: In(filtered.map(d => d.type)),
      id: In(filtered.map(d => d.id)),
    });
  }

  async getById(
    username: string,
    type: string,
    id: string
  ): Promise<ContributorIssuePr | null> {
    return this.findOneBy({ username, type, id });
  }

  async getAll(): Promise<ContributorIssuePr[]> {
    return this.find();
  }
}

export function getContributorIssuePrRepository(
  dataSource: DataSource
): ContributorIssuePrRepository {
  return dataSource
    .getRepository(ContributorIssuePr)
    .extend(
      ContributorIssuePrRepository.prototype
    ) as ContributorIssuePrRepository;
}
