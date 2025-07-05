import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('contributor_issues_prs')
export default class ContributorIssuePr {
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
  createdAt?: string;

  @Column({ nullable: true })
  updatedAt?: string;

  @Column({ nullable: true })
  closedAt?: string;

  @Column({ nullable: true })
  mergedAt?: string;

  @Column({ type: 'boolean', nullable: true })
  merged?: boolean;
}
