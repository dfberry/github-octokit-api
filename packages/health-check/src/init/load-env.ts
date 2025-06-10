// Loads environment variables from .env file
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../../.env');

export function initializeEnv() {
  // Load environment variables from .env file
  const result = config({ path: envPath });

  if (result.error) {
    console.warn(`⚠️ Error loading .env file: ${result.error.message}`);
  } else {
    console.log('✅ Environment loaded from .env file');
  }
}
