import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_API_KEY!;
const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: modelName });

const SAFE_TICKERS = new Set([
  'NVDA','AMD','TSM','AAPL','AMZN','MSFT','META','TSLA','AVGO','QCOM','INTC','MU','SMH','SOXX','SPY','QQQ','DIA','IWM','XLE','XLF','XLK','GDX','GLD','USO','TLT','HYG'
]);

export async function analyzePost(text: string): Promise<{ summary: string; tickers: string[] }> {
  const prompt = [
    'You are a cautious market analyst. Given a political post, return JSON with a one-sentence summary and up to 4 US-listed liquid tickers/ETFs directly impacted.',
    'Prefer large caps / ETFs. Avoid hallucinations. If uncertain, use SPY only.',
    'Return ONLY JSON with keys: summary, tickers.',
    `Post:\n"""${text}"""`
  ].join('\n');

  const res = await model.generateContent(prompt);
  let content = res.response.text() || '';

  // Extract first JSON block if the model wrapped it in backticks
  const m = content.match(/\{[\s\S]*\}/);
  const jsonStr = m ? m[0] : content.trim();

  let out: any = {};
  try { out = JSON.parse(jsonStr); } catch { out = {}; }

  let tickers: string[] = Array.isArray(out.tickers) ? out.tickers : [];
  tickers = tickers.map(t => String(t).toUpperCase()).filter(t => SAFE_TICKERS.has(t)).slice(0, 4);
  const summary: string = out.summary || 'No clear market impact.';
  if (tickers.length === 0) tickers = ['SPY'];
  return { summary, tickers };
}
