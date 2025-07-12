import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  trimTextToTokenLimitJsTiktokenSentence,
  trimTextToTokenLimitDqbdTiktokenSentence,
  trimTextToTokenLimitGptJsTiktokenSentence,
  getDefaultMaxTokensForModel
} from '../tokenCount.js';

const dataPath = path.resolve(__dirname, '../../data/i-have-a-dream.txt');
const text = fs.readFileSync(dataPath, 'utf8');
const model = 'text-embedding-ada-001';
const maxTokens = getDefaultMaxTokensForModel(model);

describe('Sentence-aware token trimming functions', () => {
  it('trimTextToTokenLimitJsTiktokenSentence should trim at sentence boundary and fit token limit', () => {
    const trimmed = trimTextToTokenLimitJsTiktokenSentence(text, maxTokens);
    expect(typeof trimmed).toBe('string');
    expect(trimmed.length).toBeLessThanOrEqual(text.length);
    expect(/[.!?]$/.test(trimmed.trim())).toBe(true);
  });

  it('trimTextToTokenLimitDqbdTiktokenSentence should trim at sentence boundary and fit token limit', () => {
    const trimmed = trimTextToTokenLimitDqbdTiktokenSentence(text, maxTokens, model);
    expect(typeof trimmed).toBe('string');
    expect(trimmed.length).toBeLessThanOrEqual(text.length);
    expect(/[.!?]$/.test(trimmed.trim())).toBe(true);
  });

  it('trimTextToTokenLimitGptJsTiktokenSentence should trim at sentence boundary and fit token limit', () => {
    const trimmed = trimTextToTokenLimitGptJsTiktokenSentence(text, maxTokens, model);
    expect(typeof trimmed).toBe('string');
    expect(trimmed.length).toBeLessThanOrEqual(text.length);
    expect(/[.!?]$/.test(trimmed.trim())).toBe(true);
  });
});
