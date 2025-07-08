import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'document_templates' }) // Use a static name, or set dynamically if needed
export class DocumentTemplateEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  category!: string;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'text', name: 'date_created' })
  dateCreated!: string;
}
