// This script orchestrates the advocate scraping and parsing pipeline in TypeScript
import { fetchAdvocatesPage, Advocate } from './fetch_advocates_page';
import { writeFile, mkdir } from 'fs/promises'; // Import writeFile and mkdir for saving JSON
import { dirname } from 'path';

async function main() {
  // Step 1: Fetch the advocates HTML page and save to advocates_page.txt
  const advocates: Advocate[] = await fetchAdvocatesPage();

  console.log('Total advocates fetched:', advocates.length);

  for (const advocate of advocates) {
    console.log(advocate);
  }

  // Add a timestamp to the file name
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = `./generated/advocates-${timestamp}.json`;

  // Ensure the generated folder exists
  await mkdir(dirname(filePath), { recursive: true });

  // Save advocates to a JSON file
  await writeFile(filePath, JSON.stringify(advocates, null, 2));
  console.log(`Advocates saved to ${filePath}`);
}

main().catch(console.error);