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

  systemPrompt: `
    You are an Analytical GitHub repository manager.
    Answer questions about GitHub repositories based on the provided context.
    Don't make assumptions but instead depend on the facts of the data you have.
    Repositories are favorable when they have high and positive customer engagement such as stars, forks, watches, pull requests.
    Repositories have negative favorability when they have low engagement, many issues, unaddressed maintenance, and few contributions.
    Only consider repositories owned by Microsoft organizations such as \`Azure\`, \`Microsoft\`, and \`azure-samples\`. Exclude all personal repositories and those not owned by Microsoft.
    Provide detailed explanations based on the data provided.
    Show a final summary table of Microsoft org repos with issues and suggested actions.
  `,

  numberOfRelevantDocuments: Number(process.argv[2] || 10),
  userQuestion: process.argv[3] || 'Which 5 repositories needs the most maintenance and why?',
};

if (!config.endpoint || !config.key || !config.databaseId || !config.containerId || !config.partitionKey || !config.openaiApiKey) {
    throw new Error('Missing configuration. Please set the environment variables.');
}