import pRetry from 'p-retry';
import { getSummary, AzureOpenAIConfig } from '@dfb/ai';

export async function summarize(
  aiConfig: AzureOpenAIConfig,
  text: string
): Promise<string> {
  if (!text || text.trim().length === 0) {
    return '';
  }
  if (
    !aiConfig.apiKey ||
    !aiConfig.endpoint ||
    !aiConfig.deployment ||
    !aiConfig.apiVersion
  ) {
    console.warn(
      'create-document-template-data:lib/summarize.ts - OpenAI configuration is missing. Please set OPENAI_API_KEY, OPENAI_ENDPOINT, OPENAI_EMBEDDING_DEPLOYMENT_NAME, and OPENAI_API_VERSION environment variables.'
    );
    return '';
  }
  try {
    const result = await pRetry(() => getSummary(aiConfig, text), {
      retries: 3,
      minTimeout: 5000,
      maxTimeout: 15000,
      onFailedAttempt: error => {
        console.warn(
          `[RETRY] create-document-template-data:lib/summarize.ts - Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left. Reason: ${error.message}`
        );
      },
    });

    console.log(
      `create-document-template-data:lib/summarize.ts - Summary result: ${result.length} characters`
    );

    return result;
  } catch (error) {
    console.error(
      'create-document-template-data:lib/summarize.ts - Error during summarization:',
      error
    );
    return '';
  }
}
