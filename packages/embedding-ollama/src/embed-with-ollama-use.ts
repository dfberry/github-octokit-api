import { embedTextWithOllama } from './embed-with-ollama.js';

const longGitHubText = `
# My Project

This is a README file with lots of content...
(Imagine this is a long GitHub issue or markdown doc)
`;

embedTextWithOllama(longGitHubText)
  .then(vectors => {
    console.log(`Generated ${vectors.length} embedding chunks.`);
    console.log(vectors[0]); // First embedding vector
  })
  .catch(console.error);
