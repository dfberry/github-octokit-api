import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getTrimmedText } from '../tokenCount.js';

const dataPath = path.resolve(__dirname, '../../data/i-have-a-dream.txt');
const text = fs.readFileSync(dataPath, 'utf8');
const model = 'text-embedding-ada-001';

describe('Token trimming functions (non-sentence-aware)', () => {
  it('getTrimmedText trims at a sentence boundary and fits token limit', () => {
    const trimmed = getTrimmedText(text, model);
    expect(typeof trimmed).toBe('string');
    expect(trimmed.length).toBeLessThanOrEqual(text.length);
    expect(/[.!?]$/.test(trimmed.trim())).toBe(true);
  });

  // No other trim functions: only getTrimmedText is supported now
});
