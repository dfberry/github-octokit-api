import { DataSource } from 'typeorm';
import { Repository } from '@dfb/db';
import { Contributor } from '@dfb/db';
import { ContributorIssuePr } from '@dfb/db';
import { Workflow } from '@dfb/db';
import { DependabotAlert } from '@dfb/db';

import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamically generate the DB path in ./generated/{timestamp}/oss/github.db
function getGeneratedDbPath() {
  const baseDir = path.resolve(__dirname, '../../generated');
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const timestamp =
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    '_' +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());
  const dbDir = path.join(baseDir, timestamp, 'oss');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  return path.join(dbDir, 'github.db');
}

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: getGeneratedDbPath(),
  synchronize: true, // For dev only; use migrations in prod
  logging: false,
  entities: [
    Repository,
    Contributor,
    ContributorIssuePr,
    Workflow,
    DependabotAlert,
  ],
});

export async function initDb() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource;
}
