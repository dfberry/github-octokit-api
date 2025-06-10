import sqlite3 from 'sqlite3';

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
