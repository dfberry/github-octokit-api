import { AzureOpenAI  } from 'openai';

const openai = new AzureOpenAI({
  endpoint: process.env.OPENAI_ENDPOINT!,
  apiKey: process.env.OPENAI_API_KEY!,
  apiVersion: process.env.OPENAI_API_VERSION!,
  deployment: process.env.OPENAI_DEPLOYMENT_NAME!,
});

export async function createEmbedding(document: string): Promise<{vector:number[], tokens: {prompt_tokens:number, total_tokens:number}} > {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: document,
    });

    if (response.data && response.data.length > 0) {
      return {
        vector: response.data[0].embedding,
        tokens: response.usage,
      };
    } else {
      throw new Error('Failed to generate embedding');
    }
  } catch (error) {
    console.error('\t initial vectorizing errror:', error);
    throw error;
  }
}