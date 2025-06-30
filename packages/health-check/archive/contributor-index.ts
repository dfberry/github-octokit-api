// @ts-nocheck
import GitHubContributor from '../../archive/github/github-contributor.js';
import type { DataConfig } from '../init/initialize-with-data.js';
import {
  ContributorData,
  PrSearchItemWithDates,
  ContributorRepo,
} from '../models.js';
import { DbService } from '../typeorm/db-service.js';
import { extractOrgAndRepoFromFullName } from '../utils/regex.js';

/**
 * Generate a contributor index report
 * @param token GitHub API token
 * @param dataDirectory Directory containing configuration data
 * @param generatedDirectory Directory to save generated reports
 * @param configData Configuration data for contributors
 */
export default async function run(
  _token: string,
  generatedDirectory: string,
  configData: DataConfig
): Promise<void> {
  try {
    console.log(
      `\n\n🔍 ---------------------------------------\nContributor index `
    );

    // 1. Get data from GitHub
    const contributorDataList = await getContributorDataFromGitHub(
      _token,
      configData
    );

    // Deduplicate contributors by login
    const seenLogins = new Set<string>();
    const uniqueContributors = contributorDataList.filter(c => {
      if (!c.login) return false;
      if (seenLogins.has(c.login)) return false;
      seenLogins.add(c.login);
      return true;
    });
    console.log(
      '[TypeORM] Unique contributors to insert:',
      uniqueContributors.map(c => c.login)
    );

    // 2. Insert into database (TypeORM)
    let savedCount = 0;
    await DbService.init();
    for (const contributorData of uniqueContributors) {
      console.log(
        `\nProcessing contributor: ${contributorData.login} (${contributorData.name})`
      );

      // Insert contributor
      await DbService.insertContributor({
        id: contributorData.login,
        avatar_url: contributorData.avatarUrl || '',
        name: contributorData.name,
        company: contributorData.company,
        blog: contributorData.blog,
        location: contributorData.location,
        bio: contributorData.bio,
        twitter: contributorData.twitter,
        followers: contributorData.followers,
        following: contributorData.following,
        public_repos: contributorData.publicRepos,
        public_gists: contributorData.publicGists,
        // add more fields as needed
      });
      // Insert issues and PRs for this contributor
      const issues: PrSearchItemWithDates[] = [];
      const prs: PrSearchItemWithDates[] = [];
      if (Array.isArray(contributorData.recentPRs)) {
        for (const pr of contributorData.recentPRs) {
          if (pr.pull_request) prs.push(pr);
          else issues.push(pr);
        }
      }
      for (const issue of issues) {
        console.log(
          `Inserting issue for contributor ${contributorData.login}: ${issue.title}`
        );

        const { org, repo } = extractOrgAndRepoFromFullName(issue.url);

        await DbService.insertContributorIssuePr({
          id: issue.id.toString(),
          username: contributorData.login,
          org: org,
          repo: repo,
          url: issue.url,
          type: 'issue',
          number: issue.number,
          title: issue.title,
          state: issue.state,
          created_at: issue.createdAt || issue.created_at || '',
          closed_at: issue.closedAt || issue.closed_at || '',
          merged_at: issue.mergedAt || '',
          merged: issue.merged || false,
        });
      }
      for (const pr of prs) {
        console.log(`Inserting issue for contributor ${contributorData.login}`);

        const { org, repo } = extractOrgAndRepoFromFullName(pr.url);

        await DbService.insertContributorIssuePr({
          id: pr.id.toString(),
          username: contributorData.login,
          org: org,
          repo: repo,
          url: pr.url,
          type: 'pr',
          number: pr.number,
          title: pr.title,
          state: pr.state,
          created_at: pr.createdAt || pr.created_at || '',
          closed_at: pr.closedAt || pr.closed_at || '',
          merged_at: pr.mergedAt || '',
          merged: pr.merged || false,
        });
      }
      // Insert unique contributed repos for this contributor
      const contributedRepos: ContributorRepo[] = Array.isArray(
        contributorData.repos
      )
        ? contributorData.repos
        : [];
      for (const repoObj of contributedRepos) {
        const { org, repo } = extractOrgAndRepoFromFullName(repoObj.url);

        console.log(
          `Inserting contributed repo for contributor ${contributorData.login}: ${org}/${repo}`
        );
        if (!repoObj.id)
          throw new Error(
            `Repository ID is required for ${org}/${repo}. Please check the data source.`
          );

        await DbService.insertRepository({
          id: repoObj.id?.toString(),
          name: repoObj.name || '',
          nameWithOwner: repoObj.nameWithOwner || '',
          url: repoObj.url || '',
          description: repoObj.description || '',
          stargazerCount: repoObj.stargazerCount || 0,
          forkCount: repoObj.forkCount || 0,
          isPrivate: repoObj.isPrivate ?? false,
          isFork: repoObj.isFork ?? false,
          isArchived: repoObj.isArchived ?? false,
          isDisabled: repoObj.isDisabled ?? false,
          primaryLanguage: repoObj?.primaryLanguage?.name || null,
          licenseInfo: repoObj?.licenseInfo?.name || null,
          diskUsage: repoObj.diskUsage || 0,
          createdAt: repoObj.createdAt || '',
          updatedAt: repoObj.updatedAt || '',
          pushedAt: repoObj.pushedAt || '',
          owner: repoObj?.owner?.login || null,
          watchersCount: repoObj.watchers?.totalCount || 0,
          issuesCount: repoObj.issues?.totalCount || 0,
          pullRequestsCount: repoObj.pullRequests?.totalCount || 0,
          topics: repoObj?.topics?.nodes
            ? repoObj.topics.nodes
                .map((node: any) => node.topic.name)
                .join(', ')
            : null,
          readme: repoObj?.readme?.text || null,
        });
      }
      savedCount++;
    }
    console.log(
      `\n📊 Collected data for ${contributorDataList.length} contributors and saved ${savedCount} to database`
    );

    // 3. Create report
    // await createContributorIndexReport(
    //   contributorDataList,
    //   dbFilename,
    //   configData
    // );
  } catch (error) {
    console.error(
      `Error generating contributor index: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

async function getContributorDataFromGitHub(
  _token: string,
  configData: DataConfig
): Promise<ContributorData[]> {
  const contributorCollector = new GitHubContributor(_token);
  if (configData.microsoftContributors.length === 0) {
    console.log('No contributors found in configuration.');
    return [];
  }
  console.log(
    `🔍 Collecting data for ${configData.microsoftContributors.length} contributors...`
  );
  const contributorDataList: ContributorData[] = [];
  for (const contributor of configData.microsoftContributors) {
    console.log(`Processing contributor: ${contributor}`);
    try {
      const contributorData =
        await contributorCollector.getContributorData(contributor);
      contributorDataList.push({
        ...contributorData,
        repos: Array.isArray(contributorData.repos)
          ? contributorData.repos
          : [],
        recentPRs: Array.isArray(contributorData.recentPRs)
          ? contributorData.recentPRs
          : [],
      });
    } catch (error) {
      console.log(
        `Error processing contributor ${contributor}: ${error instanceof Error ? error.message : String(error)}`
      );
      // Continue with next contributor
    }
  }
  return contributorDataList;
}

// async function createContributorIndexReport(
//   contributorDataList: ContributorData[],
//   dbFilename: string,
//   configData: DataConfig
// ) {
//   const markdown =
//     ReportGenerator.generateContributorIndexReport(contributorDataList);
//   const reportWithDbInfo = addDbInfoToReport(markdown, dbFilename);
//   const reportFileName =
//     configData.generatedDirectoryName + '/contributor-index.md';
//   ReportGenerator.saveReport(reportWithDbInfo, reportFileName);
//   console.log(`✅ Contributor index report saved to ${reportFileName}`);
// }

// /**
//  * Add database information to the generated report
//  * @param reportContent Original markdown report
//  * @param dbPath Path to the database file
//  * @returns Updated report with database information
//  */
// function addDbInfoToReport(reportContent: string, dbPath: string): string {
//   const dbInfo = `
// ## Database Information

// All contributor data is stored in a SQLite database. You can query it using standard SQL commands.

// **Database path:** \`${dbPath}\`

// **Example queries:**

// \`\`\`sql
// -- Get all contributors
// ${SQL_GET_ALL_CONTRIBUTORS.trim()}

// -- Get top contributors by number of followers
// ${SQL_GET_TOP_CONTRIBUTORS.trim()}

// -- Search for contributors by name or company
// ${SQL_SEARCH_CONTRIBUTORS.trim()}
// \`\`\`

// **Schema:**

// \`\`\`
// ${CREATE_CONTRIBUTORS_TABLE.trim()}
// \`\`\`
// `;

//   // Insert the DB info right before the end of the report
//   const splitPoint = reportContent.lastIndexOf('## Summary');
//   if (splitPoint === -1) {
//     // If no Summary section, just append it to the end
//     return reportContent + dbInfo;
//   } else {
//     // Insert before the Summary section
//     return (
//       reportContent.slice(0, splitPoint) +
//       dbInfo +
//       reportContent.slice(splitPoint)
//     );
//   }
// }

// async function createAndInsertUserRepositoryRelationships(
//   contributorData: any,
//   db: any
// ) {
//   const now = new Date().toISOString();
//   const userLogin = contributorData.login;
//   const contributedRepos = (contributorData as any).contributedReposList || [];
//   const ownedRepos = (contributorData as any).repositoriesList || [];
//   const starredRepos = (contributorData as any).starredRepositoriesList || [];
//   const issues = (contributorData as any).issuesList || [];
//   const prs = (contributorData as any).pullRequestsList || [];

//   const getRepoId = (repo: any) =>
//     repo.id || repo.nameWithOwner || repo.full_name || repo.name;

//   const repoMap = new Map<string, any>();
//   for (const repo of contributedRepos) {
//     const id = getRepoId(repo);
//     if (!id) continue;
//     repoMap.set(id, { contributed_to: true });
//   }
//   for (const repo of ownedRepos) {
//     const id = getRepoId(repo);
//     if (!id) continue;
//     if (!repoMap.has(id)) repoMap.set(id, {});
//     repoMap.get(id).owned = true;
//   }
//   for (const repo of starredRepos) {
//     const id = getRepoId(repo);
//     if (!id) continue;
//     if (!repoMap.has(id)) repoMap.set(id, {});
//     repoMap.get(id).starred = true;
//   }
//   for (const issue of issues) {
//     const id = getRepoId(issue.repository || {});
//     if (!id) continue;
//     if (!repoMap.has(id)) repoMap.set(id, {});
//     repoMap.get(id).has_issues = true;
//   }
//   for (const pr of prs) {
//     const id = getRepoId(pr.repository || {});
//     if (!id) continue;
//     if (!repoMap.has(id)) repoMap.set(id, {});
//     repoMap.get(id).has_prs = true;
//   }

//   for (const [repo_id, flags] of repoMap.entries()) {
//     const doc = {
//       user_login: userLogin,
//       repo_id,
//       contributed_to: !!flags.contributed_to,
//       owned: !!flags.owned,
//       starred: !!flags.starred,
//       has_issues: !!flags.has_issues,
//       has_prs: !!flags.has_prs,
//       data_inserted_at: now,
//     };

//     await insertOrUpdateUserRepositoryRelationship(db, doc);
//   }
// }
