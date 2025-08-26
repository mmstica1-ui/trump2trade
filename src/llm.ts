import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_API_KEY!;
const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: modelName });

const SAFE_TICKERS = new Set([
  // Tech Stocks
  'NVDA','AMD','TSM','AAPL','AMZN','MSFT','META','TSLA','AVGO','QCOM','INTC','MU','GOOGL','NFLX','CRM','ORCL','ADBE',
  // Tech ETFs
  'SMH','SOXX','XLK','VGT','FTEC',
  // Market ETFs
  'SPY','QQQ','DIA','IWM','VTI','VOO',
  // Sector ETFs
  'XLE','XLF','XLI','XLV','XLP','XLU','XLB','XLRE','XLY',
  // International/China
  'FXI','ASHR','MCHI','EEM','VWO','IEMG',
  // Commodities & Defense
  'GDX','GLD','USO','DBA','XME',
  // Bonds & Rates
  'TLT','HYG','LQD','SHY','IEF'
]);

export async function analyzePost(text: string): Promise<{ summary: string; tickers: string[] }> {
  const prompt = [
    'You are an expert financial analyst specializing in Trump policy impact on markets.',
    'Analyze this Trump post and identify specific market implications.',
    '',
    'Guidelines:',
    '- Focus on DIRECT market impacts (tariffs→affected sectors, regulations→specific industries)',  
    '- For China/trade: Use FXI, ASHR, or affected sectors like XLI, XLE',
    '- For tech regulation: Use XLK, individual tech stocks, or VGT',
    '- For general market: Use SPY, QQQ, DIA, IWM',
    '- For energy: Use XLE, USO, or energy stocks',
    '- Choose 2-4 most relevant tickers that would move on this news',
    '',
    'Return ONLY JSON with keys: summary, tickers',
    'Summary should be 1-2 sentences explaining the market impact.',
    '',
    `Trump Post: "${text}"`
  ].join('\n');

  const res = await model.generateContent(prompt);
  let content = res.response.text() || '';

  const m = content.match(/\{[\s\S]*\}/);
  const jsonStr = m ? m[0] : content.trim();

  let out: any = {};
  try { out = JSON.parse(jsonStr); } catch { out = {}; }

  let tickers: string[] = Array.isArray(out.tickers) ? out.tickers : [];
  tickers = tickers.map(t => String(t).toUpperCase()).filter(t => SAFE_TICKERS.has(t)).slice(0, 4);
  const summary: string = out.summary || 'No clear market impact identified.';
  if (tickers.length === 0) tickers = ['SPY'];
  return { summary, tickers };
}
