# @octobit/typeorm

Shared TypeORM Data Access Layer for Octobit Monorepo

## Features
- TypeORM entity definitions for Contributor, Repository, Workflow, DependabotAlert, ContributorIssuePr
- Batch insert and upsert helpers via `DbService`
- Flexible, parameterized DataSource creation (no hardcoded or .env assumptions)

## Usage Caveats: Upsert Support
TypeORM's `upsert` method requires:
  - **SQLite**: version 3.24.0 or newer
  - **PostgreSQL**: version 9.5 or newer
  - **MySQL**: version 8.0 or newer
If your database is older, you must use manual upsert logic (find, then insert/update).
This package assumes your DB supports native upserts for best performance.

## Usage

### 1. Install dependencies
Make sure your consumer package (e.g. `health-check`, `sqlite-to-cosmos`) has `typeorm` and `reflect-metadata` installed.

### 2. Create a DataSource
```ts
import { createDataSource } from '@octobit/typeorm';

const dataSource = createDataSource({
  database: './data/github.db', // or from process.env.SQLITE_DB_FILE
  type: 'sqlite', // or 'postgres', etc.
  synchronize: true, // for dev only
  logging: false,
  // entities: [ ... ] // optional, defaults to all provided entities
});

await dataSource.initialize();
```

### 3. Use DbService and Entities
```ts
import { DbService, Contributor, Repository } from '@octobit/typeorm';

// Create a DbService instance with your DataSource
const db = new DbService(dataSource);

// Example: batch upsert contributors
await db.Contributor.upsertBatch([{ id: 'octocat', name: 'Octo Cat' }]);

// Example: get all repositories
const repos = await db.Repository.getAll();
```

### 4. Customization
- You can pass any valid TypeORM DataSourceOptions to `createDataSource`.
- You are responsible for loading `.env` or config and passing the correct options.

## Entities Exported
- `Contributor`
- `Repository`
- `Workflow`
- `DependabotAlert`
- `ContributorIssuePr`

## Service Exported
- `DbService` (batch helpers, CRUD; all methods are instance methods)

## Example
```ts
import { createDataSource, DbService } from '@octobit/typeorm';

const dataSource = createDataSource({
  database: process.env.SQLITE_DB_FILE || './data/github.db',
});
await dataSource.initialize();

const db = new DbService(dataSource);
await db.Contributor.upsertBatch([{ id: 'octocat', name: 'Octo Cat' }]);
```
## Notes on Upserts

- All `upsertBatch` methods use TypeORM's native `upsert` for best performance.
- For `ContributorIssuePr`, upserts use a composite key: `username`, `type`, and `id`.
- All methods are instance methods on `DbService` (not static).

