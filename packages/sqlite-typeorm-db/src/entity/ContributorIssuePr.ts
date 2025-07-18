import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('contributor_issues_prs')
export class GitHubContributorIssuePrEntity {
  @PrimaryColumn()
  username!: string;

  @PrimaryColumn()
  type!: string; // 'issue' | 'pr'

  @PrimaryColumn()
  id!: string;

  @Column({ type: 'integer', nullable: true })
  number?: number;

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true })
  url?: string;

  @Column({ nullable: true })
  org?: string;

  @Column({ nullable: true })
  repo?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ nullable: true })
  created_at?: string;

  @Column({ nullable: true })
  updated_at?: string;

  @Column({ nullable: true })
  closed_at?: string;

  @Column({ nullable: true })
  merged_at?: string;

  @Column({ type: 'boolean', nullable: true })
  merged?: boolean;

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
