import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('repositories')
export class GitHubRepositoryEntity {
  @PrimaryColumn()
  id!: string; // GitHub node id

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  nameWithOwner?: string;

  @Column({ nullable: true })
  url?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'integer', nullable: true })
  stargazerCount?: number;

  @Column({ type: 'integer', nullable: true })
  forkCount?: number;

  @Column({ type: 'boolean', nullable: true })
  isPrivate?: boolean;

  @Column({ type: 'boolean', nullable: true })
  isFork?: boolean;

  @Column({ type: 'boolean', nullable: true })
  isArchived?: boolean;

  @Column({ type: 'boolean', nullable: true })
  isDisabled?: boolean;

  @Column({ nullable: true })
  primaryLanguage?: string; // reduced to primaryLanguage.name

  @Column({ nullable: true })
  licenseInfo?: string; // reduced to licenseInfo.name

  @Column({ type: 'integer', nullable: true })
  diskUsage?: number;

  @Column({ nullable: true })
  createdAt?: string;

  @Column({ nullable: true })
  updatedAt?: string;

  @Column({ nullable: true })
  pushedAt?: string;

  @Column({ nullable: true })
  owner?: string; // reduced to owner.login

  @Column({ type: 'integer', nullable: true })
  watchersCount?: number;

  @Column({ type: 'integer', nullable: true })
  issuesCount?: number;

  @Column({ type: 'integer', nullable: true })
  pullRequestsCount?: number;

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
