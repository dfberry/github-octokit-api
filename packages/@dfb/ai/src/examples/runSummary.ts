import { getSummary } from '../summarization.js';
import type { AzureOpenAIConfig } from '../completion.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const apiKey = process.env.OPENAI_API_KEY || 'YOUR_API_KEY';
const apiVersion = process.env.OPENAI_API_VERSION || '2024-04-01-preview';
const endpoint = process.env.OPENAI_ENDPOINT || 'https://openai-intell.openai.azure.com/';
const deployment = process.env.OPENAI_SUMMARIZATION_MODEL_NAME || 'gpt-35-turbo';

const config: AzureOpenAIConfig = { endpoint, apiKey, deployment, apiVersion };

async function main() {
  // Example: summarize a file
  const filePath = path.resolve(__dirname, '../../data/i-have-a-dream.txt');
  const document = await fs.readFile(filePath, 'utf8');
  const summary = await getSummary(config, document);
  console.log('Summary:\n', summary);
}

main().catch((err) => {
  console.error('Error running summary:', err);
});
