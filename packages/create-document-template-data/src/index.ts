import { DataSource, DataSourceOptions } from 'typeorm';
import { jsonToMarkdown } from './json-to-md.js';
import {
  processTables,
  EntityDescriptor,
  processTablesToSame,
} from './processEntities.js';
import {
  GitHubContributorIssuePrEntity,
  GitHubContributorEntity,
  GitHubRepositoryEntity,
  GitHubWorkflowEntity,
  DocumentTemplateEntity,
  DocumentTemplateService,
} from '@dfb/db';

import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getRelevantTables() {
  return [
    { name: 'contributor_issues_prs', entity: GitHubContributorIssuePrEntity },
    { name: 'contributors', entity: GitHubContributorEntity },
    { name: 'repositories', entity: GitHubRepositoryEntity },
    { name: 'workflows', entity: GitHubWorkflowEntity },
  ];
}

/**
 * Generates a timestamp string in YYYYMMDDHHMMSS format.
 */
function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

/**
 * Constructs the category string for a row based on the table/entity name and row data.
 */
export function constructCategory(
  tableName: string,
  row: Record<string, unknown>
): string | null | undefined {
  try {
    switch (tableName) {
      case 'contributor_issues_prs':
        if (
          row.org &&
          row.repo &&
          row.username &&
          row.type &&
          row.id !== undefined
        ) {
          return `${row.type.toString().toUpperCase()}:${row.org}/${row.repo}:${row.username}:${row.id}`;
        }
        break;
      case 'contributors':
        if (row.id !== undefined) {
          return `CONTRIBUTOR:${row.id}`;
        }
        break;
      case 'repositories':
        if (row.nameWithOwner && row.id !== undefined) {
          return `REPOSITORY:${row.nameWithOwner}:${row.id}`;
        }
        break;
      case 'workflows':
        if (row.orgRepo && row.id !== undefined) {
          return `WORKFLOW:${row.orgRepo}/${row.id}:${row.path || ''}`;
        }
        break;
      default:
        return;
    }
  } catch (err) {
    // Defensive: should not throw, but just in case
    console.log(`Error constructing category for table ${tableName}:`, err);
    // Return undefined to skip this
    return null;
  }
  return null;
}
export async function createDocumentTemplateData() {
  const sourceDbPath = process.env.SQLITE_DB_FILE || './data/github.db';
  const timestamp = getTimestamp();
  const outputDir = process.env.OUTPUT_DIR || './generated/';
  const newDbPath = path.join(__dirname, '../', outputDir);
  const newDbPathFile = path.join(
    newDbPath,
    `document_templates_${timestamp}.db`
  );

  console.log(
    `Creating document template data from ${sourceDbPath} to ${newDbPath}...`
  );
  await fs.mkdir(path.dirname(newDbPath), { recursive: true });

  // Connect to source DB
  const sourceOptions: DataSourceOptions = {
    type: 'sqlite',
    database: sourceDbPath,
    entities: [
      GitHubContributorIssuePrEntity,
      GitHubContributorEntity,
      GitHubRepositoryEntity,
      GitHubWorkflowEntity,
    ],
  };
  const sourceDataSource = new DataSource(sourceOptions);
  await sourceDataSource.initialize();

  // Connect to new DB (target) with DocumentTemplateEntity
  const targetOptions: DataSourceOptions = {
    type: 'sqlite',
    database: newDbPathFile,
    entities: [DocumentTemplateEntity],
    synchronize: true, // Ensure the schema is created
  };
  const targetDataSource = new DataSource(targetOptions);
  await targetDataSource.initialize();
  const documentTemplateService = new DocumentTemplateService(targetDataSource);

  const entities = getRelevantTables();
  const { insertedCount, skippedCount } = await processTables(
    entities as EntityDescriptor[],
    sourceDataSource,
    documentTemplateService,
    jsonToMarkdown
  );

  console.log(
    `Finished processing. Inserted: ${insertedCount}, Skipped: ${skippedCount}, New DB: ${newDbPath}`
  );

  await sourceDataSource.destroy();
  await targetDataSource.destroy();
  return { insertedCount, skippedCount, newDbPath };
}
export async function createDocumentTemplateDataSingleDb() {
  const sourceDbPath = process.env.SQLITE_DB_FILE || './data/github.db';

  // Connect to source DB
  const sourceOptions: DataSourceOptions = {
    type: 'sqlite',
    database: sourceDbPath,
    entities: [
      GitHubContributorIssuePrEntity,
      GitHubContributorEntity,
      GitHubRepositoryEntity,
      GitHubWorkflowEntity,
    ],
  };
  const sourceDataSource = new DataSource(sourceOptions);
  await sourceDataSource.initialize();

  const entities = getRelevantTables();
  const { insertedCount, skippedCount } = await processTablesToSame(
    entities as EntityDescriptor[],
    sourceDataSource,
    jsonToMarkdown
  );

  console.log(
    `Finished processing. Inserted: ${insertedCount}, Skipped: ${skippedCount}, New DB: ${sourceDbPath}`
  );

  await sourceDataSource.destroy();
  return { insertedCount, skippedCount };
}

// Update your script runner:
if (import.meta.url === `file://${process.argv[1]}`) {
  createDocumentTemplateDataSingleDb()
    .then(() => console.log('Data creation completed.'))
    .catch((err: unknown) => {
      console.error('Data creation failed:', err);
    });
}
