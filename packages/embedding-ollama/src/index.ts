import fetch from 'node-fetch';
// the Ollama server must be running and accessible at the specified URL
// (default: http://localhost:11434) for this function to work.

/**
 * Generates an embedding for the given text using the Ollama model "nomic-embed-text".
 * @param text The input text to embed.
 * @param ollamaUrl The base URL of the Ollama API (default: http://localhost:11434).
 * @returns The embedding as an array of numbers.
 */
export interface OllamaEmbeddingResponse {
  embedding?: number[]; // for single input
  embeddings?: number[][]; // for batch input
}
export async function generateEmbedding(
  text: string,
  ollamaUrl = 'http://localhost:11434'
): Promise<number[]> {
  const response = await fetch(`${ollamaUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'nomic-embed-text',
      prompt: text,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama API error: ${response.status} ${response.statusText}`
    );
  }

  const data: OllamaEmbeddingResponse =
    (await response.json()) as OllamaEmbeddingResponse;

  if (!data.embeddings || data.embeddings.length === 0) {
    throw new Error('No embeddings returned from Ollama');
  }
  return data?.embeddings[0] as unknown as number[];
}
