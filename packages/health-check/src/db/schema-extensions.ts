import sqlite3 from 'sqlite3';
import {
  INSERT_INFRASTRUCTURE,
  INSERT_WORKFLOWS,
  CREATE_WORKFLOW_RUNS,
  INSERT_SECURITY,
} from './sql-all.js';

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
      INSERT_INFRASTRUCTURE,
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
          // Insert infrastructure folders
          if (
            infraData.infrastructureFolders &&
            infraData.infrastructureFolders.length > 0
          ) {
            for (const folder of infraData.infrastructureFolders) {
              await new Promise<void>((resolveInsert, rejectInsert) => {
                db.run(
                  INSERT_INFRASTRUCTURE,
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
            INSERT_WORKFLOWS,
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
              CREATE_WORKFLOW_RUNS,
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
      INSERT_SECURITY,
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
