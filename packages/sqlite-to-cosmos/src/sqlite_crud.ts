
import sqlite3 from 'sqlite3';
import type { Database as DatabaseType } from 'sqlite3';
const { Database } = sqlite3;

import { getCurrentGithubDbPath } from '@dfb/finddb';


export async function openDb(): Promise<DatabaseType> {

    const dataRoot = '../../data';
    const dbPath = await getCurrentGithubDbPath(dataRoot);
    console.log('Opening SQLite database at:', dbPath);

    if (!dbPath) {
        throw new Error('Could not determine current github.db file.');
    }

    // Open the SQLite database
    const db = new Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening database:', err);
        } else {
            console.log('Database opened successfully');
        }
    });

    return db;
}
export function closeDb(db: DatabaseType) {
    if (db) {
        db.close((err: Error | null) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('Database closed successfully');
            }
        });
    } else {
        console.warn('No database connection to close.');
    }
}


// Function to get all tables in the database
export const getAllTables = (db: DatabaseType): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows: { name: string }[]) => {
            console.log(`Getting all tables in the database...${rows.length} tables found.`);


            if (err) {
                reject(err);
            } else {
                resolve(rows.map(row => row.name));
            }
        });
    });
};

// Function to check if a table has data
export const hasData = (db: DatabaseType, tableName: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row: { count: number }) => {

            console.log(`Getting ${row.count} from ${tableName} found.`);
            if (err) {
                reject(err);
            } else {
                resolve(row.count > 0);
            }
        });
    });
};

// Function to read tables with data
export const readTablesWithData = async (db: DatabaseType): Promise<{ tables: any[], data: any[] }> => {
    try {
        const tables = await getAllTables(db);
        const tablesWithData: string[] = [];

        for await (const table of tables) {
            const hasDataFlag = await hasData(db, table);
            if (hasDataFlag) {
                console.log(`Table ${table} has data.`);
                tablesWithData.push(table);
            }
        }

        const data = await getAllDataFromTables(db, tablesWithData);
        console.log(`Found ${data.length} data.`);

        return { tables, data };
    } catch (error) {
        console.error('Error reading tables with data:', error);
        return { tables: [], data: [] };
    }
};

// Update to get all data and return an array of docs representing the table
export const getAllDataFromTables = async (db: DatabaseType, tables: string[]): Promise<{ [key: string]: any }[]> => {
    const allData: { [key: string]: any }[] = [];

    for await (const table of tables) {
        console.log(`Reading data from table: ${table}`);

        if (table === 'sqlite_sequence') {
            console.log(`Skipping sqlite_sequence table.`);
            continue; // Skip sqlite_sequence table
        }

        await new Promise<void>((resolve, reject) => {
            db.all(`SELECT * FROM ${table}`, (err, rows: { [key: string]: any }[]) => {
                if (err) {
                    console.error(`Error reading data from table ${table}:`, err);
                    reject(err);
                } else {
                    //console.log(`Data from table ${table}:`, rows);
                    allData.push(...rows.map(row => ({ category: `${table}:${row.id}`, ...row })));
                    resolve();
                }
            });
        });
    }

    return allData;
};


