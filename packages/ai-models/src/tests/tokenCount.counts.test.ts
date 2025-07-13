import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { countTokens } from '../tokenCount.js';

const dataPath = path.resolve(__dirname, '../../data/i-have-a-dream.txt');
const text = fs.readFileSync(dataPath, 'utf8');

describe('Token counting functions', () => {
  it('countTokens returns a token count for the text', () => {
    const count = countTokens(text);
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThan(0);
    console.log('countTokens:', count);
  });
});
