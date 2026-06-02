import OpenAI from 'openai/index.mjs';

const PROVIDER = process.env.LLM_PROVIDER || 'groq'; // 'groq' | 'ollama'
const isOllama = PROVIDER === 'ollama';

if (!isOllama && !process.env.GROQ_API_KEY) {
  console.error('GROQ_API_KEY is not set (required when LLM_PROVIDER=groq)');
  process.exit(1);
}

// The whole point of the OpenAI SDK here: one client interface, two providers.
// Swap the baseURL (and the key) and the rest of the code is identical.
export const llm = new OpenAI(
  isOllama
    ? {
        baseURL: `${process.env.OLLAMA_URL || 'http://localhost:11434'}/v1`,
        apiKey: 'ollama', // Ollama doesn't validate the key, but the client requires one
      }
    : {
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
      }
);

// Groq model vs Ollama model — set independently so each machine can pick its own
export const MODEL = isOllama
  ? (process.env.OLLAMA_MODEL || 'llama3.2:3b')
  : (process.env.GROQ_MODEL || 'llama-3.1-8b-instant');

export { PROVIDER };

// Groq supports prompt caching via cache_control on system messages.
// Ollama ignores it but the client may reject the extra field — use a plain string instead.
export function sysMsg(text) {
  if (isOllama) {
    return { role: 'system', content: text };
  }
  return {
    role: 'system',
    content: [{ type: 'text', text, cache_control: { type: 'ephemeral' } }],
  };
}
