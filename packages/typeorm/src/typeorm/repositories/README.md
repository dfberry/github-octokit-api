# ContributorRepository Usage Example

This guide shows how to use the custom `ContributorRepository` in your codebase.

## 1. Get the repository instance

```typescript
import { DataSource } from 'typeorm';
import { getContributorRepository } from './Contributor.js'; // adjust path as needed

const dataSource = /* your DataSource instance */;
const contributorRepo = getContributorRepository(dataSource);
```

## 2. Insert a batch of contributors

```typescript
await contributorRepo.insertBatch([
  { id: 'alice', name: 'Alice' },
  { id: 'bob', name: 'Bob' },
]);
```

## 3. Upsert a batch of contributors

```typescript
await contributorRepo.upsertBatch([
  { id: 'alice', name: 'Alice Updated' },
  { id: 'carol', name: 'Carol' },
]);
```

## 4. Query contributors

```typescript
const alice = await contributorRepo.getById('alice');
const all = await contributorRepo.getAll();
const msft = await contributorRepo.findByCompany('Microsoft');
```

---

**Note:** You must pass a valid, initialized `DataSource` instance. This pattern works for any custom repository in this package.
