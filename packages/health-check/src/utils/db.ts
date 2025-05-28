import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

/**
 * Creates a database connection with the given filename
 * @param dbFileName The filename for the SQLite database
 * @returns A promise that resolves to a database connection
 */
export function createDatabaseConnection(
  dbFileName: string
): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    // Create the database directory if it doesn't exist
    const dbDir = path.dirname(dbFileName);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Create a new database connection
    const db = new sqlite3.Database(dbFileName, err => {
      if (err) {
        console.error(`Error creating database connection: ${err.message}`);
        reject(err);
      } else {
        console.log(`Connected to SQLite database: ${dbFileName}`);
        resolve(db);
      }
    });
  });
}

/**
 * Initialize a database with the repository table schema
 * @param db The SQLite database connection
 * @returns A promise that resolves when the tables have been created
 */
export function initializeDatabase(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create repositories table
    db.run(
      `CREATE TABLE IF NOT EXISTS repositories (
      id TEXT PRIMARY KEY,
      org TEXT NOT NULL,
      repo TEXT NOT NULL,
      full_name TEXT,
      description TEXT,
      stars INTEGER DEFAULT 0,
      forks INTEGER DEFAULT 0,
      watchers INTEGER DEFAULT 0,
      issues INTEGER DEFAULT 0,
      pulls INTEGER DEFAULT 0,
      last_commit_date TEXT,
      archived INTEGER DEFAULT 0,
      topics TEXT,
      status TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
      err => {
        if (err) {
          console.error(`Error creating repositories table: ${err.message}`);
          reject(err);
          return;
        }

        // Create contributors table
        db.run(
          `CREATE TABLE IF NOT EXISTS contributors (
        login TEXT PRIMARY KEY,
        name TEXT,
        company TEXT,
        blog TEXT,
        location TEXT,
        email TEXT,
        bio TEXT,
        twitter TEXT,
        followers INTEGER DEFAULT 0,
        following INTEGER DEFAULT 0,
        public_repos INTEGER DEFAULT 0,
        public_gists INTEGER DEFAULT 0,
        avatar_url TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
          err => {
            if (err) {
              console.error(
                `Error creating contributors table: ${err.message}`
              );
              reject(err);
              return;
            }

            // Create repo_contributors junction table
            db.run(
              `CREATE TABLE IF NOT EXISTS repo_contributors (
          repo_id TEXT,
          contributor_login TEXT,
          contribution_count INTEGER DEFAULT 0,
          is_maintainer INTEGER DEFAULT 0,
          last_contributed_at TEXT,
          PRIMARY KEY (repo_id, contributor_login),
          FOREIGN KEY (repo_id) REFERENCES repositories(id),
          FOREIGN KEY (contributor_login) REFERENCES contributors(login)
        )`,
              err => {
                if (err) {
                  console.error(
                    `Error creating repo_contributors table: ${err.message}`
                  );
                  reject(err);
                } else {
                  console.log('Database tables created or already exist');
                  resolve();
                }
              }
            );
          }
        );
      }
    );
  });
}

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
 * Get contributors for a specific repository
 * @param db The SQLite database connection
 * @param repoId Repository ID (org/repo format)
 * @returns A promise that resolves to an array of contributors with contribution data
 */
export function getRepoContributors(
  db: sqlite3.Database,
  repoId: string
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT c.*, rc.contribution_count, rc.is_maintainer, rc.last_contributed_at 
       FROM contributors c
       JOIN repo_contributors rc ON c.login = rc.contributor_login
       WHERE rc.repo_id = ?
       ORDER BY rc.contribution_count DESC`,
      [repoId],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

/**
 * Get top contributors across all repositories
 * @param db The SQLite database connection
 * @param limit Maximum number of contributors to return
 * @returns A promise that resolves to an array of top contributors
 */
export function getTopContributors(
  db: sqlite3.Database,
  limit: number = 10
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT c.login, c.name, c.company, c.avatar_url, 
              COUNT(DISTINCT rc.repo_id) as repo_count,
              SUM(rc.contribution_count) as total_contributions
       FROM contributors c
       JOIN repo_contributors rc ON c.login = rc.contributor_login
       GROUP BY c.login
       ORDER BY total_contributions DESC
       LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

/**
 * Close database connection
 * @param db The SQLite database connection to close
 * @returns A promise that resolves when the connection is closed
 */
export function closeDatabase(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close(err => {
      if (err) {
        console.error(`Error closing database: ${err.message}`);
        reject(err);
      } else {
        console.log('Database connection closed');
        resolve();
      }
    });
  });
}

/**
 * Generate a database filename with current date in format YYYY_MM_DD
 * @returns A formatted database filename with the current date
 */
export function getDateBasedDbFilename(baseDir: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const dateStr = `${year}_${month}_${day}`;
  return path.join(baseDir, 'oss', `repos_${dateStr}.db`);
}
