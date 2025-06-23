import { createVector } from '../openai/embedding.js';
import { getClient, upsertItem } from './crud.js';

export async function processAndUpsertDocument(document: any) {
  try {
    const { containerClient } = await getClient();

    // Generate vector for the document
    const vectorizedDocumentData = createStringFromDocumentProperties(document);
    const vector = await createVector(vectorizedDocumentData);

    // Add the vector to the document
    document.vector = vector;

    // Upsert the document
    await upsertItem(containerClient, document);

    console.log('Document processed and upserted successfully.');
  } catch (error) {
    console.error('Error processing and upserting document:', error);
    throw error;
  }
}
// Overly simplified function to create a string from document properties
// This function assumes that the document is a simple object with string and number properties.
// In a real-world scenario, you would likely need to handle more complex data structures.
// It is also important to ensure that the properties are sanitized and formatted correctly.
export function createStringFromDocumentProperties(
  document: Record<string, any>
): string {
  let result = '';

  for (const [key, value] of Object.entries(document)) {
    if (typeof value === 'string') {
      result += `${key}: ${value}\n`;
    } else if (typeof value === 'number') {
      result += `${key}: ${value.toString()}\n`;
    }
  }

  return result.trim();
}
