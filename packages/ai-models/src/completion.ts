import { AzureOpenAI } from 'openai';
import type { AzureClientOptions } from 'openai/azure';
import type { ChatCompletionCreateParamsNonStreaming, ChatCompletion } from 'openai/resources/chat/completions';


// Use AzureClientOptions from openai/azure
export type AzureOpenAIConfig = AzureClientOptions;


export type CompletionOptions = {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  stop?: string[];
};

export async function createCompletion(
  config: AzureOpenAIConfig,
  options: CompletionOptions
): Promise<ChatCompletion> {
  const { systemPrompt, userPrompt, maxTokens, temperature, stop } = options;
  const openai = new AzureOpenAI(config);
  try {
    const params: ChatCompletionCreateParamsNonStreaming = {
      model: config.deployment!,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
      stop,
    };
    return openai.chat.completions.create(params);
    
  } catch (error) {
    console.error('Error creating completion:', error);
    throw error;
  }
}

// Add logic to handle errors and retry with a shorter prompt
export async function createCompletionWithRetry(
  config: AzureOpenAIConfig,
  options: CompletionOptions
): Promise<ChatCompletion> {
  let lastError: unknown = null;
  let currentOptions = { ...options };
  // Backoff times in ms: 5s, 10s, 15s
  const backoffTimes = [5000, 10000, 15000];
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await createCompletion(config, currentOptions);
    } catch (error: any) {
      lastError = error;
      // Check for retryable errors (rate limit, context length, network, 5xx, etc)
      const message = error instanceof Error ? error.message : String(error);
      const isRetryable =
        message.includes('maximum context length') ||
        message.includes('Rate limit') ||
        message.includes('429') ||
        message.includes('timeout') ||
        message.includes('ECONNRESET') ||
        message.includes('503') ||
        message.includes('500') ||
        message.includes('temporarily unavailable');
      if (!isRetryable) {
        throw error;
      }
      // For context length errors, try with a shorter userPrompt
      if (message.includes('maximum context length') && currentOptions.userPrompt.length > 20) {
        currentOptions = {
          ...currentOptions,
          userPrompt: currentOptions.userPrompt.slice(0, Math.floor(currentOptions.userPrompt.length / 2)),
        };
        console.warn(`[RETRY] Attempt ${attempt}: Reducing userPrompt length and retrying...`);
      } else {
        // Fixed backoff for other retryable errors
        const backoff = backoffTimes[attempt - 1];
        console.warn(`[RETRY] Attempt ${attempt}: Retrying after ${backoff / 1000}s due to error: ${message}`);
        await new Promise((res) => setTimeout(res, backoff));
      }
    }
  }
  throw lastError;
}
