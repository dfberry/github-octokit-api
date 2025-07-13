import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('workflows')
export class GitHubWorkflowEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  node_id!: string; // GitHub node id

  @Column({ nullable: true })
  org_repo!: string;

  @Column({ nullable: true })
  name!: string;

  @Column({ nullable: true })
  path?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ nullable: true })
  created_at?: string;

  @Column({ nullable: true })
  updated_at?: string;

  @Column({ nullable: true })
  url!: string;

  @Column({ nullable: true })
  last_run_id!: string;

  @Column({ nullable: true })
  last_run_status!: string;

  @Column({ nullable: true })
  last_run_date!: string;

  @Column({ nullable: true })
  last_run_url!: string;

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
