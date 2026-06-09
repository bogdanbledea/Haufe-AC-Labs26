import OpenAI from 'openai';

const PROVIDER = process.env.LLM_PROVIDER || 'groq'; // 'groq' | 'ollama'
const isOllama = PROVIDER === 'ollama';

const llm = new OpenAI(
  isOllama
    ? {
        baseURL: `${process.env.OLLAMA_URL || 'http://localhost:11434'}/v1`,
        apiKey: 'ollama',
      }
    : {
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
      }
);

const MODEL = isOllama
  ? (process.env.OLLAMA_MODEL || 'llama3.2:3b')
  : (process.env.GROQ_MODEL || 'llama-3.1-8b-instant');

export { llm, MODEL, PROVIDER, isOllama };
