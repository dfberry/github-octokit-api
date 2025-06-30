import { CosmosClient } from '@azure/cosmos';
import { AzureOpenAI } from 'openai';

const endpoint = process.env.COSMOS_DB_ENDPOINT || '';
const key = process.env.COSMOS_DB_KEY || '';
const databaseId = process.env.COSMOS_DB_DATABASE || '';
const containerId = process.env.COSMOS_DB_CONTAINER || '';
const openaiApiKey = process.env.OPENAI_API_KEY || '';

if (!endpoint || !key || !databaseId || !containerId || !openaiApiKey) {
    throw new Error('Missing configuration. Please set the environment variables.');
}

const client = new CosmosClient({ endpoint, key });
const database = client.database("bizintell");
const container = database.container("github");

const llm = new AzureOpenAI({
    endpoint: process.env.OPENAI_ENDPOINT!,
    apiKey: process.env.OPENAI_API_KEY!,
    apiVersion: process.env.OPENAI_API_VERSION!,
    deployment: process.env.OPENAI_LLM_DEPLOYMENT_NAME!,
});

const embedding = new AzureOpenAI({
    endpoint: process.env.OPENAI_ENDPOINT!,
    apiKey: process.env.OPENAI_API_KEY!,
    apiVersion: process.env.OPENAI_API_VERSION!,
    deployment: process.env.OPENAI_EMBEDDING_DEPLOYMENT_NAME!,
});
async function createVector(query: string): Promise<number[]> {
    try {
        const embeddingResponse = await embedding.embeddings.create({
            input: query,
            model: process.env.OPENAI_EMBEDDING_DEPLOYMENT_NAME!
        });

        console.log(`Embedding received`);
        const queryVector = embeddingResponse.data[0].embedding;
        return queryVector;
    } catch (error) {
        console.error('Error creating embedding for query:', error);
        throw error;
    }
}
async function getRelevantDocuments(queryVector: number[], limit:number=3): Promise<any[]> {
    try {
        const findRelevanctDocumentsQuery = `
          SELECT c.id, c.category, c.context, VectorDistance(c.embedding, @queryVector) AS SimilarityScore
          FROM c
          WHERE IS_DEFINED(c.embedding)
          ORDER BY VectorDistance(c.embedding, @queryVector)
          OFFSET 0 LIMIT ${limit}
        `;
        const { resources: docs } = await container.items.query({
          query: findRelevanctDocumentsQuery,
          parameters: [
            {
              name: '@queryVector',
              value: queryVector
            }
          ]
        }).fetchAll();
        return docs;
    } catch (error) {
        console.error('Error fetching relevant documents:', error);
        throw error;
    }
}
async function main(systemPrompt:string, relevantDocCount: number, userQuery: string): Promise<void> {
    try {

        console.log(`\n🔎 Query: ${userQuery}`);
        const queryAsVector = await createVector(userQuery);

        const relevantDocuments = await getRelevantDocuments(queryAsVector, relevantDocCount);

        relevantDocuments.forEach((doc, i) => {
            console.log(`${i + 1}. ${doc.category} ${doc.id} (Score: ${doc.SimilarityScore}`);
        });

        const context = relevantDocuments.map(doc => doc.context).join('\n\n');
     
        const completion = await llm.chat.completions.create({
        model: process.env.OPENAI_LLM_DEPLOYMENT_NAME!,
        messages: [
            {
            role: 'system',
            content: systemPrompt
            },
            {
            role: 'user',
            content: `Based on this information, ${userQuery} \n\Repository information:\n${context}`
            }
        ]
        });
        console.log('\n💬 AI Response:');
        console.log(completion.choices[0].message.content);
        

    } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    }
}

const systemPrompt=`You are a Analytical GitHub repository manager. Answer questions about GitHub repositories based on the provided context.`

if (process.argv.length < 3) {
    console.log('Usage: ts-node src/index.ts <number_of_relevant_documents> "<user_query>"');
    console.log('Example: ts-node src/index.ts 3 "Which repository needs the most maintenance?"');
    process.exit(1);
}

let relevantDocCount:number;
if(isNaN(Number(process.argv[2])) || Number(process.argv[2])<1 || Number(process.argv[2])>10){
    console.log('Please provide a valid number of relevant documents between 1 and 10.');
    process.exit(1);
}
relevantDocCount=Number(process.argv[2])

let userQuery:string= process.argv[3];
if(!userQuery){
    console.log('Please provide a valid number of relevant documents between 1 and 10.');
    process.exit(1);
}

main(systemPrompt, relevantDocCount, userQuery)
    .then(() => {
        console.log('Process completed successfully.');
    })
    .catch((error) => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });