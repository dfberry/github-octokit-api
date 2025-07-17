import path from 'path';
import { promises as fs } from 'fs';

/**
 * Get the fully qualified path to the current github.db file by reading github.db.json.
 * @param dataRootDir The root data directory (e.g. /workspaces/github-octobit-api-0623/data)
 * @returns The absolute path to the current github.db file, or null if not found
 */
export async function getCurrentGithubDbPath(dataRootDir: string): Promise<string | null> {
  const dbDir = path.resolve(dataRootDir, 'db');
  const dbJsonPath = path.join(dbDir, 'github.db.json');

  console.log(`Looking for github.db.json at: ${dbJsonPath}`);

  try {
    const jsonStr = await fs.readFile(dbJsonPath, 'utf-8');
    const dbJson = JSON.parse(jsonStr);
    if (!dbJson.current) return null;
    // Always resolve from the root (absolute path)
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
  generatedDirectory: string,
  copyFn: (
    srcPath: string,
    destPath: string,
    pointerJsonPath: string
  ) => Promise<void> = copyDbAndUpdatePointer
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
    await copyFn(generatedDbPath, destDbPath, dbJsonPath);
  } catch (err) {
    console.error(
      `Failed to copy or update github.db: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Copy a db file to a new location and update a pointer JSON file to reference it.
 * @param srcPath Path to the source db file
 * @param destPath Path to the destination db file
 * @param pointerJsonPath Path to the pointer JSON file
 */
export async function copyDbAndUpdatePointer(
  srcPath: string,
  destPath: string,
  pointerJsonPath: string
): Promise<void> {
  await fs.copyFile(srcPath, destPath);
  console.log(`Copied ${srcPath} to ${destPath}`);

  // Write or update pointer JSON to point to the current db file
  const dbJson = { current: path.basename(destPath) };
  await fs.writeFile(pointerJsonPath, JSON.stringify(dbJson, null, 2), 'utf-8');
  console.log(`Updated ${pointerJsonPath} to point to ${dbJson.current}`);
}
