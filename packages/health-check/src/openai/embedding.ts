import { AzureOpenAI } from 'openai';

const openai = new AzureOpenAI({
  endpoint: process.env.OPENAI_ENDPOINT!,
  apiKey: process.env.OPENAI_API_KEY!,
  apiVersion: process.env.OPENAI_API_VERSION!,
  deployment: process.env.OPENAI_DEPLOYMENT_NAME!,
});

export async function createVector(document: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: document,
    });

    if (response.data && response.data.length > 0) {
      return response.data[0].embedding;
    } else {
      throw new Error('Failed to generate embedding');
    }
  } catch (error) {
    console.error('Error creating vector for document:', error);
    throw error;
  }
}
