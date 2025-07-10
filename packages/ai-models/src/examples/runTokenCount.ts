import { encoding_for_model } from '@dqbd/tiktoken';
import { Tiktoken } from 'js-tiktoken/lite';
import cl100k_base from 'js-tiktoken/ranks/cl100k_base';

const text = "hello world";

// @dqbd/tiktoken
const enc1 = encoding_for_model('gpt-4o');
const tokens1 = enc1.encode(text);
console.log('[tiktoken] Token count:', tokens1.length);
enc1.free();

// js-tiktoken
const enc2 = new Tiktoken(cl100k_base);
const tokens2 = enc2.encode(text);
console.log('[js-tiktoken] Token count:', tokens2.length);
// enc2.free(); // REMOVE THIS LINE, not needed