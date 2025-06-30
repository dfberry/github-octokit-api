import { AzureOpenAI,  } from 'openai';
import { reduceTextToMaxLengthWithPadding } from './maths.js';

const openai = new AzureOpenAI({
  endpoint: process.env.OPENAI_ENDPOINT!,
  apiKey: process.env.OPENAI_API_KEY!,
  apiVersion: process.env.OPENAI_API_VERSION!,
  deployment: process.env.OPENAI_DEPLOYMENT_NAME!,
});

export async function createVector(document: string): Promise<{vector:number[], tokens: {prompt_tokens:number, total_tokens:number}} > {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: document,
    });

    if (response.data && response.data.length > 0) {
      return {
        vector: response.data[0].embedding,
        tokens: response.usage,
      };
    } else {
      throw new Error('Failed to generate embedding');
    }
  } catch (error) {
    console.error('\t initial vectorizing errror:', error);
    throw error;
  }
}

// Add logic to handle errors and retry with scaled-down document size
export async function createVectorWithRetry(document: string): Promise<{vector:number[], tokens: {prompt_tokens:number, total_tokens:number}} > {

  let scaledDocument = '';

  try {

    const { vector, tokens} = await createVector(document);
    return {vector, tokens};
  } catch (error) {
    // Fix type errors by asserting the type of error
    if (error instanceof Error && error.message.includes('maximum context length')) {
      
      const paddingPercentage = 25; // Add n% padding to be safe for spaces 
      scaledDocument = reduceTextToMaxLengthWithPadding(document, error.message, paddingPercentage);

      try {
        console.log(`\r retrying with scaled-down document.`);
        const { vector, tokens} = await createVector(scaledDocument);
        return {vector, tokens};
      } catch (retryError) {
        console.error('Error creating vector after retry:', retryError);
        throw retryError;
      }
    } else {
      console.error('Error creating vector for document:', error);
      throw error;
    }
  }
}
