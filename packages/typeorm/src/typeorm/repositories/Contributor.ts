import { Contributor } from '../entities/Contributor.js';
import { Repository, DataSource, In } from 'typeorm';

// Custom repository for Contributor entity

export class ContributorRepository extends Repository<Contributor> {
  /**
   * Insert contributors that do not already exist (by id)
   */
  async insertBatch(data: Partial<Contributor>[]): Promise<Contributor[]> {
    if (!data.length) return [];
    const filtered = data.filter(
      (d): d is Partial<Contributor> & { id: string } =>
        typeof d.id === 'string'
    );
    const existing = await this.findBy({ id: In(filtered.map(d => d.id)) });
    const existingIds = new Set(existing.map(e => e.id));
    const toInsert = filtered.filter(d => !existingIds.has(d.id));
    if (!toInsert.length) return [];
    const records = this.create(toInsert);
    await this.save(records);
    return records;
  }

  /**
   * Upsert contributors using TypeORM's native upsert
   */
  async upsertBatch(data: Partial<Contributor>[]): Promise<Contributor[]> {
    if (!data.length) return [];
    const filtered = data.filter(
      (d): d is Partial<Contributor> & { id: string } =>
        typeof d.id === 'string'
    );
    await this.upsert(filtered, ['id']);
    return this.findBy({ id: In(filtered.map(d => d.id)) });
  }

  async getById(id: string): Promise<Contributor | null> {
    return this.findOneBy({ id });
  }

  async getAll(): Promise<Contributor[]> {
    return this.find();
  }

  // Example: find all contributors with a specific company
  async findByCompany(company: string): Promise<Contributor[]> {
    return this.find({ where: { company } });
  }
}

// Helper to register the custom repository with a DataSource
export function getContributorRepository(
  dataSource: DataSource
): ContributorRepository {
  return dataSource
    .getRepository(Contributor)
    .extend(ContributorRepository.prototype) as ContributorRepository;
}
