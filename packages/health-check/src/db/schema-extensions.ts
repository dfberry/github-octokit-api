import sqlite3 from 'sqlite3';

/**
 * Extends the database with additional tables for infrastructure, workflow, and security data
 * @param db The SQLite database connection
 * @returns A promise that resolves when the tables have been created
 */
export function extendDatabaseSchema(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create infrastructure data table
    db.run(
      `CREATE TABLE IF NOT EXISTS infrastructure (
        repo_id TEXT PRIMARY KEY,
        has_infrastructure INTEGER DEFAULT 0,
        infrastructure_types TEXT,
        has_azure_yaml INTEGER DEFAULT 0,
        azure_yaml_path TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (repo_id) REFERENCES repositories(id)
      )`,
      err => {
        if (err) {
          console.error(`Error creating infrastructure table: ${err.message}`);
          reject(err);
          return;
        }

        // Create infrastructure folders table to store folder details
        db.run(
          `CREATE TABLE IF NOT EXISTS infrastructure_folders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            repo_id TEXT,
            path TEXT NOT NULL,
            type TEXT NOT NULL,
            file_count INTEGER DEFAULT 0,
            FOREIGN KEY (repo_id) REFERENCES repositories(id)
          )`,
          err => {
            if (err) {
              console.error(
                `Error creating infrastructure_folders table: ${err.message}`
              );
              reject(err);
              return;
            }

            // Create workflows table
            db.run(
              `CREATE TABLE IF NOT EXISTS workflows (
                id INTEGER PRIMARY KEY,
                repo_id TEXT,
                name TEXT NOT NULL,
                path TEXT,
                state TEXT,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (repo_id) REFERENCES repositories(id)
              )`,
              err => {
                if (err) {
                  console.error(
                    `Error creating workflows table: ${err.message}`
                  );
                  reject(err);
                  return;
                }

                // Create workflow runs table
                db.run(
                  `CREATE TABLE IF NOT EXISTS workflow_runs (
                    id INTEGER PRIMARY KEY,
                    workflow_id INTEGER,
                    status TEXT,
                    conclusion TEXT,
                    created_at TEXT,
                    updated_at TEXT,
                    html_url TEXT,
                    FOREIGN KEY (workflow_id) REFERENCES workflows(id)
                  )`,
                  err => {
                    if (err) {
                      console.error(
                        `Error creating workflow_runs table: ${err.message}`
                      );
                      reject(err);
                      return;
                    }

                    // Create security table
                    db.run(
                      `CREATE TABLE IF NOT EXISTS security (
                        repo_id TEXT PRIMARY KEY,
                        security_notices INTEGER DEFAULT 0,
                        has_vulnerabilities INTEGER DEFAULT 0,
                        dependabot_alerts_count INTEGER DEFAULT -1,
                        code_scanning INTEGER DEFAULT 0,
                        security_status TEXT,
                        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (repo_id) REFERENCES repositories(id)
                      )`,
                      err => {
                        if (err) {
                          console.error(
                            `Error creating security table: ${err.message}`
                          );
                          reject(err);
                        } else {
                          console.log(
                            'Extended database schema created successfully'
                          );
                          resolve();
                        }
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
}

/**
 * Insert infrastructure data into the database
 * @param db The SQLite database connection
 * @param infraData Infrastructure data to insert
 * @returns A promise that resolves when the data has been inserted
 */
export function insertInfrastructureData(
  db: sqlite3.Database,
  infraData: any
): Promise<void> {
  return new Promise((resolve, reject) => {
    const repoId = `${infraData.org}/${infraData.repo}`;
    const infrastructureTypes = infraData.infrastructureType.join(',');
    const hasInfrastructure = infraData.hasInfrastructure ? 1 : 0;
    const hasAzureYaml = infraData.hasAzureYaml ? 1 : 0;

    db.run(
      `INSERT OR REPLACE INTO infrastructure (
        repo_id, has_infrastructure, infrastructure_types, 
        has_azure_yaml, azure_yaml_path, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        repoId,
        hasInfrastructure,
        infrastructureTypes,
        hasAzureYaml,
        infraData.azureYamlPath || '',
        new Date().toISOString(),
      ],
      async function (err) {
        if (err) {
          console.error(
            `Error inserting infrastructure data for ${repoId}: ${err.message}`
          );
          reject(err);
          return;
        }

        try {
          // Delete existing infrastructure folders for this repo
          await new Promise<void>((resolveDelete, rejectDelete) => {
            db.run(
              'DELETE FROM infrastructure_folders WHERE repo_id = ?',
              [repoId],
              function (err) {
                if (err) {
                  rejectDelete(err);
                } else {
                  resolveDelete();
                }
              }
            );
          });

          // Insert infrastructure folders
          if (
            infraData.infrastructureFolders &&
            infraData.infrastructureFolders.length > 0
          ) {
            for (const folder of infraData.infrastructureFolders) {
              await new Promise<void>((resolveInsert, rejectInsert) => {
                db.run(
                  `INSERT INTO infrastructure_folders (
                    repo_id, path, type, file_count
                  ) VALUES (?, ?, ?, ?)`,
                  [repoId, folder.path, folder.type, folder.fileCount || 0],
                  function (err) {
                    if (err) {
                      console.error(
                        `Error inserting infrastructure folder for ${repoId}: ${err.message}`
                      );
                      rejectInsert(err);
                    } else {
                      resolveInsert();
                    }
                  }
                );
              });
            }
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Insert workflow data into the database
 * @param db The SQLite database connection
 * @param repoId Repository ID (org/repo format)
 * @param workflows Workflow data to insert
 * @returns A promise that resolves when the data has been inserted
 */
export function insertWorkflowData(
  db: sqlite3.Database,
  repoId: string,
  workflows: any[]
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      // Use a transaction for better performance and data integrity
      await new Promise<void>((resolveTransaction, rejectTransaction) => {
        db.run('BEGIN TRANSACTION', function (err) {
          if (err) {
            rejectTransaction(err);
          } else {
            resolveTransaction();
          }
        });
      });

      for (const workflow of workflows) {
        // Insert workflow data
        await new Promise<void>((resolveInsert, rejectInsert) => {
          db.run(
            `INSERT OR REPLACE INTO workflows (
              id, repo_id, name, path, state, last_updated
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              workflow.id,
              repoId,
              workflow.name,
              workflow.path,
              workflow.state,
              new Date().toISOString(),
            ],
            function (err) {
              if (err) {
                console.error(
                  `Error inserting workflow for ${repoId}: ${err.message}`
                );
                rejectInsert(err);
              } else {
                resolveInsert();
              }
            }
          );
        });

        // Insert latest run if available
        if (workflow.latestRun) {
          await new Promise<void>((resolveInsert, rejectInsert) => {
            db.run(
              `INSERT OR REPLACE INTO workflow_runs (
                id, workflow_id, status, conclusion, created_at, updated_at, html_url
              ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                workflow.latestRun.id,
                workflow.id,
                workflow.latestRun.status,
                workflow.latestRun.conclusion,
                workflow.latestRun.createdAt,
                workflow.latestRun.updatedAt,
                workflow.latestRun.htmlUrl,
              ],
              function (err) {
                if (err) {
                  console.error(
                    `Error inserting workflow run for ${repoId}: ${err.message}`
                  );
                  rejectInsert(err);
                } else {
                  resolveInsert();
                }
              }
            );
          });
        }
      }

      // Commit transaction
      await new Promise<void>((resolveTransaction, rejectTransaction) => {
        db.run('COMMIT', function (err) {
          if (err) {
            rejectTransaction(err);
          } else {
            resolveTransaction();
          }
        });
      });

      resolve();
    } catch (error) {
      // Rollback transaction in case of error
      await new Promise<void>(resolveRollback => {
        db.run('ROLLBACK', function () {
          resolveRollback();
        });
      });
      reject(error);
    }
  });
}

/**
 * Insert security data into the database
 * @param db The SQLite database connection
 * @param repoId Repository ID (org/repo format)
 * @param securityData Security data to insert
 * @returns A promise that resolves when the data has been inserted
 */
export function insertSecurityData(
  db: sqlite3.Database,
  repoId: string,
  securityData: any
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Determine security status
    let securityStatus = 'Good';
    if (securityData.securityNotices > 0 || securityData.hasVulnerabilities) {
      securityStatus = 'Issues';
    } else if (
      securityData.dependabotAlerts > 0 &&
      !securityData.codeScanning
    ) {
      securityStatus = 'No protections';
    }

    db.run(
      `INSERT OR REPLACE INTO security (
        repo_id, security_notices, has_vulnerabilities,
        dependabot_alerts_count, code_scanning, security_status,
        last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        repoId,
        securityData.securityNotices || 0,
        securityData.hasVulnerabilities ? 1 : 0,
        securityData.dependabotAlerts || -1,
        securityData.codeScanning ? 1 : 0,
        securityStatus,
        new Date().toISOString(),
      ],
      function (err) {
        if (err) {
          console.error(
            `Error inserting security data for ${repoId}: ${err.message}`
          );
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}
