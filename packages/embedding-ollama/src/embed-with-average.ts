import fetch from 'node-fetch';
import { encode } from 'gpt-3-encoder';

const MAX_TOKENS = 7500;
const MODEL_NAME = 'nomic-embed-text';
const OLLAMA_URL = 'http://localhost:11434/api/embeddings';

export interface ChatGptResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'system' | 'user' | 'assistant';
      content: string;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
export interface OllamaEmbeddingResponse {
  embedding?: number[]; // for single input
  embeddings?: number[][]; // for batch input
}
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
    throw new Error(`Ollama error: ${response.statusText}`);
  }

  const data: OllamaEmbeddingResponse =
    (await response.json()) as OllamaEmbeddingResponse;

  if (!data.embeddings || data.embeddings.length === 0) {
    throw new Error('No embeddings returned from Ollama');
  }
  return data?.embeddings[0] as unknown as number[];
}

function averageEmbedding(vectors: number[][]): number[] {
  const length = vectors[0].length;
  const sum = new Array(length).fill(0);

  for (const vec of vectors) {
    for (let i = 0; i < length; i++) {
      sum[i] += vec[i];
    }
  }

  return sum.map(val => val / vectors.length);
}

interface EmbedOptions {
  average?: boolean;
}

/**
 * Embeds a long text by chunking and sending each part to Ollama.
 * If `average: true` is passed, returns a single averaged vector.
 */
export async function embedTextWithOllama(
  text: string,
  options: EmbedOptions = {}
): Promise<number[] | number[][]> {
  const chunks = chunkText(text);
  const embeddings: number[][] = [];

  for (const chunk of chunks) {
    const vector = await embedChunk(chunk);
    embeddings.push(vector);
  }

  if (options.average) {
    return averageEmbedding(embeddings);
  }

  return embeddings;
}
