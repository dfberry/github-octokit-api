import pRetry from 'p-retry';
import { getSummary, AzureOpenAIConfig } from '@dfb/ai';

const apiKey = process.env.OPENAI_API_KEY;
const endpoint = process.env.OPENAI_ENDPOINT;
const deployment = process.env.OPENAI_SUMMARIZATION_MODEL_NAME;
const apiVersion = process.env.OPENAI_SUMMARIZATION_API_VERSION;

const config: AzureOpenAIConfig = { endpoint, apiKey, deployment, apiVersion };

export async function summarize(text: string): Promise<string> {
  if (!text || text.trim().length === 0) {
    return '';
  }
  if (!apiKey || !endpoint || !deployment || !apiVersion) {
    console.warn(
      'OpenAI configuration is missing. Please set OPENAI_API_KEY, OPENAI_ENDPOINT, OPENAI_SUMMARIZATION_MODEL_NAME, and OPENAI_SUMMARIZATION_API_VERSION environment variables.'
    );
    return '';
  }
  try {
    const result = await pRetry(() => getSummary(config, text), {
      retries: 3,
      minTimeout: 5000,
      maxTimeout: 15000,
      onFailedAttempt: error => {
        console.warn(
          `[RETRY] Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left. Reason: ${error.message}`
        );
      },
    });
    return result;
  } catch (error) {
    console.error('Error during summarization:', error);
    return '';
  }
}
