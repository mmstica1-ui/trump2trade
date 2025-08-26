import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_API_KEY!;
const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: modelName });

// Enhanced ticker categories for better policy-to-market mapping
const SAFE_TICKERS = new Set([
  // Tech Stocks (AI, semiconductors, social media)
  'NVDA','AMD','TSM','AAPL','AMZN','MSFT','META','TSLA','AVGO','QCOM','INTC','MU','GOOGL','NFLX','CRM','ORCL','ADBE',
  // Tech ETFs
  'SMH','SOXX','XLK','VGT','FTEC',
  // Market ETFs  
  'SPY','QQQ','DIA','IWM','VTI','VOO',
  // Sector ETFs (policy-sensitive sectors)
  'XLE','XLF','XLI','XLV','XLP','XLU','XLB','XLRE','XLY','XAR','XTN','XME','XHB',
  // International/China (trade policy)
  'FXI','ASHR','MCHI','EEM','VWO','IEMG','YINN','YANG',
  // Commodities & Defense (geopolitical impact)
  'GDX','GLD','USO','DBA','XME','ITA','PPA',
  // Bonds & Rates (Fed policy)
  'TLT','HYG','LQD','SHY','IEF','TIP','GOVT',
  // Currency (international trade)
  'UUP','FXE','FXY','UDN'
]);

// Policy-to-ticker mapping for better relevance
const POLICY_TICKER_MAP = {
  'china|tariff|trade_war': ['FXI', 'ASHR', 'MCHI', 'XLI', 'SPY'],
  'tech|ai|social_media|regulation': ['XLK', 'META', 'GOOGL', 'NVDA', 'QQQ'],
  'energy|oil|drill|pipeline': ['XLE', 'USO', 'XOM', 'CVX'],
  'defense|military|ukraine|war': ['ITA', 'PPA', 'LMT', 'RTX'],
  'tax|corporate|business': ['SPY', 'QQQ', 'XLF', 'IWM'],
  'immigration|border|wall': ['XLI', 'XLB', 'SPY'],
  'healthcare|drug|pharma': ['XLV', 'PFE', 'JNJ'],
  'fed|interest|rate|inflation': ['TLT', 'XLF', 'IEF', 'SPY']
};

export async function analyzePost(text: string): Promise<{ summary: string; tickers: string[]; relevanceScore: number }> {
  // Check if we have a valid API key
  if (!apiKey || apiKey === 'your-google-api-key-here') {
    console.log('⚠️ Using mock analysis - no valid Google API key');
    return getMockAnalysis(text);
  }
  const prompt = [
    'You are an expert financial analyst specializing in Trump policy impact on markets.',
    'Analyze this Trump post and identify specific, DIRECTLY RELEVANT market implications.',
    '',
    'CRITICAL REQUIREMENTS:',
    '- ONLY select tickers that are DIRECTLY impacted by the specific content mentioned',
    '- If the post mentions China/tariffs → FXI, ASHR, MCHI, XLI (manufacturing)',
    '- If tech regulation/social media → XLK, META, GOOGL, NVDA',
    '- If energy/drilling mentioned → XLE, USO, energy companies', 
    '- If military/defense mentioned → ITA, defense contractors',
    '- If taxes/corporate policy → SPY, QQQ, XLF',
    '- If NO specific policy mentioned → use broad market: SPY, QQQ',
    '',
    'TICKER SELECTION RULES:',
    '- Maximum 3 tickers for focused impact',
    '- Each ticker must have clear relevance to the post content',
    '- Avoid generic selections unless post is general market commentary',
    '',
    'Return ONLY JSON with keys: summary, tickers, relevanceScore (1-10)',
    'Summary: 1-2 sentences explaining WHY these tickers are relevant.',
    'relevanceScore: Rate how directly relevant tickers are to post content (1=weak, 10=perfect)',
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
  tickers = tickers.map(t => String(t).toUpperCase()).filter(t => SAFE_TICKERS.has(t)).slice(0, 3); // Reduced to 3 for focus
  
  const summary: string = out.summary || 'No clear market impact identified.';
  const relevanceScore: number = Number(out.relevanceScore) || 5;
  
  // Enhanced relevance validation - if relevance is low, use broader market tickers
  if (tickers.length === 0 || relevanceScore < 4) {
    tickers = getRelevantTickersFromText(text);
  }
  
  return { summary, tickers, relevanceScore };
}

// Mock analysis for testing without API key
function getMockAnalysis(text: string): { summary: string; tickers: string[]; relevanceScore: number } {
  const textLower = text.toLowerCase();
  
  // China/Trade analysis
  if (textLower.includes('china') || textLower.includes('tariff') || textLower.includes('trade')) {
    return {
      summary: 'Trump\'s China trade rhetoric typically impacts Chinese equities, manufacturing sectors, and broad market indices through trade uncertainty.',
      tickers: ['FXI', 'ASHR', 'XLI'],
      relevanceScore: 9
    };
  }
  
  // Tech analysis
  if (textLower.includes('tech') || textLower.includes('social media') || textLower.includes('ai')) {
    return {
      summary: 'Technology sector regulation discussions can create volatility in tech stocks and related ETFs.',
      tickers: ['XLK', 'QQQ', 'META'],
      relevanceScore: 8
    };
  }
  
  // Energy analysis
  if (textLower.includes('energy') || textLower.includes('oil') || textLower.includes('drill')) {
    return {
      summary: 'Energy policy changes typically boost energy sector equities and related commodity funds.',
      tickers: ['XLE', 'USO'],
      relevanceScore: 9
    };
  }
  
  // Default broad market
  return {
    summary: 'General policy announcement with potential broad market implications across major indices.',
    tickers: ['SPY', 'QQQ'],
    relevanceScore: 5
  };
}

// Helper function to extract relevant tickers based on text content
function getRelevantTickersFromText(text: string): string[] {
  const textLower = text.toLowerCase();
  
  // Check for policy keywords and return relevant tickers
  for (const [keywords, tickerList] of Object.entries(POLICY_TICKER_MAP)) {
    const keywordRegex = new RegExp(keywords.replace(/\|/g, '|'), 'i');
    if (keywordRegex.test(text)) {
      return tickerList.slice(0, 3); // Return first 3 relevant tickers
    }
  }
  
  // Default to broad market if no specific policy identified
  return ['SPY', 'QQQ'];
}
