import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, '../data/github.db');

const db = createClient({
  url: `file:${filePath}`,
});

export async function createVectorizedTableAndIndex() {
  await db.batch([
    'CREATE TABLE IF NOT EXISTS movie2 (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, year INTEGER, emb F32_BLOB(3))',
    "CREATE INDEX IF NOT EXISTS movies2_idx ON movie2 (libsql_vector_idx(emb, 'metric=cosine'))",
  ]);
}

export async function insertMovieVector(title: string, year: number, vector: number[]) {
  await db.execute({
    sql: "INSERT INTO movie2 (title, year, emb) VALUES (?, ?, vector(?))",
    args: [title, year, JSON.stringify(vector)],
  });
}

export async function updateMovieVector(id: number, vector: number[]) {
  await db.execute({
    sql: "UPDATE movie2 SET emb = vector(?) WHERE id = ?",
    args: [JSON.stringify(vector), id],
  });
}

export async function queryMovieVectors(queryVector: number[], k: number = 3) {
  const results = await db.execute({
    sql: "SELECT id, title, year FROM vector_top_k('movies2_idx', vector(?), ?) JOIN movie2 ON movie2.rowid = id;",
    args: [JSON.stringify(queryVector), k],
  });
  return results;
}

// Example usage:
await createVectorizedTableAndIndex();
await insertMovieVector('Napoleon', 2023, [1, 2, 3]);
const results = await queryMovieVectors([4, 5, 6], 3);
console.log(results);