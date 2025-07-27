
import { Tiktoken } from 'js-tiktoken/lite';
import cl100k_base from 'js-tiktoken/ranks/cl100k_base';


// (modelToEncoding removed; all models use cl100k_base)

/**
 * Returns the default max tokens for a given model name.
 * @param model The model name (e.g., 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo').
 * @returns The default max tokens for the model.
 */
export function getMaxTokens(model: string): number {
  switch (model) {
    case 'gpt-4o':
    case 'gpt-4':
    case 'gpt-4-0613':
    case 'gpt-4-32k':
    case 'gpt-4-32k-0613':
    case 'gpt-4-1106-preview':
    case 'gpt-4-0125-preview':
      return 128000;
    case 'gpt-3.5-turbo-16k':
    case 'gpt-3.5-turbo-16k-0613':
      return 16384;
    case 'gpt-3.5-turbo':
    case 'gpt-3.5-turbo-0613':
      return 4096;
    case 'text-embedding-ada-002':
    case 'text-embedding-ada-003':
      return 8191;
    case 'text-embedding-ada-001':
      return 2048;
    default:
      return 4096; // Reasonable fallback
  }
}

/**
 * Counts the number of tokens in a string using js-tiktoken (cl100k_base encoding).
 * @param text The input string to tokenize.
 * @returns The number of tokens.
 */
export function countTokens(text: string): number {
  const enc = new Tiktoken(cl100k_base);
  const tokens = enc.encode(text);
  return tokens.length;
}

/**
 * Trims the input text to fit within the model's token limit, trimming at the last sentence boundary before the limit.
 * @param text The input string to trim.
 * @param model The model name (e.g., 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo').
 * @returns The trimmed text (at a sentence boundary, from the back, within the model's token limit).
 */
export function getTrimmedText(text: string, model: string): string {
  const maxTokens = getMaxTokens(model);
  const enc = new Tiktoken(cl100k_base);
  const tokens = enc.encode(text);
  if (tokens.length <= maxTokens) {
    // If the original text is within the token limit, ensure it ends at a sentence boundary if possible
    const sentenceEndRegex = /([.!?])(?=\s|$)/g;
    let lastBoundary = 0;
    let match;
    while ((match = sentenceEndRegex.exec(text)) !== null) {
      lastBoundary = match.index + 1;
    }
    if (lastBoundary > 0) {
      return text.slice(0, lastBoundary).trim();
    }
    return text;
  }
  // Find the last sentence boundary before the allowed token count
  let lastBoundary = 0;
  let match;
  const sentenceEndRegex = /([.!?])(?=\s|$)/g;
  while ((match = sentenceEndRegex.exec(text)) !== null) {
    const boundary = match.index + 1;
    if (enc.encode(text.slice(0, boundary)).length > maxTokens) break;
    lastBoundary = boundary;
  }
  if (lastBoundary > 0) {
    // Always return up to the last sentence boundary found
    return text.slice(0, lastBoundary).trim();
  }
  // No sentence boundary found, fallback to token slice
  const trimmed = enc.decode(tokens.slice(0, maxTokens));
  return typeof trimmed === 'string' ? trimmed : new TextDecoder().decode(trimmed);
}
