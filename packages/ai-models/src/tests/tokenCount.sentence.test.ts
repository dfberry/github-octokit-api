import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getTrimmedText } from '../tokenCount.js';

const dataPath = path.resolve(__dirname, '../../data/i-have-a-dream.txt');
const text = fs.readFileSync(dataPath, 'utf8');
const model = 'text-embedding-ada-001';

describe('Sentence-aware token trimming functions', () => {
  it('getTrimmedText should trim at sentence boundary and fit token limit', () => {
    const trimmed = getTrimmedText(text, model);
    expect(typeof trimmed).toBe('string');
    expect(trimmed.length).toBeLessThanOrEqual(text.length);
    expect(/[.!?]$/.test(trimmed.trim())).toBe(true);
  });
});
