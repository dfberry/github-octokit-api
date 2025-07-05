# Example: Using DbService with Dependency Injection

```typescript
import { createDataSource, DbService } from '@octobit/typeorm';

// 1. Create a DataSource instance
const dataSource = createDataSource({
  database: './data/github.db',
  type: 'sqlite',
  synchronize: true,
  logging: false,
});

// 2. Initialize the DataSource
await dataSource.initialize();

// 3. Create a DbService instance with the DataSource
const db = new DbService(dataSource);

// 4. Use the db instance for all operations
await db.Contributor.upsertBatch([{ id: 'octocat', name: 'Octo Cat' }]);
const allContributors = await db.Contributor.getAll();

await db.Repository.insertBatch([{ id: 'repo1', name: 'Repo 1' }]);
const repo = await db.Repository.getById('repo1');

// ...and so on for Workflow, DependabotAlert, ContributorIssuePr
```

**Note:**
- You must pass the `dataSource` instance to `DbService`.
- All methods are now instance methods, not static.
- This pattern works in any consumer package (health-check, sqlite-to-cosmos, etc).
