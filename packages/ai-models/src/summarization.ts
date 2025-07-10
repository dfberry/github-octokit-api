
import { createCompletionWithRetry, AzureOpenAIConfig } from './completion.js';


export function getPrompt(context: string): string {
  const prompt = `You are an expert technical writer. Summarize the following 
document in up to 5 sentences, focusing on the main purpose and key details. If the 
document contains an introduction or summary paragraph, use it to inform your 
summary, but also consider the entire content for completeness.

Document:
${context}
`;
  return prompt;
}


export async function getSummary(
  config: AzureOpenAIConfig,
  document: string
): Promise<string> {
  const userPrompt = getPrompt(document);
  const options = {
    systemPrompt: 'You are an expert technical writer.',
    userPrompt,
    maxTokens: 512,
    temperature: 0.7,
  };
  const response = await createCompletionWithRetry(config, options);
  // For ChatCompletion, the content is in response.choices[0].message.content
  return response.choices[0].message.content ?? '';
}
