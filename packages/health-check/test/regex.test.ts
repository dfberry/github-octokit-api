import { describe, it, expect } from 'vitest';
import { extractOrgAndRepo } from '../src/utils/regex.js';

describe('extractOrgAndRepo', () => {
  it('should extract org and repo from org/repo', () => {
    const input = ['diberry/myrepo'];
    const result = extractOrgAndRepo(input);
    expect(result[0].org).toBe('diberry');
    expect(result[0].repo).toBe('myrepo');
  });

  it('should extract org and repo from full GitHub URL with subdir/file', () => {
    const input = ['https://github.com/diberry/myrepo/mysubdir/myfile.md'];
    const result = extractOrgAndRepo(input);
    expect(result[0].org).toBe('diberry');
    expect(result[0].repo).toBe('myrepo');
  });
});
