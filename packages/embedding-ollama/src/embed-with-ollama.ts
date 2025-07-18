import fetch from 'node-fetch';
import { encode } from 'gpt-3-encoder';

const MAX_TOKENS = 7500; // Conservative limit under 8192
const MODEL_NAME = 'nomic-embed-text';
const OLLAMA_URL = 'http://localhost:11434/api/embeddings';

export interface OllamaEmbeddingResponse {
  embedding?: number[]; // for single input
  embeddings?: number[][]; // for batch input
}

/**
 * Splits input text into token-safe chunks.
 */
function chunkText(text: string, maxTokens: number = MAX_TOKENS): string[] {
  const tokens = encode(text);
  const chunks: string[] = [];

  for (let i = 0; i < tokens.length; i += maxTokens) {
    const chunkTokens = tokens.slice(i, i + maxTokens);
    const chunkText = chunkTokens.map(t => String.fromCharCode(t)).join('');
    chunks.push(chunkText);
  }

  return chunks;
}

/**
 * Sends a single chunk to Ollama for embedding.
 */
async function embedChunk(chunk: string): Promise<number[]> {
  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL_NAME,
      input: chunk,
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

/**
 * Embeds a long text by chunking and sending each part to Ollama.
 */
export async function embedTextWithOllama(text: string): Promise<number[][]> {
  const chunks = chunkText(text);
  const embeddings: number[][] = [];

  for (const chunk of chunks) {
    const vector = await embedChunk(chunk);
    embeddings.push(vector);
  }

  return embeddings;
}
