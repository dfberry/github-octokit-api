import { encoding_for_model } from '@dqbd/tiktoken';
import { Tiktoken } from 'js-tiktoken/lite';
import cl100k_base from 'js-tiktoken/ranks/cl100k_base';

/**
 * Trims the input text to fit within a maximum token count using js-tiktoken's cl100k_base encoding.
 * Trims from the end (keeps the start of the text), and takes an extra 10% off the end.
 * @param text The input string to trim.
 * @param maxTokens The maximum number of tokens allowed.
 * @returns The trimmed text, guaranteed not to exceed (maxTokens * 0.9) tokens.
 */
export function trimTextToTokenLimit(text: string, maxTokens: number): string {
  const enc = new Tiktoken(cl100k_base);
  const tokens = enc.encode(text);
  const allowed = Math.floor(maxTokens * 0.9);
  if (tokens.length <= allowed) return text;
  const trimmed = enc.decode(tokens.slice(0, allowed));
  return trimmed;
}

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
  'text-embedding-ada-001': 'cl100k_base',
  'text-embedding-ada-002': 'cl100k_base',
  'text-embedding-ada-003': 'cl100k_base',
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

/**
 * Trims the input text to fit within a maximum token count using @dqbd/tiktoken for a given model.
 * Trims from the end (keeps the start of the text), and takes an extra 10% off the end.
 * @param text The input string to trim.
 * @param maxTokens The maximum number of tokens allowed.
 * @param model The model name (e.g., 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo').
 * @returns The trimmed text, guaranteed not to exceed (maxTokens * 0.9) tokens.
 */
export function trimTextToTokenLimitTiktoken(text: string, maxTokens: number, model: string = 'gpt-4o'): string {
  // Map unsupported models to a supported one for @dqbd/tiktoken
  let tiktokenModel = model;
  if (model === 'text-embedding-ada-001') {
    tiktokenModel = 'text-embedding-ada-002';
  }
  const enc = encoding_for_model(tiktokenModel as unknown as any); // tiktoken expects a TiktokenModel type
  const tokens = enc.encode(text);
  const allowed = Math.floor(maxTokens * 0.9);
  if (tokens.length <= allowed) {
    enc.free();
    return text;
  }
  const trimmedBytes = enc.decode(tokens.slice(0, allowed));
  enc.free();
  return new TextDecoder().decode(trimmedBytes);
}

/**
 * Trims the input text to fit within a maximum token count using countGptTokens (js-tiktoken for mapped models).
 * Trims from the end (keeps the start of the text), and takes an extra 10% off the end.
 * @param text The input string to trim.
 * @param maxTokens The maximum number of tokens allowed.
 * @param model The model name (e.g., 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo').
 * @returns The trimmed text, guaranteed not to exceed (maxTokens * 0.9) tokens.
 */
export function trimTextToTokenLimitGpt(text: string, maxTokens: number, model: string): string {
  const encodingName = modelToEncoding[model] || 'cl100k_base';
  const allowed = Math.floor(maxTokens * 0.9);
  if (encodingName === 'cl100k_base') {
    const enc = new Tiktoken(cl100k_base);
    const tokens = enc.encode(text);
    if (tokens.length <= allowed) return text;
    const trimmed = enc.decode(tokens.slice(0, allowed));
    return trimmed;
  }
  throw new Error(`Encoding not supported: ${encodingName}`);
}

/**
 * Returns the maximum text length (in characters) that fits within a given token limit for a model.
 * This is an estimate, as tokenization is not 1:1 with characters.
 * @param text The input string to check.
 * @param maxTokens The maximum number of tokens allowed.
 * @param model The model name (e.g., 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo').
 * @returns The length in characters of the largest substring of text that fits within maxTokens tokens for the model.
 */
export function getMaxTextLengthForTokensTiktoken(text: string, maxTokens: number, model: string = 'gpt-4o'): number {
  const enc = encoding_for_model(model as unknown as any);
  const tokens = enc.encode(text);
  if (tokens.length <= maxTokens) {
    enc.free();
    return text.length;
  }
  // Find the largest substring that fits
  let end = text.length;
  let start = 0;
  let result = 0;
  while (start < end) {
    const mid = Math.floor((start + end + 1) / 2);
    const subTokens = enc.encode(text.slice(0, mid));
    if (subTokens.length <= maxTokens) {
      result = mid;
      start = mid;
    } else {
      end = mid - 1;
    }
  }
  enc.free();
  return result;
}

/**
 * Returns the maximum text length (in characters) that fits within a given token limit for a model using js-tiktoken.
 * This is an estimate, as tokenization is not 1:1 with characters.
 * @param text The input string to check.
 * @param maxTokens The maximum number of tokens allowed.
 * @param model The model name (e.g., 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo').
 * @returns The length in characters of the largest substring of text that fits within maxTokens tokens for the model.
 */
export function getMaxTextLengthForTokensGpt(text: string, maxTokens: number, model: string): number {
  const encodingName = modelToEncoding[model] || 'cl100k_base';
  if (encodingName === 'cl100k_base') {
    const enc = new Tiktoken(cl100k_base);
    if (enc.encode(text).length <= maxTokens) return text.length;
    // Binary search for max substring
    let end = text.length;
    let start = 0;
    let result = 0;
    while (start < end) {
      const mid = Math.floor((start + end + 1) / 2);
      const subTokens = enc.encode(text.slice(0, mid));
      if (subTokens.length <= maxTokens) {
        result = mid;
        start = mid;
      } else {
        end = mid - 1;
      }
    }
    return result;
  }
  throw new Error(`Encoding not supported: ${encodingName}`);
}

/**
 * Returns the default max tokens for a given model name.
 * @param model The model name (e.g., 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo').
 * @returns The default max tokens for the model.
 */
export function getDefaultMaxTokensForModel(model: string): number {
  // These are common defaults; adjust as needed for your use case
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
 * Trims the input text to fit within the default max token count for the given model using js-tiktoken's cl100k_base encoding.
 * Trims from the end (keeps the start of the text), and takes an extra 10% off the end.
 * @param text The input string to trim.
 * @param model The model name.
 * @returns The trimmed text.
 */
export function trimTextToModelLimitJsTiktoken(text: string, model: string): string {
  const maxTokens = getDefaultMaxTokensForModel(model);
  return trimTextToTokenLimit(text, maxTokens);
}

/**
 * Trims the input text to fit within the default max token count for the given model using @dqbd/tiktoken.
 * Trims from the end (keeps the start of the text), and takes an extra 10% off the end.
 * @param text The input string to trim.
 * @param model The model name.
 * @returns The trimmed text.
 */
export function trimTextToModelLimitDqbdTiktoken(text: string, model: string): string {
  const maxTokens = getDefaultMaxTokensForModel(model);
  return trimTextToTokenLimitTiktoken(text, maxTokens, model);
}

/**
 * Trims the input text to fit within the default max token count for the given model using js-tiktoken for mapped models.
 * Trims from the end (keeps the start of the text), and takes an extra 10% off the end.
 * @param text The input string to trim.
 * @param model The model name.
 * @returns The trimmed text.
 */
export function trimTextToModelLimitGptJsTiktoken(text: string, model: string): string {
  const maxTokens = getDefaultMaxTokensForModel(model);
  return trimTextToTokenLimitGpt(text, maxTokens, model);
}

/**
 * Trims text to fit within a token limit (with 10% margin) using js-tiktoken, stopping at the last sentence boundary before the limit.
 * @param text The input string to trim.
 * @param maxTokens The maximum number of tokens allowed.
 * @returns The trimmed text, ending at a sentence boundary, within (maxTokens * 0.9) tokens.
 */
export function trimTextToTokenLimitJsTiktokenSentence(text: string, maxTokens: number): string {
  const enc = new Tiktoken(cl100k_base);
  const tokens = enc.encode(text);
  const allowed = Math.floor(maxTokens * 0.9);
  if (tokens.length <= allowed) return text;
  // Find the last sentence boundary before the allowed token count
  // Try progressively shorter substrings ending at sentence boundaries
  const sentenceEndRegex = /([.!?])(?=\s|$)/g;
  let lastBoundary = 0;
  let match;
  while ((match = sentenceEndRegex.exec(text)) !== null) {
    lastBoundary = match.index + 1;
    const subTokens = enc.encode(text.slice(0, lastBoundary));
    if (subTokens.length > allowed) break;
  }
  if (lastBoundary === 0) {
    // No sentence boundary found, fallback to token slice
    const trimmed = enc.decode(tokens.slice(0, allowed));
    return typeof trimmed === 'string' ? trimmed : new TextDecoder().decode(trimmed);
  }
  return text.slice(0, lastBoundary).trim();
}

/**
 * Trims text to fit within a token limit (with 10% margin) using @dqbd/tiktoken, stopping at the last sentence boundary before the limit.
 * @param text The input string to trim.
 * @param maxTokens The maximum number of tokens allowed.
 * @param model The model name.
 * @returns The trimmed text, ending at a sentence boundary, within (maxTokens * 0.9) tokens.
 */
export function trimTextToTokenLimitDqbdTiktokenSentence(text: string, maxTokens: number, model: string = 'gpt-4o'): string {
  // Map unsupported models to a supported one for @dqbd/tiktoken
  let tiktokenModel = model;
  if (model === 'text-embedding-ada-001') {
    tiktokenModel = 'text-embedding-ada-002';
  }
  const enc = encoding_for_model(tiktokenModel as unknown as any);
  const tokens = enc.encode(text);
  const allowed = Math.floor(maxTokens * 0.9);
  if (tokens.length <= allowed) {
    enc.free();
    return text;
  }
  const sentenceEndRegex = /([.!?])(?=\s|$)/g;
  let lastBoundary = 0;
  let match;
  while ((match = sentenceEndRegex.exec(text)) !== null) {
    lastBoundary = match.index + 1;
    const subTokens = enc.encode(text.slice(0, lastBoundary));
    if (subTokens.length > allowed) break;
  }
  let result;
  if (lastBoundary === 0) {
    const trimmedBytes = enc.decode(tokens.slice(0, allowed));
    result = new TextDecoder().decode(trimmedBytes);
  } else {
    result = text.slice(0, lastBoundary).trim();
  }
  enc.free();
  return result;
}

/**
 * Trims text to fit within a token limit (with 10% margin) using js-tiktoken for mapped models, stopping at the last sentence boundary before the limit.
 * @param text The input string to trim.
 * @param maxTokens The maximum number of tokens allowed.
 * @param model The model name.
 * @returns The trimmed text, ending at a sentence boundary, within (maxTokens * 0.9) tokens.
 */
export function trimTextToTokenLimitGptJsTiktokenSentence(text: string, maxTokens: number, model: string): string {
  const encodingName = modelToEncoding[model] || 'cl100k_base';
  const allowed = Math.floor(maxTokens * 0.9);
  if (encodingName === 'cl100k_base') {
    const enc = new Tiktoken(cl100k_base);
    const tokens = enc.encode(text);
    if (tokens.length <= allowed) return text;
    const sentenceEndRegex = /([.!?])(?=\s|$)/g;
    let lastBoundary = 0;
    let match;
    while ((match = sentenceEndRegex.exec(text)) !== null) {
      lastBoundary = match.index + 1;
      const subTokens = enc.encode(text.slice(0, lastBoundary));
      if (subTokens.length > allowed) break;
    }
    if (lastBoundary === 0) {
      const trimmed = enc.decode(tokens.slice(0, allowed));
      return typeof trimmed === 'string' ? trimmed : new TextDecoder().decode(trimmed);
    }
    return text.slice(0, lastBoundary).trim();
  }
  throw new Error(`Encoding not supported: ${encodingName}`);
}
