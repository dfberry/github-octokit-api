import { CosmosClient } from '@azure/cosmos';

const endpoint = process.env.COSMOS_DB_ENDPOINT || '';
const key = process.env.COSMOS_DB_KEY || '';
const databaseId = process.env.COSMOS_DB_DATABASE || '';
const containerId = process.env.COSMOS_DB_CONTAINER || '';

if (!endpoint || !key || !databaseId || !containerId) {
  throw new Error('Missing Cosmos DB configuration. Please set the environment variables.');
}

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const container = database.container(containerId);

// Update to create the database and container if they don't exist, and append a timestamp to the container name
//const randomString = Math.random().toString(36).substring(2, 6);
//const containerName = `${containerId}-${randomString}`;
const containerName = `${containerId}`;

export async function setupDatabaseAndContainer(): Promise<void> {
  try {
    // Create database if it doesn't exist
    await client.databases.createIfNotExists({ id: databaseId });
    console.log(`Database '${databaseId}' ensured.`);

    const policies = getIndexingPolicy();

    // Create container if it doesn't exist
    await database.containers.createIfNotExists({
      id: containerName,
      partitionKey: {
        paths: ['/category']
      },
      ...policies
    });
    console.log(`Container '${containerName}' ensured.`);
  } catch (error) {
    console.error('Error setting up database and container:', error);
    throw error;
  }
};

export async function insert(data: any): Promise<any> {
  try {

    console.log(`Inserting document with id: ${data?.id} and category: ${data?.document_category}`);

    if(!data?.id || !data?.document_category){
      throw new Error('Data id or document_category is empty, skipping insert');
    }

    if(process.env.FEATURE_FLAGS_INSERT_INTO_COSMOS_DB !== 'true'){
      console.log('Skipping insert into Cosmos DB as FEATURE_FLAGS_INSERT_INTO_COSMOS_DB is not set to true');
      return;
    }



    const response = await container.items.create(data);
    console.log('Inserted item:', response.resource);
    return response.resource;
  } catch (error) {
    console.error('Error inserting row:', error);
    throw error;
  }
};

export async function batchUpsert(data: Record<string, any>): Promise<any> {
  try {

    const operations = data.map((item: Record<string, any>) => ({
      operationType: 'Upsert',
      resourceBody: item
    }));
    return await container.items.batch(operations);

  } catch (error) {
    console.error('Error inserting row:', error);
    throw error;
  }
};

export function getIndexingPolicy(): any {
  return {
    "indexingPolicy": {
      "indexingMode": "consistent",
      "automatic": true,
      "includedPaths": [
        {
          "path": "/*"
        }
      ],
      "excludedPaths": [
        {
          "path": "/embedding/*"
        }
      ],
      "vectorIndexes": [
        {
          "path": "/embedding",
          "type": "quantizedFlat"
        }
      ]
    },
    "vectorEmbeddingPolicy": {
      "vectorEmbeddings": [
        {
          "path": "/embedding",
          "dataType": "float32",
          "distanceFunction": "cosine",
          "dimensions": 1536
        }
      ]
    }
  }
}