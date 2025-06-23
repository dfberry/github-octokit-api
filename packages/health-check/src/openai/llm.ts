import OpenAI from 'openai';

const openaiApiKey = process.env.OPENAI_API_KEY || '';
const openai = new OpenAI({ apiKey: openaiApiKey });

export async function getAnswerFromLLM({
  systemPrompt,
  userPrompt,
  context,
  query,
}: {
  systemPrompt: string;
  userPrompt: string;
  context: string;
  query: string;
}): Promise<string> {
  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
      { role: 'assistant', content: context },
      { role: 'user', content: query },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages as any, // Explicitly cast to avoid type mismatch
    });

    if (
      response.choices &&
      response.choices.length > 0 &&
      response.choices[0].message?.content
    ) {
      return response.choices[0].message.content;
    } else {
      throw new Error('No response from LLM');
    }
  } catch (error) {
    console.error('Error getting answer from LLM:', error);
    throw error;
  }
}
