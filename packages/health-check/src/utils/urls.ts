import DataConfig from '../config/index.js';
import { extractOrgAndRepo, SimpleRepository } from './regex.js';

export function findUniqueRepoUrls(urls: string[]): SimpleRepository[] {
  if (!urls || urls.length === 0) {
    return [];
  }
  const orgRepos = extractOrgAndRepo(urls);
  if (!orgRepos || orgRepos.length === 0) {
    throw new Error(
      'No valid organization/repository pairs found in the provided URLs.'
    );
  }
  const repoMap = new Map<string, SimpleRepository>();
  for (const { org, repo, name } of orgRepos) {
    if (org && repo) {
      const key = `${org}/${repo}`;
      if (!repoMap.has(key)) {
        repoMap.set(key, { org, repo, name });
      }
    }
  }
  return Array.from(repoMap.values());
}
export function findUniqueSimpleRepos(
  repos: SimpleRepository[]
): SimpleRepository[] {
  if (!repos || repos.length === 0) {
    return [];
  }
  const repoMap = new Map<string, SimpleRepository>();
  for (const { org, repo, name } of repos) {
    if (org && repo) {
      const key = `${org}/${repo}`;
      if (!repoMap.has(key)) {
        repoMap.set(key, { org, repo, name });
      }
    }
  }
  return Array.from(repoMap.values());
}

type OrgRepo = {
  org: string;
  repo: string;
};
export async function getUniqueReposFromIssues(
  configData: DataConfig
): Promise<SimpleRepository[]> {
  const issues = configData?.issues;

  if (!issues || issues.size === 0) {
    return [];
  }

  // get all urls from Set
  const urls = Array.from(issues).map(issue => issue.url || '');

  return findUniqueRepoUrls(urls);
}
export async function findUniquePrRepos(
  configData: DataConfig
): Promise<SimpleRepository[]> {
  const issues = configData.issues;

  if (!issues || issues.size === 0) {
    return [];
  }

  const simpleArray = Array.from(issues).map(
    ({ org, repo }) =>
      ({
        org,
        repo,
        name: `${org}/${repo} (from PRs)`,
      }) as SimpleRepository
  );

  // dedup repos
  const uniqueRepos = findUniqueSimpleRepos(simpleArray);

  return simpleArray;
}
export function extractOrgRepoFromIssueUrl(issueUrl: string): [string, string] {
  if (!issueUrl) {
    return ['', ''];
  }
  // Example URL: https://api.github.com/repos/microsoft/TypeScript/issues/12345
  const match = issueUrl.match(/repos\/([^\/]+)\/([^\/]+)\/issues\/\d+/);
  if (match && match.length === 3) {
    return [match[1], match[2]]; // [org, repo]
  }
  return ['', ''];
}
