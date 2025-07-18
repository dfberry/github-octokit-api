export const config = {
  endpoint: process.env.COSMOS_DB_ENDPOINT || '',
  key: process.env.COSMOS_DB_KEY || '',
  databaseId: process.env.COSMOS_DB_DATABASE || '',
  containerId: process.env.COSMOS_DB_CONTAINER || '',
  partitionKey: process.env.COSMOS_CONTAINER_PARTITION_KEY || '',

  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiEndpoint: process.env.OPENAI_ENDPOINT || '',

  llmModelName: process.env.OPENAI_LLM_DEPLOYMENT_NAME || '',
  llmApiVersion: process.env.OPENAI_LLM_API_VERSION || '',

  embeddingModelName: process.env.OPENAI_EMBEDDING_DEPLOYMENT_NAME || '',
  embeddingApiVersion: process.env.OPENAI_EMBEDDING_API_VERSION || '',

  systemPrompt: `You are a Analytical GitHub repository manager. Answer questions about GitHub repositories based on the provided context.`,
  numberOfRelevantDocuments: Number(process.argv[2] || 10),
  userQuestion: process.argv[3] || 'Which repository needs the most maintenance?',
};

if (!config.endpoint || !config.key || !config.databaseId || !config.containerId || !config.partitionKey || !config.openaiApiKey) {
    throw new Error('Missing configuration. Please set the environment variables.');
}