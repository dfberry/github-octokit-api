import { SimpleRepository, extractOrgAndRepo } from './regex.js';
/**
 * Given an array of OctokitSearchIssue, return an array of unique active SimpleRepository objects.
 */

export const convertIssueToSimpleRepo = (issue: any): SimpleRepository => {
  const defaultValue: SimpleRepository = {
    name: '',
    org: '',
    repo: '',
  };

  if (!issue || !issue.url) {
    return defaultValue;
  }

  // Always treat issue.url as a string here
  const [result] = extractOrgAndRepo([issue.url]);
  if (!result) {
    return defaultValue;
  }

  return {
    name: issue.url || '',
    org: result.org,
    repo: result.repo,
  };
};
