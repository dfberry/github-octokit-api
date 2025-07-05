import { Repository as RepoEntity } from '../entities/Repository.js';
import { Repository as TypeOrmRepository, DataSource, In } from 'typeorm';

export class RepositoryRepository extends TypeOrmRepository<RepoEntity> {
  async insertBatch(data: Partial<RepoEntity>[]): Promise<RepoEntity[]> {
    if (!data.length) return [];
    const filtered = data.filter(
      (d): d is Partial<RepoEntity> & { id: string } => typeof d.id === 'string'
    );
    const existing = await this.findBy({ id: In(filtered.map(d => d.id)) });
    const existingIds = new Set(existing.map(e => e.id));
    const toInsert = filtered.filter(d => !existingIds.has(d.id));
    if (!toInsert.length) return [];
    const records = this.create(toInsert);
    await this.save(records);
    return records;
  }

  async upsertBatch(data: Partial<RepoEntity>[]): Promise<RepoEntity[]> {
    if (!data.length) return [];
    const filtered = data.filter(
      (d): d is Partial<RepoEntity> & { id: string } => typeof d.id === 'string'
    );
    await this.upsert(filtered, ['id']);
    return this.findBy({ id: In(filtered.map(d => d.id)) });
  }

  async getById(id: string): Promise<RepoEntity | null> {
    return this.findOneBy({ id });
  }

  async getAll(): Promise<RepoEntity[]> {
    return this.find();
  }

  async updateRepository(
    query: { id: string } | { nameWithOwner: string },
    update: Partial<RepoEntity>
  ): Promise<RepoEntity | null> {
    const repoEntity = await this.findOneBy(query as any);
    if (!repoEntity) return null;
    await this.update(query as any, update);
    // Return the updated entity
    return this.findOneBy(query as any);
  }
}

export function getRepositoryRepository(
  dataSource: DataSource
): RepositoryRepository {
  return dataSource
    .getRepository(RepoEntity)
    .extend(RepositoryRepository.prototype) as RepositoryRepository;
}
