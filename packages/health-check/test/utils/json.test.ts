import { describe, it, expect } from 'vitest';
import { flattenObjectValues } from '../../src/utils/json.js';

describe('flattenObjectValues', () => {
  it('should flatten values of the specified property into a string array', () => {
    const exampleObj = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
      { name: 'Doe', age: null },
    ];
    const result = flattenObjectValues(exampleObj, 'name');
    expect(result).toEqual(['John', 'Jane', 'Doe']);
  });

  it('should handle missing properties gracefully', () => {
    const exampleObj = [
      { name: 'John', age: 30 },
      { name: 'Jane' },
      { name: 'Doe', age: null },
    ];
    const result = flattenObjectValues(exampleObj, 'age', true);
    expect(result).toEqual(['30', '', '']);
  });

  it('should return an empty array for invalid input', () => {
    const invalidInput = null;
    const result = flattenObjectValues(invalidInput as any, 'name');
    expect(result).toEqual([]);
  });

  it('should return an empty array for invalid property name', () => {
    const exampleObj = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
    ];
    const result = flattenObjectValues(exampleObj, '');
    expect(result).toEqual([]);
  });

  it('should handle non-string values gracefully', () => {
    const exampleObj = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
      { name: 'Doe', age: true },
    ];
    const result = flattenObjectValues(exampleObj, 'age');
    expect(result).toEqual(['30', '25', 'true']);
  });
});