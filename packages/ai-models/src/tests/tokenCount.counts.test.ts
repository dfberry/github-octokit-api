import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  countGptTokens,
  countTokensTiktoken,
  countTokensJsTiktoken
} from '../tokenCount.js';

const dataPath = path.resolve(__dirname, '../../data/i-have-a-dream.txt');
const text = fs.readFileSync(dataPath, 'utf8');
const model = 'text-embedding-ada-001';

describe('Token counting functions', () => {
  it('countGptTokens (js-tiktoken mapped) returns a token count', () => {
    const count = countGptTokens(text, model);
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThan(0);
    console.log('countGptTokens:', count);
  });

  it('countTokensTiktoken (@dqbd/tiktoken) returns a token count', () => {
    // Map unsupported model for @dqbd/tiktoken
    const tiktokenModel = model === 'text-embedding-ada-001' ? 'text-embedding-ada-002' : model;
    const count = countTokensTiktoken(text, tiktokenModel);
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThan(0);
    console.log('countTokensTiktoken:', count);
  });

  it('countTokensJsTiktoken (js-tiktoken cl100k_base) returns a token count', () => {
    const count = countTokensJsTiktoken(text);
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThan(0);
    console.log('countTokensJsTiktoken:', count);
  });
});
