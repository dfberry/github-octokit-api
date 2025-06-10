import GitHubSearcher from '../github/github-search.js';
import type { DataConfig } from '../init/initialize-with-data.js';
import fs from 'fs';
import path from 'path';

/**
 * Find additional repositories from contributor activity in last 6 months
 * @param token GitHub token for API access
 * @param dataDirectory Directory containing input data
 * @param generatedDirectory Directory for output data
 */
export default async function run(
  _token: string,
  dataDirectory: string,
  configData: DataConfig
): Promise<void> {
  try {
    console.log(
      '\n🔍 Looking for additional repositories from contributor activity...'
    );
    // 1. Get data from GitHub (find contributed repos)
    const contribRepos = await getContributorReposFromGitHub(
      _token,
      configData
    );

    // 2. Insert new repos into the known repos map
    const { allRepos, newReposFound } = insertContributorReposIntoMap(
      contribRepos,
      configData
    );

    // 3. Create and save the repo list
    await createContributorReposList(allRepos, newReposFound, dataDirectory);
  } catch (error) {
    console.error('❌ Error filtering repositories:', error);
    throw error; // Re-throw to ensure the error is handled by the caller
  }
}

async function getContributorReposFromGitHub(
  _token: string,
  configData: DataConfig
) {
  const searchCollector = new GitHubSearcher(_token);
  if (configData.microsoftContributors.length === 0) {
    throw new Error('No contributors found. Run init first.');
  }
  console.log(`Found ${configData.microsoftContributors.length} contributors`);
  const contributorHistoryLength =
    Number(process.env.CONTRIBUTOR_HISTORY_LENGTH_IN_MONTHS) || 6;
  console.log(
    `Contributor history length set to ${contributorHistoryLength} months (default is 6 months)`
  );
  const nMonthsAgo = new Date();
  nMonthsAgo.setMonth(nMonthsAgo.getMonth() - contributorHistoryLength);
  const dateString = nMonthsAgo.toISOString().split('T')[0];
  console.log(
    `\n🔍 Finding additional repositories from contributor PRs since ${dateString}...`
  );
  const contribRepos = await searchCollector.findContributedRepos(
    configData.microsoftOrgs,
    configData.microsoftContributors,
    dateString
  );
  return contribRepos;
}

function insertContributorReposIntoMap(
  contribRepos: any[],
  configData: DataConfig
) {
  // Get all known repos and create a map for quick lookup
  const knownRepos = new Map<string, { org: string; repo: string }>();
  configData.microsoftRepos.forEach(repoPath => {
    const [org, repo] = repoPath.split('/');
    knownRepos.set(repoPath, { org, repo });
  });
  console.log(`Found ${knownRepos.size} known repositories`);
  const allRepos = new Map(knownRepos);
  let newReposFound = 0;
  if (!contribRepos || contribRepos.length === 0) {
    return { allRepos, newReposFound };
  }
  for (const pr of contribRepos) {
    if (pr.repository_url) {
      try {
        const repoUrlParts = pr.repository_url.split('/');
        if (repoUrlParts.length >= 5) {
          const org = repoUrlParts[repoUrlParts.length - 2];
          const repo = repoUrlParts[repoUrlParts.length - 1];
          const repoKey = `${org}/${repo}`;
          if (
            configData.microsoftOrgs.includes(org) &&
            !knownRepos.has(repoKey)
          ) {
            allRepos.set(repoKey, { org, repo });
            newReposFound++;
          }
        }
      } catch (err) {
        console.warn(
          `⚠️ Error processing repository URL ${pr.repository_url}: ${err instanceof Error ? err.message : String(err)}`
        );
        continue;
      }
    }
  }
  return { allRepos, newReposFound };
}

async function createContributorReposList(
  allRepos: Map<string, { org: string; repo: string }>,
  newReposFound: number,
  dataDirectory: string
) {
  const reposList = Array.from(allRepos.values());
  const outputPath = path.join(dataDirectory, 'active-repos.json');
  fs.writeFileSync(outputPath, JSON.stringify(reposList, null, 2));
  console.log(
    `✅ Found ${newReposFound} new repositories from contributor activity`
  );
  console.log(`✅ Total repositories in list: ${reposList.length}`);
  console.log(`✅ Saved complete repository list to ${outputPath}`);
}
