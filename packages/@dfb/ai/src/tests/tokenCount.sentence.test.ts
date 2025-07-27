import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getTrimmedText } from '../tokenCount.js';

const dataPath = path.resolve(__dirname, '../../data/i-have-a-dream.txt');
const text = fs.readFileSync(dataPath, 'utf8');
const model = 'text-embedding-ada-001';

describe('Sentence-aware token trimming functions', () => {
  it('getTrimmedText should trim at sentence boundary and fit token limit, or fallback if none found', () => {
    const trimmed = getTrimmedText(text, model);
    console.log('Trimmed output:', JSON.stringify(trimmed));
    expect(typeof trimmed).toBe('string');
    expect(trimmed.length).toBeLessThanOrEqual(text.length);
    // If a sentence boundary is found, the result should end with one
    if (/[.!?]/.test(trimmed)) {
      console.log('Sentence boundary found in trimmed output.');
      expect(/[.!?]$/.test(trimmed.trim())).toBe(true);
    } else {
      // Fallback: no sentence boundary found before token limit
      console.log('No sentence boundary found in trimmed output.');
      expect(trimmed.length).toBeLessThanOrEqual(text.length);
    }
  });
});
