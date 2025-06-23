import sqlite3 from 'sqlite3';
import { convertIssueToSimpleRepo } from '../utils/convert.js';
import {
  //INSERT_OR_UPDATE_USER_REPOSITORY_RELATIONSHIP,
  INSERT_CONTRIBUTOR_ISSUE_PRS,
  INSERT_REPOSITORIES,
  INSERT_CONTRIBUTORS,
  //INSERT_REPO_CONTRIBUTORS,
} from './sql-all.js';
/**
 * Insert a repository record into the database
 * @param db The SQLite database connection
 * @param repo The repository data to insert
 * @returns A promise that resolves when the record has been inserted
 */
export function insertRepository(
  db: sqlite3.Database,
  repo: any
): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = `${repo.org}/${repo.repo}`;
    const topics = Array.isArray(repo.topics) ? repo.topics.join(',') : null;
    const archived = repo.archived ? 1 : 0;
    const status = repo.archived ? 'Archived' : 'Active';

    db.run(
      INSERT_REPOSITORIES,
      [
        id,
        repo.org,
        repo.repo,
        repo.full_name || `${repo.org}/${repo.repo}`,
        repo.description || null,
        repo.disk_usage || 0,
        repo?.primary_language.name || null,
        repo?.license_info.name || null,
        repo.stargazers_count || 0,
        repo.forks_count || 0,
        repo.watchers_count || 0,
        repo.open_issues_count || 0,
        repo.pulls || 0,
        repo.last_commit_date || null,
        archived,
        topics,
        status,
        repo.readme || null,
      ],
      function (err) {
        if (err) {
          console.error(`Error inserting repository ${id}: ${err.message}`);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

/**
 * Insert a contributor record into the database
 * @param db The SQLite database connection
 * @param contributor The contributor data to insert
 * @returns A promise that resolves when the record has been inserted
 */
export function insertContributor(
  db: sqlite3.Database,
  contributor: any
): Promise<void> {
  return new Promise((resolve, reject) => {
    const login = contributor.login;
    if (!login) {
      reject(new Error('Contributor login is required'));
      return;
    }

    db.run(
      INSERT_CONTRIBUTORS,
      [
        login,
        contributor.name || null,
        contributor.company || null,
        contributor.blog || null,
        contributor.location || null,
        contributor.email || null,
        contributor.bio || null,
        contributor.twitter_username || null,
        contributor.followers || 0,
        contributor.following || 0,
        contributor.public_repos || 0,
        contributor.public_gists || 0,
        contributor.avatar_url || null,
      ],
      function (err) {
        if (err) {
          console.error(`Error inserting contributor ${login}: ${err.message}`);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

// /**
//  * Link a contributor to a repository
//  * @param db The SQLite database connection
//  * @param repoId Repository ID (org/repo format)
//  * @param contributorLogin Contributor's login
//  * @param contributionCount Number of contributions
//  * @param isMaintainer Whether the contributor is a maintainer
//  * @param lastContributedAt Date of last contribution
//  * @returns A promise that resolves when the record has been inserted
//  */
// export function linkContributorToRepo(
//   db: sqlite3.Database,
//   repoId: string,
//   contributorLogin: string,
//   contributionCount: number = 0,
//   isMaintainer: boolean = false,
//   lastContributedAt: string = null
// ): Promise<void> {
//   return new Promise((resolve, reject) => {
//     db.run(
//       INSERT_REPO_CONTRIBUTORS,
//       [
//         repoId,
//         contributorLogin,
//         contributionCount,
//         isMaintainer ? 1 : 0,
//         lastContributedAt,
//       ],
//       function (err) {
//         if (err) {
//           console.error(
//             `Error linking contributor ${contributorLogin} to repo ${repoId}: ${err.message}`
//           );
//           reject(err);
//         } else {
//           resolve();
//         }
//       }
//     );
//   });
// }

/**
 * Insert issues and PRs for a contributor into a separate table
 * @param db The SQLite database connection
 * @param username The contributor's login
 * @param issues Array of issues
 * @param pullRequests Array of pull requests
 * @returns A promise that resolves when all records have been inserted
 */
export async function insertContributorIssuesAndPRs(
  db: sqlite3.Database,
  username: string,
  issues: any[],
  pullRequests: any[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      const stmt = db.prepare(INSERT_CONTRIBUTOR_ISSUE_PRS);
      for (const issue of issues) {
        // Get org/repo from first item in array or set to empty string
        const { org, repo } = convertIssueToSimpleRepo(issue);

        issue.org = org || null;
        issue.repo = repo || null;

        stmt.run([
          username,
          'issue',
          issue.id || null,
          issue.number || null,
          issue.title || null,
          issue.url || null,
          issue.org || null,
          issue.repo || null,
          issue.state || null,
          issue.createdAt || issue.created_at || null,
          issue.updatedAt || issue.updated_at || null,
          issue.closedAt || issue.closed_at || null,
          issue.repository?.nameWithOwner ||
            issue.repository_url ||
            `${issue.org}/${issue.repo}` ||
            null,
        ]);
      }
      for (const pr of pullRequests) {
        // Get org/repo from first item in array or set to empty string
        const { org, repo } = convertIssueToSimpleRepo(pr);

        pr.org = org || null;
        pr.repo = repo || null;

        stmt.run([
          username,
          'pr',
          pr.id || null,
          pr.number || null,
          pr.title || null,
          pr.url || null,
          pr.org || null,
          pr.repo || null,
          pr.state || null,
          pr.createdAt || pr.created_at || null,
          pr.updatedAt || pr.updated_at || null,
          pr.closedAt || pr.closed_at || null,
          pr.repository?.nameWithOwner || pr || `${pr.org}/${pr.repo}` || null,
        ]);
      }
      stmt.finalize(err => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

/**
 * Insert unique contributed repositories into the repositories table
 * @param db The SQLite database connection
 * @param repos Array of repository objects
 * @returns A promise that resolves when all unique repos have been inserted
 */
export async function insertUniqueContributedRepos(
  db: sqlite3.Database,
  repos: any[]
): Promise<void> {
  // Use a Set to track unique full_name
  const seen = new Set<string>();
  for (const repo of repos) {
    const fullName = repo.nameWithOwner || repo.full_name || repo.name;
    if (!fullName || seen.has(fullName)) continue;
    seen.add(fullName);
    // Insert using insertRepository if available
    await new Promise<void>((resolve, reject) => {
      console.log(`Inserting contributed repo: ${fullName}`);

      const topics =
        repo?.topics?.nodes?.length > 0
          ? repo.topics.nodes.map(item => item.topic.name).join(',')
          : null;

      db.run(
        INSERT_REPOSITORIES,
        [
          fullName,
          repo?.owner?.login || null,
          repo?.name || null,
          fullName,
          repo?.description || null,
          repo?.diskUsage || 0,
          repo?.primaryLanguage?.name || null,
          repo?.licenseInfo?.name || null,
          repo?.stargazerCount || repo?.stargazers_count || 0,
          repo?.forkCount || repo?.forks_count || 0,
          repo?.watchers?.totalCount || repo?.watchers_count || 0,
          repo?.issues?.totalCount || repo?.open_issues_count || 0,
          repo?.pullRequests?.totalCount || 0,
          repo?.pushedAt || repo?.updatedAt || repo?.updated_at || null,
          repo?.isArchived || repo?.archived ? 1 : 0,
          topics,
          repo?.isArchived || repo?.archived ? 'Archived' : 'Active',
          repo?.readme?.text || null, // root readme
        ],
        function (err) {
          if (err) {
            console.error(
              `Error inserting contributed repo ${fullName}: ${err.message}`
            );
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }
}

// /**
//  * Insert or update a user-repository relationship
//  * @param db The SQLite database connection
//  * @param user_login The user's login
//  * @param repo_id The repository ID
//  * @param contributed_to Whether the user has contributed to the repository
//  * @param owned Whether the user owns the repository
//  * @param starred Whether the repository is starred by the user
//  * @param has_issues Whether the repository has issues
//  * @param has_prs Whether the repository has pull requests
//  * @param data_inserted_at The date when the data was inserted
//  */
// export async function insertOrUpdateUserRepositoryRelationship(
//   db: any,
//   {
//     user_login,
//     repo_id,
//     contributed_to = false,
//     owned = false,
//     starred = false,
//     has_issues = false,
//     has_prs = false,
//     data_inserted_at = new Date().toISOString(),
//   }: {
//     user_login: string;
//     repo_id: string;
//     contributed_to?: boolean;
//     owned?: boolean;
//     starred?: boolean;
//     has_issues?: boolean;
//     has_prs?: boolean;
//     data_inserted_at?: string;
//   }
// ) {
//   await db.run(INSERT_OR_UPDATE_USER_REPOSITORY_RELATIONSHIP, {
//     $user_login: user_login,
//     $repo_id: repo_id,
//     $contributed_to: contributed_to ? 1 : 0,
//     $owned: owned ? 1 : 0,
//     $starred: starred ? 1 : 0,
//     $has_issues: has_issues ? 1 : 0,
//     $has_prs: has_prs ? 1 : 0,
//     $data_inserted_at: data_inserted_at,
//   });
// }
