import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  node_id!: string; // GitHub node id

  @Column({ nullable: true })
  orgRepo!: string;

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
  lastRunId!: string;

  @Column({ nullable: true })
  lastRunStatus!: string;

  @Column({ nullable: true })
  lastRunDate!: string;

  @Column({ nullable: true })
  lastRunUrl!: string;
}
