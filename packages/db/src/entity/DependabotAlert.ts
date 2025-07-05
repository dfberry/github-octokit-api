import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('dependabot_alerts')
export default class DependabotAlert {
  @PrimaryColumn()
  id!: number; // alert number

  @Column()
  repo!: string; // org/repo

  @Column()
  state!: string;

  @Column()
  dependency_name!: string;

  @Column()
  dependency_ecosystem!: string;

  @Column({ nullable: true })
  manifest_path?: string;

  @Column({ nullable: true })
  severity?: string;

  @Column({ nullable: true })
  summary?: string;

  @Column({ nullable: true })
  cve_id?: string;

  @Column({ nullable: true })
  ghsa_id?: string;

  @Column({ nullable: true })
  vulnerable_version_range?: string;

  @Column({ nullable: true })
  first_patched_version?: string;

  @Column()
  created_at!: string;

  @Column()
  updated_at!: string;

  @Column({ nullable: true })
  fixed_at?: string;

  @Column({ nullable: true })
  dismissed_at?: string;

  @Column({ nullable: true })
  html_url?: string;

  @Column({ nullable: true, type: 'float' })
  cvss_score?: number;

  @Column({ nullable: true })
  cvss_vector?: string;
}
