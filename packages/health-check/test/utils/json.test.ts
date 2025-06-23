import { describe, it, expect } from 'vitest';
import { flattenObjectValues } from '../../src/utils/json.js';

describe('flattenObjectValues', () => {
  it('should flatten values of the specified property into a string array', () => {
    const exampleObj = {
      user1: { name: 'John', age: 30 },
      user2: { name: 'Jane', age: 25 },
      user3: { name: 'Doe', age: null },
    };

    const result = flattenObjectValues(exampleObj, 'name');
    expect(result).toBe('[John, Jane, Doe]');
  });

  it('should handle missing properties gracefully', () => {
    const exampleObj = {
      user1: { name: 'John', age: 30 },
      user2: { name: 'Jane' },
      user3: { name: 'Doe', age: null },
    };

    const result = flattenObjectValues(exampleObj, 'age');
    expect(result).toBe('[30, , ]');
  });

  it('should return an empty array string for invalid input', () => {
    const invalidInput = null;
    const result = flattenObjectValues(invalidInput as any, 'name');
    expect(result).toBe('[]');
  });

  it('should throw an error for invalid property name', () => {
    const exampleObj = {
      user1: { name: 'John', age: 30 },
      user2: { name: 'Jane', age: 25 },
    };

    const result = flattenObjectValues(exampleObj, '');
    expect(result).toBe('[]');
  });

  it('should handle non-string values gracefully', () => {
    const exampleObj = {
      user1: { name: 'John', age: 30 },
      user2: { name: 'Jane', age: 25 },
      user3: { name: 'Doe', age: true },
    };

    const result = flattenObjectValues(exampleObj, 'age');
    expect(result).toBe('[30, 25, true]');
  });
});