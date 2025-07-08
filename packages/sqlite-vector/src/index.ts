import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, '../data/github.db');

const db = createClient({
  url: `file:${filePath}`,
});

await db.batch([
  'CREATE TABLE movie2 (title, year, emb F32_BLOB(3))',
  "CREATE INDEX movies2_idx ON movie2 (libsql_vector_idx(emb, 'metric=cosine'))",
  "INSERT INTO movie2 VALUES ('Napoleon', 2023, vector('[1,2,3]'))",
]);

const results = await db.execute(
  "SELECT title, year FROM vector_top_k('movies2_idx', vector('[4,5,6]'), 3) JOIN movie2 ON movie2.rowid = id;"
);
console.log(results);
