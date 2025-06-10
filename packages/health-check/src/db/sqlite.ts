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
              async err => {
                if (err) {
                  console.error(
                    `Error creating repo_contributors table: ${err.message}`
                  );
                  reject(err);
                  return;
                }

                try {
                  // Import the extendDatabaseSchema function
                  const { extendDatabaseSchema } = await import(
                    './schema-extensions.js'
                  );

                  // Extend the schema with infrastructure, workflow, and security tables
                  await extendDatabaseSchema(db);
                  console.log('Database tables created or already exist');
                  resolve();
                } catch (extendError) {
                  console.error(
                    `Error extending database schema: ${extendError}`
                  );
                  reject(extendError);
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
