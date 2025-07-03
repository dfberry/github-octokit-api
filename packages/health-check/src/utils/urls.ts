import { OctokitSearchIssue } from '../github2/models.js';
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

export function findUniquePrRepos(
  prs: OctokitSearchIssue[]
): SimpleRepository[] {
  if (!prs || prs.length === 0) {
    return [];
  }
  // Map PRs to their repository URLs and find unique repos
  const repoUrls = prs
    .map(pr => pr.url)
    .filter((url): url is string => typeof url === 'string' && !!url);
  return findUniqueRepoUrls(repoUrls);
}
