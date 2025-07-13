import pRetry from 'p-retry';
import { createEmbedding, AzureOpenAIConfig, getTrimmedText } from '@dfb/ai';

const apiKey = process.env.OPENAI_API_KEY;
const endpoint = process.env.OPENAI_ENDPOINT;
const deployment = process.env.OPENAI_EMBEDDING_DEPLOYMENT_NAME;
const apiVersion = process.env.OPENAI_API_VERSION;

const config: AzureOpenAIConfig = { endpoint, apiKey, deployment, apiVersion };

export async function embedSummary(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    return [];
  }
  if (!apiKey || !endpoint || !deployment || !apiVersion) {
    console.warn(
      'OpenAI configuration is missing. Please set OPENAI_API_KEY, OPENAI_ENDPOINT, OPENAI_SUMMARIZATION_MODEL_NAME, and OPENAI_SUMMARIZATION_API_VERSION environment variables.'
    );
    return [];
  }
  try {
    const result = await pRetry(() => createEmbedding(config, text), {
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
export async function embedDocument(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    return [];
  }
  if (!apiKey || !endpoint || !deployment || !apiVersion) {
    console.warn(
      'OpenAI configuration is missing. Please set OPENAI_API_KEY, OPENAI_ENDPOINT, OPENAI_SUMMARIZATION_MODEL_NAME, and OPENAI_SUMMARIZATION_API_VERSION environment variables.'
    );
    return [];
  }
  try {
    const trimResult = getTrimmedText(text, deployment);

    console.log(
      `   Embedding document text. Original length: ${text.length}, Trimmed length: ${trimResult.length}`
    );

    const result = await pRetry(() => createEmbedding(config, trimResult), {
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
