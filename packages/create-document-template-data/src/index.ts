import { DataSource, DataSourceOptions } from 'typeorm';
import { jsonToMarkdown } from './lib/json-to-md.js';
import { EntityDescriptor, processTablesToSame } from './processEntities.js';
import {
  GitHubContributorIssuePrEntity,
  GitHubContributorEntity,
  GitHubRepositoryEntity,
  GitHubWorkflowEntity,
} from '@dfb/db';
import { getCurrentGithubDbPath } from '@dfb/finddb';

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

export async function createDocumentTemplateDataSingleDb(
  existingDbPath: string
) {
  const entities = getRelevantTables();

  // Connect to source DB
  const sourceOptions: DataSourceOptions = {
    type: 'sqlite',
    database: existingDbPath,
    entities: entities.map(e => e.entity),
  };
  const sourceDataSource = new DataSource(sourceOptions);
  await sourceDataSource.initialize();

  const { insertedCount, skippedCount } = await processTablesToSame(
    entities as EntityDescriptor[],
    sourceDataSource,
    jsonToMarkdown
  );

  console.log(
    `Finished processing. Inserted: ${insertedCount}, Skipped: ${skippedCount}, New DB: ${existingDbPath}`
  );

  await sourceDataSource.destroy();
  return { insertedCount, skippedCount };
}

const dataRoot = path.resolve(__dirname, '../../../data');
const existingDbPath = await getCurrentGithubDbPath(dataRoot);
if (!existingDbPath) {
  throw new Error('Could not determine current github.db file.');
}
console.log(`Using existing DB path: ${existingDbPath}`);

await createDocumentTemplateDataSingleDb(existingDbPath);
