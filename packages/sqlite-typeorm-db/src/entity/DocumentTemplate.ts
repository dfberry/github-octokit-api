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

  @Column({ type: 'text', nullable: true })
  document_category?: string;

  @Column({ type: 'text', nullable: true })
  document_summary?: string;

  @Column({ type: 'text', nullable: true })
  document_summary_embedding?: string[];

  @Column({ type: 'text', nullable: true })
  document?: string;

  // store as JSON string
  // When reading/writing, parse/stringify the array in your application code.
  @Column({ type: 'text', nullable: true })
  document_embedding?: string[];
}
