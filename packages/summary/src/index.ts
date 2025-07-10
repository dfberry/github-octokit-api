import { DataSource, DataSourceOptions, Not, IsNull } from 'typeorm';
import {
    GitHubContributorIssuePrEntity,
    GitHubContributorEntity,
    GitHubRepositoryEntity,
    GitHubWorkflowEntity,
} from '@dfb/db';
// Update the import to match the actual export from '@dfb/ai'
import { getSummary, AzureOpenAIConfig, createEmbedding } from '@dfb/ai';
import path from 'path';
import { fileURLToPath } from 'url';
import pRetry from 'p-retry';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiKey = process.env.OPENAI_API_KEY || 'YOUR_API_KEY';
const apiVersion = process.env.OPENAI_API_VERSION || '2024-04-01-preview';
const endpoint = process.env.OPENAI_ENDPOINT || 'https://openai-intell.openai.azure.com/';
const deployment = process.env.OPENAI_SUMMARIZATION_MODEL_NAME || 'gpt-35-turbo';

const config: AzureOpenAIConfig = { endpoint, apiKey, deployment, apiVersion };

function getRelevantTables() {
    return [
        { name: 'contributor_issues_prs', entity: GitHubContributorIssuePrEntity },
        { name: 'contributors', entity: GitHubContributorEntity },
        { name: 'repositories', entity: GitHubRepositoryEntity },
        { name: 'workflows', entity: GitHubWorkflowEntity },
    ];
}

// Helper to process in batches with backoff
async function processInBatches(
    rows: any[],
    batchSize: number,
    handler: (row: any, idx: number) => Promise<boolean>, // returns true if processed, false if skipped
    batchDelayMs = 1000
) {
    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        // Run all handlers and collect if any were processed
        const results = await Promise.all(batch.map((row, idx) => handler(row, i + idx)));
        const anyProcessed = results.some(Boolean);
        if (anyProcessed && i + batchSize < rows.length) {
            console.log(`[BATCH] Waiting ${batchDelayMs}ms before next batch...`);
            await new Promise((res) => setTimeout(res, batchDelayMs));
        }
    }
}

async function summarizeAndUpdateTable(
    dataSource: DataSource,
    tableName: string,
    entity: any
) {
    const repository = dataSource.getRepository(entity);
    const rows = await repository.find();
    let updatedCount = 0;
    const totalRows = rows.length;
    // Fetch only rows that have a document and do not already have a summary
    const rowsWithDocument = await repository.find({
        where: [
            {
                document: Not(''),
                document_summary: IsNull()
            },
            {
                document: Not(''),
                document_summary: ''
            }
        ]
    });
    const totalWithDocument = rowsWithDocument.length;
    console.log(`[START] Processing table: ${tableName}`);
    console.log(`[INFO] ${totalRows} rows found, ${totalWithDocument} with document`);
    const tableStart = Date.now();
    const BATCH_SIZE = 10;
    await processInBatches(rowsWithDocument, BATCH_SIZE, async (row) => {
        // Skip if summary already exists
        if (row.document_summary && row.document_summary.trim().length > 0) {
            console.log(`[SKIP] ${tableName} id ${row.id} already has a summary.`);
            return false;
        }
        try {
            const result = await pRetry(() => getSummary(config, row.document), {
                retries: 3,
                minTimeout: 5000,
                maxTimeout: 15000,
                onFailedAttempt: error => {
                    console.warn(`[RETRY] Row id ${row.id} attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left. Reason: ${error.message}`);
                },
            });
            await repository.update({ id: row.id }, { document_summary: result.trim() });
            updatedCount++;
            console.log(`[UPDATE] ${tableName} id ${row.id} summary updated.`);
            return true;
        } catch (err) {
            console.error(`[ERROR] Failed to summarize or update row id ${row.id} in ${tableName}:`, err);
            return false;
        }
    });
    const tableEnd = Date.now();
    console.log(`[END] Finished table: ${tableName} in ${tableEnd - tableStart}ms`);
    return updatedCount;
}

export async function summarizeDocumentsInDb() {
    const dbPath = path.join(__dirname, '../data/github.db');
    const options: DataSourceOptions = {
        type: 'sqlite',
        database: dbPath,
        entities: [
            GitHubContributorIssuePrEntity,
            GitHubContributorEntity,
            GitHubRepositoryEntity,
            GitHubWorkflowEntity,
        ],
    };
    const processStart = Date.now();
    const dataSource = new DataSource(options);
    await dataSource.initialize();
    const tables = getRelevantTables();
    let totalUpdated = 0;
    for await (const { name, entity } of tables) {
        const updated = await summarizeAndUpdateTable(dataSource, name, entity);
        console.log(`[SUMMARY] ${updated} rows updated in ${name}`);
        totalUpdated += updated;
    }
    await dataSource.destroy();
    const processEnd = Date.now();
    console.log(`[DONE] Total rows updated: ${totalUpdated}`);
    console.log(`[TIME] Total summarization time: ${processEnd - processStart}ms`);
    return totalUpdated;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    summarizeDocumentsInDb()
        .then(() => console.log('Summarization completed.'))
        .catch((err) => {
            console.error('Summarization failed:', err);
        });
}
