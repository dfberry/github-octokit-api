import * as Sqlite from './sqlite_crud.js';
import * as Cosmos from './cosmos_crud.js';
import * as Embedding from './embedding.js';
import { getVectorText } from './vector-fields.js';

const db = Sqlite.openDb();

async function main(): Promise<void> {

    const tokensList = {};

    try {
        const {tables, data: docs} = await Sqlite.readTablesWithData(db);

        const setupResult = await Cosmos.setupDatabaseAndContainer();
        console.log('Cosmos setup:', setupResult);

        for await (const doc of docs) {
            console.log('Processing document:', doc.id);
            if ((doc.id as string).includes('/')){
                doc.id = (doc.id as string).replace(/\//g, ':');
            }
            const table = doc.category?.split(':')[0] || '';


            
            const vectorText = getVectorText(table, doc);
            if(!vectorText || vectorText.length === 0){
                console.log("empty vector text");
            }
            const { vector, tokens } = await Embedding.createVectorWithRetry(vectorText);
            tokensList[doc.id] = { tokens, date: new Date().toISOString() };
            console.log(`\tDocument ID: ${doc.id}, prompt: ${tokens?.prompt_tokens || -1} prompt tokens,  ${tokens.total_tokens || -1} total tokens.`);
            doc["context"] = vectorText;
            doc["embedding"] = vector;
            if(!doc.context || doc.context.length === 0){
                console.log("empty context");
            }
            const result = await Cosmos.insert(doc);
            console.log('Insert result:', result);
        }

        console.log(tokensList);


       /*  const result = await Cosmos.batchUpsert(docs);
        
        const failures = result.filter((item: any) => item.error);
        if (failures.length > 0) {
            console.error('Some documents failed to insert:', failures);
        }
        console.log('All documents inserted successfully:', result.length); */

        const timestamp = new Date().toISOString();

        const logTokens = {
            id: timestamp,
            category: 'tokens-log:'+timestamp,
            timestamp: timestamp,
            tokensList: tokensList,
            context: 'Metadata'
        }
        Cosmos.insert(logTokens);

        const schemaDoc = {
            id: 'schema',
            category: 'schema',
            schemaCategories: [
                "tokens-log",
                ...tables
            ],
            context: 'Metadata'
        }
        Cosmos.insert(schemaDoc);

    } catch (error) {
        console.error('Error reading tables with data:', error);
    }
}

main()
    .then(() => console.log('Migration completed successfully.'))
    .catch(error => console.error('Migration failed:', error))
    .finally(() => Sqlite.closeDb(db));