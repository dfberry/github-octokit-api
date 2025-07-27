import type { Database as DatabaseType } from 'sqlite3';

import * as sqlite from './sqlite_crud.js';
import * as Cosmos from './cosmos_crud.js';
import { DbEnv } from './cosmos_crud.js';

async function main(): Promise<void> {

    const tokensList = {};
    let rows = 0;
    let table = '';

    try {
        const db: DatabaseType = await sqlite.openDb();
        const {data: docs} = await sqlite.readTablesWithData(db);

        const setupResult = await Cosmos.setupDatabaseAndContainer();
        console.log('Cosmos setup:', setupResult);

        for await (const doc of docs) {
            // Convert stringified vectors to arrays for Cosmos insert
            if (typeof doc.document_embedding === 'string') {
                try {
                    doc.document_embedding = JSON.parse(doc.document_embedding);
                } catch (e) {
                    console.warn('Could not parse document_embedding for doc', doc.id);
                }
            }
            if (typeof doc.document_summary_embedding === 'string') {
                try {
                    doc.document_summary_embedding = JSON.parse(doc.document_summary_embedding);
                } catch (e) {
                    console.warn('Could not parse document_summary_embedding for doc', doc.id);
                }
            }
            console.log('Processing document:', doc.id);
            const tableName = doc.category.split(":")[0];

            if (table !== tableName) {
                if (table) {
                    console.log(`Finished processing table ${table}, total rows: ${rows}`);
                    tokensList[table] = rows;
                }
                table = tableName;
                rows = 0;
                console.log(`Starting processing table ${table}`);
                
            }

            const result = await Cosmos.insert(doc);
            console.log('Insert result:', result);
            rows += 1;
            
        }
        console.log(`Finished processing table ${table}, total rows: ${rows}`);
        tokensList[table] = rows;

        console.log(tokensList);
        console.log(`Cosmos DB: Endpoint=${DbEnv.endpoint}, Database=${DbEnv.databaseId}, Container=${DbEnv.containerId}`);
        await sqlite.closeDb(db);

    } catch (error) {
        console.error('Error reading tables with data:', error);
    }
}

main()
    .then(() => console.log('Migration completed successfully.'))
    .catch(error => console.error('Migration failed:', error));