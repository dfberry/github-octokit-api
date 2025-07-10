// ...existing code...
import { encoding_for_model } from '@dqbd/tiktoken';
import { Tiktoken } from 'js-tiktoken/lite';
import cl100k_base from 'js-tiktoken/ranks/cl100k_base';

// Map model names to encodings based on https://github.com/niieani/gpt-tokenizer/blob/HEAD/src/models.ts
const modelToEncoding: Record<string, string> = {
  // GPT-4o, GPT-4, GPT-3.5-turbo, etc.
  'gpt-4o': 'cl100k_base',
  'gpt-4': 'cl100k_base',
  'gpt-4-32k': 'cl100k_base',
  'gpt-4-1106-preview': 'cl100k_base',
  'gpt-4-0125-preview': 'cl100k_base',
  'gpt-4-0613': 'cl100k_base',
  'gpt-4-32k-0613': 'cl100k_base',
  'gpt-3.5-turbo': 'cl100k_base',
  'gpt-3.5-turbo-16k': 'cl100k_base',
  'gpt-3.5-turbo-0613': 'cl100k_base',
  'gpt-3.5-turbo-16k-0613': 'cl100k_base',
  'text-embedding-ada-002': 'cl100k_base',
  // Add more mappings as needed
};

/**
 * Counts the number of tokens in a string for a given OpenAI model (using js-tiktoken for cl100k_base models).
 * @param text The input string to tokenize.
 * @param model The model name (e.g., 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo').
 * @returns The number of tokens.
 */
export function countGptTokens(text: string, model: string): number {
  // For now, all mapped models use cl100k_base, so use js-tiktoken for speed and compatibility
  const encodingName = modelToEncoding[model] || 'cl100k_base';
  if (encodingName === 'cl100k_base') {
    const enc = new Tiktoken(cl100k_base);
    const tokens = enc.encode(text);
    return tokens.length;
  }
  // If you add more encodings, handle them here
  throw new Error(`Encoding not supported: ${encodingName}`);
}

/**
 * Counts the number of tokens in a string for a given OpenAI model using @dqbd/tiktoken.
 * @param text The input string to tokenize.
 * @param model The model name (e.g., 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo').
 * @returns The number of tokens.
 */
export function countTokensTiktoken(text: string, model: string = 'gpt-4o'): number {
  // encoding_for_model expects a TiktokenModel type, so cast if you are sure
  const enc = encoding_for_model(model as any);
  const tokens = enc.encode(text);
  enc.free();
  return tokens.length;
}

/**
 * Counts the number of tokens in a string using js-tiktoken's cl100k_base encoding.
 * @param text The input string to tokenize.
 * @returns The number of tokens.
 */
export function countTokensJsTiktoken(text: string): number {
  const enc = new Tiktoken(cl100k_base);
  const tokens = enc.encode(text);
  // No free() needed for js-tiktoken
  return tokens.length;
}
