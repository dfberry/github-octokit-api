import { createLogger, format, transports } from 'winston';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to find the latest generated DB directory (async)
async function getLatestGeneratedLogDir() {
  const baseDir = path.resolve(__dirname, '../generated');
  try {
    await fs.access(baseDir);
  } catch {
    return __dirname;
  }
  let dirs = await fs.readdir(baseDir);
  dirs = dirs
    .filter(d => /^\d{8}_\d{6}$/.test(d))
    .sort()
    .reverse();
  if (dirs.length === 0) return __dirname;
  // Use the latest timestamp dir
  const logDir = path.join(baseDir, dirs[0], 'oss');
  try {
    await fs.access(logDir);
  } catch {
    await fs.mkdir(logDir, { recursive: true });
  }
  return logDir;
}

let logFilePath = path.join(__dirname, 'health-check.log');
// Immediately-invoked async function to set logFilePath
void (async () => {
  try {
    const logDir = await getLatestGeneratedLogDir();
    logFilePath = path.join(logDir, 'health-check.log');
  } catch (err) {
    // fallback to default
  }
})();

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'health-check' },
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
    new transports.File({ filename: logFilePath }),
  ],
});

// Example: add cloud provider transport if needed
if (process.env.AZURE_LOGGING) {
  // Add Azure-specific transport here (e.g., Application Insights)
  // logger.add(new AzureTransport(...));
}
if (process.env.AWS_LOGGING) {
  // Add AWS-specific transport here (e.g., CloudWatch)
  // logger.add(new CloudWatchTransport(...));
}

export default logger;
