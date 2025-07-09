import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('contributors')
export class GitHubContributorEntity {
  @PrimaryColumn()
  id!: string; // login

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  company?: string;

  @Column({ nullable: true })
  blog?: string;

  @Column({ nullable: true })
  location?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  bio?: string;

  @Column({ nullable: true })
  twitter?: string;

  @Column({ type: 'integer', default: 0 })
  followers?: number;

  @Column({ type: 'integer', default: 0 })
  following?: number;

  @Column({ type: 'integer', default: 0 })
  public_repos?: number;

  @Column({ type: 'integer', default: 0 })
  public_gists?: number;

  @Column({ nullable: true })
  avatar_url?: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  last_updated?: Date;

  @Column({ type: 'text', nullable: true })
  document_category?: string;

  @Column({ type: 'text', nullable: true })
  document_summary?: string;

  @Column({ type: 'text', nullable: true })
  document?: string;

  // store as JSON string
  // When reading/writing, parse/stringify the array in your application code.
  @Column({ type: 'text', nullable: true })
  documentEmbedding?: string[];
}
