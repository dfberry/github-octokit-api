import pRetry from 'p-retry';
import { createEmbedding, getTrimmedText, AzureOpenAIConfig } from '@dfb/ai';

export async function embedSummary(
  aiConfig: AzureOpenAIConfig,
  text: string
): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    return [];
  }
  if (
    !aiConfig.apiKey ||
    !aiConfig.endpoint ||
    !aiConfig.deployment ||
    !aiConfig.apiVersion
  ) {
    console.warn(
      'create-document-template-data:lib/embedding.ts - OpenAI configuration is missing. Please set OPENAI_API_KEY, OPENAI_ENDPOINT, OPENAI_EMBEDDING_DEPLOYMENT_NAME, and OPENAI_API_VERSION environment variables.'
    );
    return [];
  }
  try {
    const result = await pRetry(() => createEmbedding(aiConfig, text), {
      retries: 3,
      minTimeout: 5000,
      maxTimeout: 15000,
      onFailedAttempt: error => {
        console.warn(
          `[RETRY] Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left. Reason: ${error.message}`
        );
      },
    });
    return result.vector;
  } catch (error) {
    console.error('Error during summarization:', error);
    return [];
  }
}
export async function embedDocument(
  aiConfig: AzureOpenAIConfig,
  text: string
): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    return [];
  }
  if (
    !aiConfig.apiKey ||
    !aiConfig.endpoint ||
    !aiConfig.deployment ||
    !aiConfig.apiVersion
  ) {
    console.warn(
      'create-document-template-data:lib/embedding.ts - OpenAI configuration is missing. Please set OPENAI_API_KEY, OPENAI_ENDPOINT, OPENAI_EMBEDDING_DEPLOYMENT_NAME, and OPENAI_API_VERSION environment variables.'
    );
    return [];
  }
  try {
    const trimResult = getTrimmedText(text, aiConfig.deployment);

    if (text.length !== trimResult.length) {
      const trimmedCount = text.length - trimResult.length;
      console.warn(
        `   Embedding length: ${trimResult.length}: trimmed ${trimmedCount.toLocaleString()}`
      );
    } else {
      console.log(`   Embedding length: ${text.length}: trimmed 0`);
    }

    const result = await pRetry(() => createEmbedding(aiConfig, trimResult), {
      retries: 3,
      minTimeout: 5000,
      maxTimeout: 15000,
      onFailedAttempt: error => {
        console.warn(
          `[RETRY] Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left. Reason: ${error.message}`
        );
      },
    });
    return result.vector;
  } catch (error) {
    console.error('Error during summarization:', error);
    return [];
  }
}
