import { AzureOpenAI } from 'openai';

const openai = new AzureOpenAI({
  endpoint: process.env.OPENAI_ENDPOINT!,
  apiKey: process.env.OPENAI_API_KEY!,
  apiVersion: process.env.OPENAI_API_VERSION!,
  deployment: process.env.OPENAI_DEPLOYMENT_NAME!,
});

export interface CompletionOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  stop?: string[];
  model?: string;
}

export async function createCompletion({
  prompt,
  model = process.env.OPENAI_LLM_DEPLOYMENT_NAME!,
}: CompletionOptions): Promise<{ completion: string; usage: any }> {
  try {
    const response = await openai.completions.create({
      model,
      prompt
    });

    if (response.choices && response.choices.length > 0) {
      return {
        completion: response.choices[0].text,
        usage: response.usage,
      };
    } else {
      throw new Error('No completion returned');
    }
  } catch (error) {
    console.error('Error creating completion:', error);
    throw error;
  }
}

// Add logic to handle errors and retry with a shorter prompt
export async function createCompletionWithRetry(options: CompletionOptions): Promise<{ completion: string; usage: any }> {
  try {
    return await createCompletion(options);
  } catch (error) {
    if (error instanceof Error && error.message.includes('maximum context length')) {
      // Try with a shorter prompt (take first half)
      const shorterPrompt = options.prompt.slice(0, Math.floor(options.prompt.length / 2));
      try {
        console.log('Retrying with shorter prompt.');
        return await createCompletion({ ...options, prompt: shorterPrompt });
      } catch (retryError) {
        console.error('Error creating completion after retry:', retryError);
        throw retryError;
      }
    } else {
      throw error;
    }
  }
}
