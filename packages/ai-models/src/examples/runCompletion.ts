
import { createCompletionWithRetry } from '../completion.js';

const apiKey = process.env.OPENAI_API_KEY!;
const apiVersion = "2024-04-01-preview";
const endpoint = "https://openai-intell.openai.azure.com/";
const deployment = "gpt-35-turbo";
const config = { endpoint, apiKey, deployment, apiVersion };


async function main() {
  try {
    const options = {
      systemPrompt: "You are a helpful assistant.",
      userPrompt: "I am going to Paris, what should I see?",
      maxTokens: 4096,
      temperature: 1,
    };
    const response = await createCompletionWithRetry(config, options);
    // For ChatCompletion, the content is in response.choices[0].message.content
    console.log(response.choices[0].message.content);
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
}

main().catch((err) => {
  console.error("The sample encountered an error:", err);
});

main().catch((err) => {
  console.error("The sample encountered an error:", err);
});