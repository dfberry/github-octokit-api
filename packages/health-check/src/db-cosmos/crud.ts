import { CosmosClient } from '@azure/cosmos';

export async function getClient() {
  const endpoint = process.env.COSMOS_DB_ENDPOINT || '';
  const key = process.env.COSMOS_DB_KEY || '';
  const dbName = process.env.COSMOS_DB_NAME || 'TestDB';
  const containerName = process.env.COSMOS_DB_CONTAINER || 'TestContainer';
  const cosmosClient = new CosmosClient({ endpoint, key });

  // create db and container if not exists
  const { database } = await cosmosClient.databases.createIfNotExists({
    id: dbName,
  });
  const { container } = await database.containers.createIfNotExists({
    id: containerName,
    partitionKey: { paths: ['/partitionKey'] },
  });

  return {
    cosmosClient,
    containerClient: container,
    databaseId: dbName,
    containerId: containerName,
  };
}

export async function createItem(containerClient: any, item: any) {
  const { resource } = await containerClient.items.create(item);
  return resource;
}

export async function readItem(
  containerClient: any,
  id: string,
  partitionKey: string
) {
  const { resource } = await containerClient.item(id, partitionKey).read();
  return resource;
}

export async function updateItem(
  containerClient: any,
  id: string,
  partitionKey: string,
  updatedItem: any
) {
  const { resource } = await containerClient
    .item(id, partitionKey)
    .replace(updatedItem);
  return resource;
}

export async function deleteItem(
  containerClient: any,
  id: string,
  partitionKey: string
) {
  await containerClient.item(id, partitionKey).delete();
}

export async function upsertItem(containerClient: any, item: any) {
  const { resource } = await containerClient.items.upsert(item);
  return resource;
}
