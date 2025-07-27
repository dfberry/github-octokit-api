
import { countTokens, getTrimmedText, getMaxTokens } from '../tokenCount.js';

const model = 'gpt-4o';
const text = "hello world. This is a test. Here is another sentence!";

console.log('Model:', model);
console.log('Text:', text);
console.log('Max tokens for model:', getMaxTokens(model));
console.log('Token count:', countTokens(text));
console.log('Trimmed text:', getTrimmedText(text, model));