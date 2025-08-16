import axios from 'axios';

const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const SAFE_TICKERS = new Set([
  'NVDA','AMD','TSM','AAPL','AMZN','MSFT','META','TSLA','AVGO','QCOM','INTC','MU','SMH','SOXX','SPY','QQQ','DIA','IWM','XLE','XLF','XLK','GDX','GLD','USO','TLT','HYG'
]);

export async function analyzePost(text: string): Promise<{ summary: string; tickers: string[] }> {
  const system = `You are a cautious market analyst. Given a political post, extract at most 4 US-listed tickers or ETFs directly impacted. Prefer large, liquid names. Avoid hallucinations. Output JSON.`;
  const user = `Post: """${text}"""\nReturn JSON: {"summary": "<one crisp sentence>", "tickers": ["TICKER", ...]}`;
  const r = await axios.post('https://api.openai.com/v1/chat/completions', {
    model,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    temperature: 0.2
  }, { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } });

  let out: any = {};
  try { out = JSON.parse(r.data.choices[0].message.content); } catch {}
  let tickers: string[] = Array.isArray(out.tickers) ? out.tickers : [];
  tickers = tickers.filter(t => SAFE_TICKERS.has(t.toUpperCase())).slice(0, 4);
  const summary: string = out.summary || 'No clear market impact.';
  if (tickers.length === 0) tickers = ['SPY'];
  return { summary, tickers };
}
