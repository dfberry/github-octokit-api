import { Workflow } from '../entities/Workflow.js';
import { Repository, DataSource, In } from 'typeorm';

export class WorkflowRepository extends Repository<Workflow> {
  async insertBatch(data: Partial<Workflow>[]): Promise<Workflow[]> {
    if (!data.length) return [];
    const filtered = data.filter(
      (d): d is Partial<Workflow> & { id: number } => typeof d.id === 'number'
    );
    const existing = await this.findBy({ id: In(filtered.map(d => d.id)) });
    const existingIds = new Set(existing.map(e => e.id));
    const toInsert = filtered.filter(d => !existingIds.has(d.id));
    if (!toInsert.length) return [];
    const records = this.create(toInsert);
    await this.save(records);
    return records;
  }

  async upsertBatch(data: Partial<Workflow>[]): Promise<Workflow[]> {
    if (!data.length) return [];
    const filtered = data.filter(
      (d): d is Partial<Workflow> & { id: number } => typeof d.id === 'number'
    );
    await this.upsert(filtered, ['id']);
    return this.findBy({ id: In(filtered.map(d => d.id)) });
  }

  async getById(id: number): Promise<Workflow | null> {
    return this.findOneBy({ id });
  }

  async getAll(): Promise<Workflow[]> {
    return this.find();
  }
}

export function getWorkflowRepository(
  dataSource: DataSource
): WorkflowRepository {
  return dataSource
    .getRepository(Workflow)
    .extend(WorkflowRepository.prototype) as WorkflowRepository;
}
