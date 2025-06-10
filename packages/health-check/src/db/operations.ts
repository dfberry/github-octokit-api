import sqlite3 from 'sqlite3';
import {
  CREATE_USER_REPOSITORY_RELATIONSHIPS_TABLE,
  INSERT_OR_UPDATE_USER_REPOSITORY_RELATIONSHIP,
} from './sql-user-repository-relationships.js';
import { convertIssueToSimpleRepo } from '../utils/convert.js';

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
    const topics = Array.isArray(repo.topics) ? repo.topics.join(',') : '';
    const archived = repo.archived ? 1 : 0;
    const status = repo.archived ? 'Archived' : 'Active';

    db.run(
      `INSERT OR REPLACE INTO repositories (
        id, org, repo, full_name, description, stars, forks, watchers, issues, pulls, 
        last_commit_date, archived, topics, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        repo.org,
        repo.repo,
        repo.full_name || `${repo.org}/${repo.repo}`,
        repo.description || '',
        repo.stargazers_count || 0,
        repo.forks_count || 0,
        repo.watchers_count || 0,
        repo.open_issues_count || 0,
        repo.pulls || 0,
        repo.last_commit_date || '',
        archived,
        topics,
        status,
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
      `INSERT OR REPLACE INTO contributors (
        login, name, company, blog, location, email, bio, twitter,
        followers, following, public_repos, public_gists, avatar_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        login,
        contributor.name || '',
        contributor.company || '',
        contributor.blog || '',
        contributor.location || '',
        contributor.email || '',
        contributor.bio || '',
        contributor.twitter_username || '',
        contributor.followers || 0,
        contributor.following || 0,
        contributor.public_repos || 0,
        contributor.public_gists || 0,
        contributor.avatar_url || '',
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

/**
 * Link a contributor to a repository
 * @param db The SQLite database connection
 * @param repoId Repository ID (org/repo format)
 * @param contributorLogin Contributor's login
 * @param contributionCount Number of contributions
 * @param isMaintainer Whether the contributor is a maintainer
 * @param lastContributedAt Date of last contribution
 * @returns A promise that resolves when the record has been inserted
 */
export function linkContributorToRepo(
  db: sqlite3.Database,
  repoId: string,
  contributorLogin: string,
  contributionCount: number = 0,
  isMaintainer: boolean = false,
  lastContributedAt: string = ''
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO repo_contributors (
        repo_id, contributor_login, contribution_count, is_maintainer, last_contributed_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        repoId,
        contributorLogin,
        contributionCount,
        isMaintainer ? 1 : 0,
        lastContributedAt,
      ],
      function (err) {
        if (err) {
          console.error(
            `Error linking contributor ${contributorLogin} to repo ${repoId}: ${err.message}`
          );
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

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
      db.run(
        `CREATE TABLE IF NOT EXISTS contributor_issues_prs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT,
          type TEXT, -- 'issue' or 'pr'
          item_id TEXT,
          number INTEGER,
          title TEXT,
          url TEXT,
          org TEXT,
          repo TEXT,
          state TEXT,
          created_at TEXT,
          updated_at TEXT,
          closed_at TEXT,
          repo_full_name TEXT
        )`
      );
      const stmt = db.prepare(
        `INSERT INTO contributor_issues_prs (
          username, type, item_id, number, title, url, org, repo, state, created_at, updated_at, closed_at, repo_full_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const issue of issues) {
        // Get org/repo from first item in array or set to empty string
        const { org, repo } = convertIssueToSimpleRepo(issue);

        issue.org = org || '';
        issue.repo = repo || '';

        stmt.run([
          username,
          'issue',
          issue.id || '',
          issue.number || null,
          issue.title || '',
          issue.url || '',
          issue.org || '',
          issue.repo || '',
          issue.state || '',
          issue.createdAt || issue.created_at || '',
          issue.updatedAt || issue.updated_at || '',
          issue.closedAt || issue.closed_at || '',
          issue.repository?.nameWithOwner || issue.repository_url || '',
        ]);
      }
      for (const pr of pullRequests) {
        // Get org/repo from first item in array or set to empty string
        const { org, repo } = convertIssueToSimpleRepo(pr);

        pr.org = org || '';
        pr.repo = repo || '';

        stmt.run([
          username,
          'pr',
          pr.id || '',
          pr.number || null,
          pr.title || '',
          pr.url || '',
          pr.org || '',
          pr.repo || '',
          pr.state || '',
          pr.createdAt || pr.created_at || '',
          pr.updatedAt || pr.updated_at || '',
          pr.closedAt || pr.closed_at || '',
          pr.repository?.nameWithOwner || pr.repository_url || '',
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
      db.run(
        `INSERT OR IGNORE INTO repositories (
          id, org, repo, full_name, description, stars, forks, watchers, issues, pulls, last_commit_date, archived, topics, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fullName,
          repo.owner?.login || '',
          repo.name || '',
          fullName,
          repo.description || '',
          repo.stargazerCount || repo.stargazers_count || 0,
          repo.forkCount || repo.forks_count || 0,
          repo.watchers?.totalCount || repo.watchers_count || 0,
          repo.issues?.totalCount || repo.open_issues_count || 0,
          0, // pulls (not available)
          repo.pushedAt || repo.updatedAt || repo.updated_at || '',
          repo.isArchived || repo.archived ? 1 : 0,
          Array.isArray(repo.topics) ? repo.topics.join(',') : '',
          repo.isArchived || repo.archived ? 'Archived' : 'Active',
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

/**
 * Create the user-repository relationships table
 * @param db The SQLite database connection
 */
export async function createUserRepositoryRelationshipsTable(db: any) {
  await db.exec(CREATE_USER_REPOSITORY_RELATIONSHIPS_TABLE);
}

/**
 * Insert or update a user-repository relationship
 * @param db The SQLite database connection
 * @param user_login The user's login
 * @param repo_id The repository ID
 * @param contributed_to Whether the user has contributed to the repository
 * @param owned Whether the user owns the repository
 * @param starred Whether the repository is starred by the user
 * @param has_issues Whether the repository has issues
 * @param has_prs Whether the repository has pull requests
 * @param data_inserted_at The date when the data was inserted
 */
export async function insertOrUpdateUserRepositoryRelationship(
  db: any,
  {
    user_login,
    repo_id,
    contributed_to = false,
    owned = false,
    starred = false,
    has_issues = false,
    has_prs = false,
    data_inserted_at = new Date().toISOString(),
  }: {
    user_login: string;
    repo_id: string;
    contributed_to?: boolean;
    owned?: boolean;
    starred?: boolean;
    has_issues?: boolean;
    has_prs?: boolean;
    data_inserted_at?: string;
  }
) {
  await db.run(INSERT_OR_UPDATE_USER_REPOSITORY_RELATIONSHIP, {
    $user_login: user_login,
    $repo_id: repo_id,
    $contributed_to: contributed_to ? 1 : 0,
    $owned: owned ? 1 : 0,
    $starred: starred ? 1 : 0,
    $has_issues: has_issues ? 1 : 0,
    $has_prs: has_prs ? 1 : 0,
    $data_inserted_at: data_inserted_at,
  });
}
