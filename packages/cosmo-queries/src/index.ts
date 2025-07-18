import { CosmosClient } from '@azure/cosmos';
import dotenv from 'dotenv';

dotenv.config();

const endpoint = process.env.COSMOS_DB_ENDPOINT!;
const key = process.env.COSMOS_DB_KEY!;
const databaseId = process.env.COSMOS_DB_DATABASE!;
const containerId = process.env.COSMOS_DB_CONTAINER!;
const partitionKey = process.env.COSMOS_CONTAINER_PARTITION_KEY || '/category';

console.log(partitionKey);
console.log(containerId);
console.log(databaseId);
console.log(endpoint);
console.log(key);

const client = new CosmosClient({ endpoint, key });

export async function getCategoryPrefixCounts() {
  const database = client.database(databaseId);
  const container = database.container(containerId);

  // Query to group by category prefix (before the colon) and count documents in each group
  const query = `
  SELECT 
    SUBSTRING(c.category, 0, INDEX_OF(c.category, ':')) AS prefix,
    COUNT(1) AS count
  FROM c
  WHERE IS_DEFINED(c.category) AND INDEX_OF(c.category, ':') > 0
  GROUP BY SUBSTRING(c.category, 0, INDEX_OF(c.category, ':'))
`;

  const { resources } = await container.items.query(query).fetchAll();

  // resources will be an array of objects: { prefix: string, count: number }
  return resources;
}

// Example usage:
if (require.main === module) {
  getCategoryPrefixCounts()
    .then(results => {
      console.log('Category prefix counts:', results);
    })
    .catch(err => {
      console.error('Error querying Cosmos DB:', err);
    });
}
