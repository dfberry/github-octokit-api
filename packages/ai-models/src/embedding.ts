import { AzureOpenAI  } from 'openai';


import type { AzureOpenAIConfig } from './completion.js';

export async function createEmbedding(
  config: AzureOpenAIConfig,
  document: string
): Promise<{ vector: number[]; tokens: { prompt_tokens: number; total_tokens: number } }> {
  const openai = new AzureOpenAI(config);
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