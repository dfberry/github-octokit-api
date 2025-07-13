import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('repositories')
export class GitHubRepositoryEntity {
  @PrimaryColumn()
  id!: string; // GitHub node id

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  name_with_owner?: string;

  @Column({ nullable: true })
  url?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'integer', nullable: true })
  stargazer_count?: number;

  @Column({ type: 'integer', nullable: true })
  fork_count?: number;

  @Column({ type: 'boolean', nullable: true })
  is_private?: boolean;

  @Column({ type: 'boolean', nullable: true })
  is_fork?: boolean;

  @Column({ type: 'boolean', nullable: true })
  is_archived?: boolean;

  @Column({ type: 'boolean', nullable: true })
  is_disabled?: boolean;

  @Column({ nullable: true })
  primary_language?: string; // reduced to primaryLanguage.name

  @Column({ nullable: true })
  license_info?: string; // reduced to licenseInfo.name

  @Column({ type: 'integer', nullable: true })
  disk_usage?: number;

  @Column({ nullable: true })
  created_at?: string;

  @Column({ nullable: true })
  updated_at?: string;

  @Column({ nullable: true })
  pushed_at?: string;

  @Column({ nullable: true })
  owner?: string; // reduced to owner.login

  @Column({ type: 'integer', nullable: true })
  watchers_count?: number;

  @Column({ type: 'integer', nullable: true })
  issues_count?: number;

  @Column({ type: 'integer', nullable: true })
  pull_requests_count?: number;

  @Column({ nullable: true })
  topics?: string; // comma-delimited list

  @Column({ type: 'text', nullable: true })
  readme?: string | null;

  @Column({ nullable: true })
  dependabot_alerts_status?: string;

  @Column({ nullable: true })
  workflow_status?: string;

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
