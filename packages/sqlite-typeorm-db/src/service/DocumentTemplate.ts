import { DocumentTemplateEntity } from '../entity/DocumentTemplate.js';
import { DataSource, InsertResult } from 'typeorm';
import { Repository } from 'typeorm/repository/Repository.js';

export class DocumentTemplateService {
  private repository: Repository<DocumentTemplateEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(DocumentTemplateEntity);
  }

  async insert(
    data: Partial<DocumentTemplateEntity>
  ): Promise<InsertResult | null> {
    if (!data || Object.keys(data).length === 0) return null;
    return this.repository.insert(data);
  }

  async update(
    id: number,
    updateFields: Partial<Omit<DocumentTemplateEntity, 'id'>>
  ): Promise<void> {
    await this.repository.update(id, updateFields);
  }

  async readAll(): Promise<DocumentTemplateEntity[]> {
    return this.repository.find();
  }
}
