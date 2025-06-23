import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import {
  CREATE_REPOSITORY_TABLE,
  CREATE_CONTRIBUTORS_TABLE,
  CREATE_CONTRIBUTOR_ISSUES_PRS_TABLE,
  // CREATE_REPO_CONTRIBUTORS_TABLE,
  // CREATE_INFRASTRUCTURE_TABLE,
  // CREATE_INFRASTRUCTURE_FOLDERS_TABLE,
  // CREATE_SECURITY_TABLE,
  // CREATE_WORKFLOWS_TABLE,
  // CREATE_WORKFLOW_RUNS_TABLE,
  // CREATE_USER_REPOSITORY_RELATIONSHIPS_TABLE,
} from './sql-all.js';
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
    const tableStatements = [
      CREATE_REPOSITORY_TABLE,
      CREATE_CONTRIBUTORS_TABLE,
      CREATE_CONTRIBUTOR_ISSUES_PRS_TABLE,
      //CREATE_REPO_CONTRIBUTORS_TABLE,
      //CREATE_INFRASTRUCTURE_TABLE,
      //CREATE_INFRASTRUCTURE_FOLDERS_TABLE,
      //CREATE_SECURITY_TABLE,
      //CREATE_WORKFLOWS_TABLE,
      //CREATE_WORKFLOW_RUNS_TABLE,
      //CREATE_USER_REPOSITORY_RELATIONSHIPS_TABLE,
    ];
    let idx = 0;
    function next() {
      if (idx >= tableStatements.length) {
        resolve();
        return; // All tables created
      }
      db.run(tableStatements[idx], err => {
        if (err) {
          console.error(`Error creating table: ${err.message}`);
          reject(err);
          return;
        } else {
          console.log(`Table created successfully: ${tableStatements[idx]}`);
        }
        idx++;
        next();
      });
    }
    next();
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
