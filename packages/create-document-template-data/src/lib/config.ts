// config.ts - Centralized config for OpenAI/Azure embedding variables
import { AzureOpenAIConfig } from '@dfb/ai';
export interface AzureOpenAIEnvConfig {
  apiKey: string | undefined;
  endpoint: string | undefined;
  embeddingDeployment: string | undefined;
  embeddingApiVersion: string | undefined;
  llmDeployment: string | undefined;
  llmApiVersion: string | undefined;
  summarizationModel: string | undefined;
  summarizationApiVersion: string | undefined;
}

export function getAzureOpenAIConfig(): AzureOpenAIEnvConfig {
  const config: AzureOpenAIEnvConfig = {
    apiKey: process.env.OPENAI_API_KEY,
    endpoint: process.env.OPENAI_ENDPOINT,
    embeddingDeployment: process.env.OPENAI_EMBEDDING_DEPLOYMENT_NAME,
    embeddingApiVersion: process.env.OPENAI_EMBEDDING_API_VERSION,
    llmDeployment: process.env.OPENAI_LLM_DEPLOYMENT_NAME,
    llmApiVersion: process.env.OPENAI_LLM_API_VERSION,
    summarizationModel: process.env.OPENAI_SUMMARIZATION_MODEL_NAME,
    summarizationApiVersion: process.env.OPENAI_SUMMARIZATION_API_VERSION,
  };

  const unset: string[] = Object.entries(config)
    .filter(([_, value]) => !value)
    .map(([key]) => key);
  if (unset.length > 0) {
    console.warn(
      `OpenAI config: The following environment variables are unset: ${unset.join(', ')}`
    );
  }

  console.log(config);

  return config;
}

export type OpenAiConfigModels = {
  aiEmbeddingConfig: AzureOpenAIConfig;
  aiSummaryConfig: AzureOpenAIConfig;
};

export function setupConfigForAi(): OpenAiConfigModels {
  const config: AzureOpenAIEnvConfig = getAzureOpenAIConfig();

  const aiEmbeddingConfig: AzureOpenAIConfig = {
    apiKey: config.apiKey,
    endpoint: config.endpoint,
    deployment: config.embeddingDeployment,
    apiVersion: config.embeddingApiVersion,
  };

  const aiSummaryConfig: AzureOpenAIConfig = {
    apiKey: config.apiKey,
    endpoint: config.endpoint,
    deployment: config.summarizationModel,
    apiVersion: config.summarizationApiVersion,
  };

  return { aiEmbeddingConfig, aiSummaryConfig };
}
