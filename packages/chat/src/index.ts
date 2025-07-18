import { CosmosClient } from '@azure/cosmos';
import { config } from './config.js';
import { createVector, getLLMCompletion } from './ai.js';
import { getRelevantDocuments } from './db.js';

if (!config.endpoint || !config.key || !config.databaseId || !config.containerId || !config.partitionKey || !config.openaiApiKey) {
    throw new Error('Missing configuration. Please set the environment variables.');
}

const client = new CosmosClient({ endpoint: config.endpoint, key: config.key });
const database = client.database(config.databaseId);
const container = database.container(config.containerId);

const llmConfig = {
    endpoint: config.openaiEndpoint,
    apiKey: config.openaiApiKey,
    apiVersion: config.llmApiVersion,
    deployment: config.llmModelName,
};

const embeddingConfig = {
    endpoint: config.openaiEndpoint,
    apiKey: config.openaiApiKey,
    apiVersion: config.embeddingApiVersion,
    deployment: config.embeddingModelName,
};

async function main(systemPrompt: string, relevantDocCount: number, userQuery: string): Promise<void> {
    try {
        console.log(`\n🔎 Query: ${userQuery}`);
        const queryAsVector = await createVector(embeddingConfig, userQuery);
        const relevantDocuments:string = await getRelevantDocuments(container, queryAsVector, relevantDocCount);
        if (relevantDocuments.length === 0) {
            console.log('No relevant documents found.');
            return;
        }

        const aiResponse = await getLLMCompletion(llmConfig, systemPrompt, userQuery, relevantDocuments);
        console.log('\n💬 AI Response:');
        console.log(aiResponse);
    } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    }
}

main(config.systemPrompt, config.numberOfRelevantDocuments, config.userQuestion)
    .then(() => {
        console.log('Process completed successfully.');
    })
    .catch((error) => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });