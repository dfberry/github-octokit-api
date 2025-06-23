import sqlite3 from 'sqlite3';
import {
  GET_REPO_CONTRIBUTORS,
  GET_TOP_REPO_CONTRIBUTORS,
  SQL_GET_ALL_REPOSITORY_IDs,
} from './sql-all.js';

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
    db.all(GET_REPO_CONTRIBUTORS, [repoId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
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
    db.all(GET_TOP_REPO_CONTRIBUTORS, [limit], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}
// select all repository IDs from the database
export async function getAllRepositoryIDs(db: any): Promise<any> {
  return new Promise((resolve, reject) => {
    db.all(SQL_GET_ALL_REPOSITORY_IDs, [], (err: Error | null, rows: any[]) => {
      if (err) {
        console.error(`Error fetching repository IDs: ${err.message}`);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}
