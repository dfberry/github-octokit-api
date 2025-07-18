import { embedTextWithOllama } from './embed-with-average.js';

const longText = `# GitHub README\nThis is a long markdown file...`;

const averaged = await embedTextWithOllama(longText, { average: true });
console.log('🔹 Averaged embedding vector:', averaged);

const allChunks = await embedTextWithOllama(longText, { average: false });
console.log(`🔹 ${allChunks.length} chunk vectors returned.`);
