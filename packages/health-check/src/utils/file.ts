import path from 'path';

/**
 * Create a new directory based on the current date and time (YYYYMMDD_HHmmss)
 * @param baseDir The base directory where the new directory will be created
 * @returns The path to the newly created directory
 */
export function createTimestampedDirectory(baseDir: string): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dirName = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  console.log(`Creating timestamped directory: ${dirName}`);
  const fullPath = path.join(baseDir, dirName);
  console.log(`Full path for timestamped directory: ${fullPath}`);

  return fullPath;
}
