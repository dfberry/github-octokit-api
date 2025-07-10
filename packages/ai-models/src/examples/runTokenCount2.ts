import { countGptTokens, countTokensTiktoken, countTokensJsTiktoken } from '../tokenCount.js';
import dotenv from 'dotenv';
dotenv.config();

const model = process.env.OPENAI_LLM_DEPLOYMENT_NAME || 'gpt-4o';
const text = process.argv[2] || 'hello world';

console.log(`Model: ${model}`);
console.log(`Text: ${text}`);

// Using gpt-tokenizer (if implemented)
try {
  const count = countGptTokens(text, model);
  console.log(`[gpt-tokenizer] Token count: ${count}`);
} catch (e) {
  if (e instanceof Error) {
    console.log('[gpt-tokenizer] Not implemented or failed:', e.message);
  } else {
    console.log('[gpt-tokenizer] Not implemented or failed:', e);
  }
}

// Using @dqbd/tiktoken
try {
  const count = countTokensTiktoken(text, model);
  console.log(`[tiktoken] Token count: ${count}`);
} catch (e) {
  if (e instanceof Error) {
    console.log('[tiktoken] Not implemented or failed:', e.message);
  } else {
    console.log('[tiktoken] Not implemented or failed:', e);
  }
}

// Using js-tiktoken
try {
  const count = countTokensJsTiktoken(text);
  console.log(`[js-tiktoken] Token count: ${count}`);
} catch (e) {
  if (e instanceof Error) {
    console.log('[js-tiktoken] Not implemented or failed:', e.message);
  } else {
    console.log('[js-tiktoken] Not implemented or failed:', e);
  }
}
