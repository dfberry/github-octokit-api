import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  trimTextToTokenLimit,
  trimTextToTokenLimitTiktoken,
  trimTextToTokenLimitGpt,
  getDefaultMaxTokensForModel
} from '../tokenCount.js';

const dataPath = path.resolve(__dirname, '../../data/i-have-a-dream.txt');
const text = fs.readFileSync(dataPath, 'utf8');
const model = 'text-embedding-ada-001';
const maxTokens = getDefaultMaxTokensForModel(model);

describe('Token trimming functions (non-sentence-aware)', () => {
  it('trimTextToTokenLimit (js-tiktoken) returns trim info object', () => {
    const result = trimTextToTokenLimit(text, maxTokens);
    expect(result).toHaveProperty('trimmedText');
    expect(result).toHaveProperty('wasTrimmed');
    expect(result).toHaveProperty('tokensTrimmed');
    expect(typeof result.trimmedText).toBe('string');
    expect(typeof result.wasTrimmed).toBe('boolean');
    expect(typeof result.tokensTrimmed).toBe('number');
    if (result.wasTrimmed) {
      expect(result.trimmedText.length).toBeLessThan(text.length);
      expect(result.tokensTrimmed).toBeGreaterThan(0);
    } else {
      expect(result.tokensTrimmed).toBe(0);
    }
  });

  it('trimTextToTokenLimitTiktoken (@dqbd/tiktoken) returns trim info object', () => {
    const tiktokenModel = model === 'text-embedding-ada-001' ? 'text-embedding-ada-002' : model;
    const result = trimTextToTokenLimitTiktoken(text, maxTokens, tiktokenModel);
    expect(result).toHaveProperty('trimmedText');
    expect(result).toHaveProperty('wasTrimmed');
    expect(result).toHaveProperty('tokensTrimmed');
    expect(typeof result.trimmedText).toBe('string');
    expect(typeof result.wasTrimmed).toBe('boolean');
    expect(typeof result.tokensTrimmed).toBe('number');
    if (result.wasTrimmed) {
      expect(result.trimmedText.length).toBeLessThan(text.length);
      expect(result.tokensTrimmed).toBeGreaterThan(0);
    } else {
      expect(result.tokensTrimmed).toBe(0);
    }
  });

  it('trimTextToTokenLimitGpt (js-tiktoken mapped) returns trim info object', () => {
    const result = trimTextToTokenLimitGpt(text, maxTokens, model);
    expect(result).toHaveProperty('trimmedText');
    expect(result).toHaveProperty('wasTrimmed');
    expect(result).toHaveProperty('tokensTrimmed');
    expect(typeof result.trimmedText).toBe('string');
    expect(typeof result.wasTrimmed).toBe('boolean');
    expect(typeof result.tokensTrimmed).toBe('number');
    if (result.wasTrimmed) {
      expect(result.trimmedText.length).toBeLessThan(text.length);
      expect(result.tokensTrimmed).toBeGreaterThan(0);
    } else {
      expect(result.tokensTrimmed).toBe(0);
    }
  });
});
