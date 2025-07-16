import path from 'path';
import { promises as fs } from 'fs';

/**
 * Get the fully qualified path to the current github.db file by reading github.db.json.
 * @param dataRootDir The root data directory (e.g. /workspaces/github-octobit-api-0623/data)
 * @returns The absolute path to the current github.db file, or null if not found
 */
export async function getCurrentGithubDbPath(dataRootDir: string): Promise<string | null> {
  const dbDir = path.join(dataRootDir, 'db');
  const dbJsonPath = path.join(dbDir, 'github.db.json');
  try {
    const jsonStr = await fs.readFile(dbJsonPath, 'utf-8');
    const dbJson = JSON.parse(jsonStr);
    if (!dbJson.current) return null;
    return path.resolve(dbDir, dbJson.current);
  } catch (err) {
    console.error(`Failed to read current github.db: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * Copy a generated github.db to ./data/db/github.<timestamp>.db and update github.db.json pointer file.
 * @param generatedDirectory Directory where github.db is generated
 */
export async function copyAndUpdateGithubDb(
  generatedDirectory: string
): Promise<void> {
  const generatedDbPath = path.join(generatedDirectory, 'github.db');
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.]/g, '')
    .slice(0, 14);
  const rootDataDir = path.resolve(generatedDirectory, '../../../../data');
  const dbDir = path.join(rootDataDir, 'db');
  await fs.mkdir(dbDir, { recursive: true });
  const destDbPath = path.join(dbDir, `github.${timestamp}.db`);
  const dbJsonPath = path.join(dbDir, 'github.db.json');

  try {
    await fs.copyFile(generatedDbPath, destDbPath);
    console.log(`Copied ${generatedDbPath} to ${destDbPath}`);

    // Write or update github.db.json to point to the current db file
    const dbJson = { current: path.basename(destDbPath) };
    await fs.writeFile(dbJsonPath, JSON.stringify(dbJson, null, 2), 'utf-8');
    console.log(`Updated ${dbJsonPath} to point to ${dbJson.current}`);
  } catch (err) {
    console.error(
      `Failed to copy or update github.db: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
