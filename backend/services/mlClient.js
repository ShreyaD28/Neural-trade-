const axios = require('axios');
const OpenAI = require('openai');

function getMlBaseUrl() {
  const url = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  return url.replace(/\/$/, '');
}

/**
 * Proxy a lightweight signal request to the optional ML HTTP service.
 */
async function quickSignalFromMlService(symbol, features) {
  const base = getMlBaseUrl();
  const { data } = await axios.post(
    `${base}/signal`,
    { symbol, features: features ?? {} },
    { timeout: 10_000 }
  );
  return { source: 'ml-service', symbol, data };
}

let openaiClient = null;
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Short narrative for UI — not financial advice.
 */
async function narrativeSignalWithOpenAI({
  symbol,
  candlesSummary,
  question,
}) {
  const client = getOpenAI();
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a trading platform assistant. Be concise, neutral, and clearly state that this is not financial advice. No specific buy/sell instructions.',
      },
      {
        role: 'user',
        content: `Symbol: ${symbol}\nRecent market context:\n${candlesSummary}\n\nQuestion: ${question}`,
      },
    ],
    max_tokens: 400,
  });
  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('Empty LLM response');
  }
  return text;
}

module.exports = {
  quickSignalFromMlService,
  narrativeSignalWithOpenAI,
};
