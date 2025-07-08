// Only comments above imports
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import { DocumentTemplateService } from '@dfb/db';
import { constructCategory } from './index.js';

export interface EntityDescriptor {
  name: string;
  entity: EntityTarget<ObjectLiteral>;
}

export async function processOneTable(
  name: string,
  entity: EntityTarget<ObjectLiteral>,
  sourceDataSource: DataSource,
  documentTemplateService: DocumentTemplateService,
  jsonToMarkdown: (category: string, row: Record<string, unknown>) => string
): Promise<{ insertedCount: number; skippedCount: number }> {
  let insertedCount = 0;
  let skippedCount = 0;
  try {
    const rows = await sourceDataSource.getRepository(entity).find();
    for await (const row of rows as Record<string, unknown>[]) {
      const category = constructCategory(name, row);
      if (!category) {
        console.log(
          `[SKIP] Could not construct category for table ${name}, row:`,
          row
        );
        skippedCount++;
        continue;
      }
      let text: string;
      try {
        text = jsonToMarkdown(category, row);
      } catch (err) {
        console.log(
          `[SKIP] Error converting row to markdown for table ${name}, row:`,
          row,
          'Error:',
          err
        );
        skippedCount++;
        continue;
      }
      const dateCreated = new Date().toISOString();
      await documentTemplateService.insert({ category, text, dateCreated });
      insertedCount++;
    }
  } catch (err) {
    console.log(`[SKIP] Error processing table ${name}:`, err);
  }
  return { insertedCount, skippedCount };
}

export async function processTables(
  entities: EntityDescriptor[],
  sourceDataSource: DataSource,
  documentTemplateService: DocumentTemplateService,
  jsonToMarkdown: (category: string, row: Record<string, unknown>) => string
): Promise<{ insertedCount: number; skippedCount: number }> {
  let insertedCount = 0;
  let skippedCount = 0;
  for await (const entityDescriptor of entities) {
    const { name, entity } = entityDescriptor;
    const result = await processOneTable(
      name,
      entity,
      sourceDataSource,
      documentTemplateService,
      jsonToMarkdown
    );
    insertedCount += result.insertedCount;
    skippedCount += result.skippedCount;
  }
  return { insertedCount, skippedCount };
}
