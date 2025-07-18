import { createCompletionWithRetry, createEmbedding, AzureOpenAIConfig, getMaxTokens, countTokens } from '@dfb/ai';
import type { AzureClientOptions } from 'openai/azure';

export async function createVector(embeddingConfig: AzureClientOptions, query: string): Promise<number[]> {
    try {

        const result = await createEmbedding(embeddingConfig as unknown as AzureOpenAIConfig, query);

        const queryVector = result.vector;
        return queryVector;
    } catch (error) {
        console.error('Error creating embedding for query:', error);
        throw error;
    }
}

export async function getLLMCompletion(llmConfig: AzureClientOptions, systemPrompt: string, userQuery: string, context: string): Promise<string | null> {

    if (!llmConfig.endpoint || !llmConfig.apiKey || !llmConfig.deployment) {
        throw new Error('Missing LLM configuration. Please check your settings.');
    }

    const maxTokens = getMaxTokens(llmConfig.deployment);
    console.log(`Using model ${llmConfig.deployment} with max tokens: ${maxTokens}`);

    const userPrompt = [
        "User question:",
        userQuery,
        "",
        "Repository information:",
        context
    ].join('\n');


    const currentTokens = countTokens(`${systemPrompt}, ${userPrompt}`);
    console.log(`Current tokens in prompt: ${currentTokens}`);

    const result = await createCompletionWithRetry(llmConfig as unknown as AzureOpenAIConfig, {
        systemPrompt,
        userPrompt
    })

    return result.choices[0].message.content;
}
