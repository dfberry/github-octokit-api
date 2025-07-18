import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * Utility to query the SQLite database containing repository information
 */

/**
 * Lists all databases available in the generated/oss directory
 * @param generatedDir - The base directory where databases are stored
 * @returns Array of database file paths
 */
export function listDatabases(generatedDir: string): string[] {
  const ossDir = path.join(generatedDir, 'oss');

  // Create directory if it doesn't exist
  if (!fs.existsSync(ossDir)) {
    fs.mkdirSync(ossDir, { recursive: true });
    return [];
  }

  // Get all .db files
  const files = fs
    .readdirSync(ossDir)
    .filter(file => file.endsWith('.db'))
    .map(file => path.join(ossDir, file));

  return files;
}

/**
 * Gets the most recent database
 * @param generatedDir - The base directory where databases are stored
 * @returns Path to the most recent database, or null if none found
 */
export function getMostRecentDatabase(generatedDir: string): string | null {
  const databases = listDatabases(generatedDir);

  if (databases.length === 0) {
    return null;
  }

  // Sort by modification time (most recent first)
  databases.sort((a, b) => {
    const statA = fs.statSync(a);
    const statB = fs.statSync(b);
    return statB.mtime.getTime() - statA.mtime.getTime();
  });

  return databases[0];
}

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
 * Query the database and return results
 * @param dbPath - Path to the SQLite database
 * @param query - SQL query to execute
 * @param params - Optional parameters for the query
 * @returns Array of query results
 */
export function queryDatabase(
  dbPath: string,
  query: string,
  params: any[] = []
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(dbPath)) {
      reject(new Error(`Database not found: ${dbPath}`));
      return;
    }

    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, err => {
      if (err) {
        reject(new Error(`Failed to open database: ${err.message}`));
        return;
      }

      db.all(query, params, (err, rows) => {
        if (err) {
          db.close();
          reject(new Error(`Query failed: ${err.message}`));
          return;
        }

        db.close();
        resolve(rows);
      });
    });
  });
}

/**
 * Get repository count from database
 * @param dbPath - Path to the SQLite database
 * @returns Count of repositories
 */
export async function getRepositoryCount(dbPath: string): Promise<number> {
  const result = await queryDatabase(
    dbPath,
    'SELECT COUNT(*) as count FROM repositories'
  );
  return result[0]?.count || 0;
}

/**
 * Get top repositories by stars
 * @param dbPath - Path to the SQLite database
 * @param limit - Maximum number of repositories to return
 * @returns Array of repositories sorted by star count
 */
export async function getTopRepositories(
  dbPath: string,
  limit: number = 10
): Promise<any[]> {
  return queryDatabase(
    dbPath,
    `SELECT org, repo, description, stars, forks, watchers, topics
     FROM repositories 
     ORDER BY stars DESC 
     LIMIT ?`,
    [limit]
  );
}

/**
 * Get repositories by topic
 * @param dbPath - Path to the SQLite database
 * @param topic - Topic to search for
 * @returns Array of repositories that have the specified topic
 */
export async function getRepositoriesByTopic(
  dbPath: string,
  topic: string
): Promise<any[]> {
  return queryDatabase(
    dbPath,
    `SELECT org, repo, description, stars, topics
     FROM repositories 
     WHERE topics LIKE ? 
     ORDER BY stars DESC`,
    [`%${topic}%`]
  );
}
