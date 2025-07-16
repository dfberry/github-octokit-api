// Only comments above imports
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import { summarize } from './lib/summarize.js';
import { embedSummary, embedDocument } from './lib/embedding.js';
export interface EntityDescriptor {
  name: string;
  entity: EntityTarget<ObjectLiteral>;
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
          return `${row.type.toString().toUpperCase()}:${row.org}_${row.repo}:${row.username}:${row.id}`;
        }
        break;
      case 'contributors':
        if (row.id !== undefined) {
          return `CONTRIBUTOR:${row.id}`;
        }
        break;
      case 'repositories':
        if (row.owner && row.name && row.id !== undefined) {
          return `REPOSITORY:${row?.owner}_${row?.name}:${row.id}`;
        }
        break;
      case 'workflows':
        if (row.org_repo && row.id !== undefined) {
          const [owner, repo] = (row.org_repo as string).split('/');
          if (owner && repo) {
            return `WORKFLOW:${owner}_${repo}:${row.id}`;
          }

          return `WORKFLOW:${row.id}`;
        }
        break;
      default:
        return `${tableName.toUpperCase()}:${row.id || 'unknown'}`;
    }
  } catch (err) {
    // Defensive: should not throw, but just in case
    console.log(`Error constructing category for table ${tableName}:`, err);
    // Return undefined to skip this
    return null;
  }
  return null;
}
export async function processTablesToSame(
  entities: EntityDescriptor[],
  sourceDataSource: DataSource,
  jsonToMarkdown: (category: string, row: Record<string, unknown>) => string
): Promise<{ insertedCount: number; skippedCount: number }> {
  let insertedCount = 0;
  let skippedCount = 0;
  for await (const entityDescriptor of entities) {
    const { name, entity } = entityDescriptor;
    const result = await processOneTableToSame(
      name,
      entity,
      sourceDataSource,
      jsonToMarkdown
    );
    insertedCount += result.insertedCount;
    skippedCount += result.skippedCount;
  }
  return { insertedCount, skippedCount };
}
// Create the document template value and update table with value

export async function processOneTableToSame(
  name: string,
  entity: EntityTarget<ObjectLiteral>,
  sourceDataSource: DataSource,
  jsonToMarkdown: (category: string, row: Record<string, unknown>) => string
): Promise<{ insertedCount: number; skippedCount: number }> {
  let insertedCount = 0;
  let skippedCount = 0;
  try {
    const rows = await sourceDataSource.getRepository(entity).find();
    for await (const row of rows as Record<string, unknown>[]) {
      const result = await processAndUpdateRow({
        name,
        entity,
        sourceDataSource,
        row,
        jsonToMarkdown,
      });
      if (result.success) {
        insertedCount++;
      } else {
        skippedCount++;
      }
    }
  } catch (err) {
    console.log(`[SKIP] Error processing table ${name}:`, err);
  }
  return { insertedCount, skippedCount };
}

// Helper for processing and updating a single row
async function processAndUpdateRow({
  name,
  entity,
  sourceDataSource,
  row,
  jsonToMarkdown,
}: {
  name: string;
  entity: EntityTarget<ObjectLiteral>;
  sourceDataSource: DataSource;
  row: Record<string, unknown>;
  jsonToMarkdown: (category: string, row: Record<string, unknown>) => string;
}): Promise<{ success: boolean }> {
  const category = constructCategory(name, row);
  if (!category) {
    console.log(
      `[CONTINUE] Could not construct category for table ${name}, row:`,
      row
    );
    return { success: false };
  }

  let markdown: string;
  let summary: string = '';
  try {
    markdown = jsonToMarkdown(category, row);
    summary = await summarize(markdown);
  } catch (err) {
    console.log(
      `[SKIP] Error converting row to markdown or summarizing for table ${name}, row:`,
      row,
      'Error:',
      err
    );
    return { success: false };
  }

  // You may want to generate or fetch the embeddings here; for now, pass null or a placeholder
  const documentEmedding = await embedDocument(markdown);
  const summaryEmbedding = await embedSummary(summary);

  await updateEntityRowWithAllFields(
    sourceDataSource,
    entity,
    row,
    category,
    markdown,
    summary,
    documentEmedding,
    summaryEmbedding
  );

  console.log(`[UPDATE COMPLETE] Document for table ${name}, row: ${category}`);
  return { success: true };
}

// Update document_category, document, document_summary, document_embedding, and summary_embedding fields for a row
async function updateEntityRowWithAllFields(
  dataSource: DataSource,
  entity: EntityTarget<ObjectLiteral>,
  row: Record<string, unknown>,
  category: string,
  text: string,
  summary: string,
  embedding: unknown,
  summaryEmbedding: unknown
): Promise<void> {
  try {
    const repository = dataSource.getRepository(entity);
    const idValue = row['id'];
    if (idValue === undefined) {
      throw new Error("Row does not have an 'id' field");
    }
    const updateFields: Record<string, unknown> = {
      document_category: category,
      document: text,
      document_summary: summary,
      document_embedding: embedding,
      document_summary_embedding: summaryEmbedding,
    };
    await repository.update({ id: idValue }, updateFields);
  } catch (err) {
    console.log(
      '[SKIP] Error updating all document fields in table ' +
        dataSource.getRepository(entity).metadata.tableName +
        ':',
      err
    );
  }
}
