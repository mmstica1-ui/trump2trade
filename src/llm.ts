import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_API_KEY!;
const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const genAI = new GoogleGenerativeAI(apiKey);

// ⚡ OPTIMIZED MODEL CONFIG for fastest response
const model = genAI.getGenerativeModel({ 
  model: modelName,
  generationConfig: {
    temperature: 0.1, // Lower temperature for faster, more deterministic responses
    topK: 10,         // Reduce token search space
    topP: 0.8,        // Focus on high-probability tokens
    maxOutputTokens: 200, // Limit response length for speed
  },
});

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

export async function analyzePost(
  text: string, 
  mediaUrls?: string[]
): Promise<{ 
  summary: string; 
  tickers: string[]; 
  relevanceScore: number;
  tickerAnalysis?: Array<{symbol: string; impact: 'positive' | 'negative'; reason: string}>;
}> {
  // Check if we have a valid API key or we're in development mock mode
  if (!apiKey || apiKey === 'your-google-api-key-here' || apiKey === 'DEVELOPMENT_MOCK_MODE') {
    console.log('🔧 Development mock mode: Using sample data for Trump post analysis');
    // Update monitoring status for no API key
    try {
      const { getMonitor } = await import('./monitoring.js');
      const monitor = getMonitor();
      monitor.setConnectionStatus('gemini', false);
      console.log('📊 Updated Gemini status to disconnected (no API key)');
    } catch (monitorError: any) {
      console.log('⚠️ Could not update Gemini no-key status:', monitorError?.message || monitorError);
    }
    return getMockAnalysis(text, mediaUrls);
  }
  
  // ⚡ SPEED OPTIMIZATION - Start timing
  const startTime = Date.now();
  
  // Enhanced prompt with media analysis capability
  let prompt = `FAST ANALYSIS: Trump post market impact.

Post: "${text.substring(0, 200)}"`;

  // Add media analysis if present
  if (mediaUrls && mediaUrls.length > 0) {
    const mediaTypes = mediaUrls.map(url => {
      const ext = url.split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'image';
      if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) return 'video';
      return 'media';
    });
    
    prompt += `

Media Content: Contains ${mediaTypes.join(', ')} (${mediaUrls.length} files)
Note: Post includes visual content that may contain additional context about policy, events, or market-relevant information.`;
  }

  prompt += `

Return JSON only:
{
  "summary": "1 sentence market impact",
  "tickers": ["max 3 most relevant tickers"],
  "relevanceScore": number_1_to_10
}

Rules:
- China/trade: FXI,ASHR,XLI
- Tech: XLK,META,GOOGL  
- Energy: XLE,USO
- General: SPY,QQQ
- Defense: ITA
- Media content may provide additional context for analysis`;

  try {
    // ⚡ TIMEOUT PROTECTION - Max 5 seconds for AI
    const generatePromise = model.generateContent(prompt);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Gemini timeout')), 5000)
    );
    
    const res = await Promise.race([generatePromise, timeoutPromise]) as any;
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
    
    const processingTime = Date.now() - startTime;
    console.log(`⚡ Gemini AI analysis completed in ${processingTime}ms`);
    
    // Generate detailed ticker analysis for proper message formatting
    const tickerAnalysis = generateTickerAnalysis(tickers, text);
    
    // Update monitoring status for successful analysis
    try {
      const { getMonitor } = await import('./monitoring.js');
      const monitor = getMonitor();
      monitor.setConnectionStatus('gemini', true);
      console.log('📊 Updated Gemini status to connected');
    } catch (error: any) {
      console.log('⚠️ Could not update Gemini monitoring status:', error?.message || error);
    }
    
    return { summary, tickers, relevanceScore, tickerAnalysis };
    
  } catch (error) {
    console.error('❌ Gemini analysis failed:', error);
    
    // Update monitoring status for failed analysis
    try {
      const { getMonitor } = await import('./monitoring.js');
      const monitor = getMonitor();
      monitor.setConnectionStatus('gemini', false);
      console.log('📊 Updated Gemini status to disconnected due to error');
    } catch (monitorError: any) {
      console.log('⚠️ Could not update Gemini error status:', monitorError?.message || monitorError);
    }
    
    // Fallback to text-based analysis
    return getMockAnalysis(text);
  }
}

// Mock analysis for testing without API key
function getMockAnalysis(text: string, mediaUrls?: string[]): { 
  summary: string; 
  tickers: string[]; 
  relevanceScore: number;
  tickerAnalysis: Array<{symbol: string; impact: 'positive' | 'negative'; reason: string}>;
} {
  const textLower = text.toLowerCase();
  let tickers: string[];
  let summary: string;
  let relevanceScore: number;
  
  // Media presence boosts relevance
  const hasMedia = mediaUrls && mediaUrls.length > 0;
  const mediaBoost = hasMedia ? 2 : 0; // Add 2 points for posts with media
  
  // Media-only posts (no meaningful text but has video/image)
  if (hasMedia && (textLower.includes('http') || textLower.includes('link:') || textLower.length < 50)) {
    summary = hasMedia ? 'Trump shared visual content that may contain policy or market-relevant information requiring analysis.' : 'Limited text content available for analysis.';
    tickers = ['SPY', 'QQQ', 'DIA'];
    relevanceScore = Math.min(6 + mediaBoost, 10);
  }
  
  // China/Trade analysis
  else if (textLower.includes('china') || textLower.includes('tariff') || textLower.includes('trade')) {
    summary = hasMedia ? 'Trump\'s China trade content with visual elements may signal policy changes affecting Chinese equities and trade-sensitive sectors.' : 'Trump\'s China trade rhetoric typically impacts Chinese equities, manufacturing sectors, and broad market indices through trade uncertainty.';
    tickers = ['FXI', 'ASHR', 'XLI'];
    relevanceScore = Math.min(9 + mediaBoost, 10);
  }
  
  // Tech + Energy analysis (combined topics get higher relevance)
  else if ((textLower.includes('ai') || textLower.includes('tech')) && 
           (textLower.includes('energy') || textLower.includes('dominate'))) {
    summary = hasMedia ? 'Trump\'s AI and energy content with visual materials could signal significant policy initiatives affecting technology and energy sectors.' : 'Trump\'s vision for AI and energy dominance could significantly boost technology and energy sectors.';
    tickers = ['XLK', 'XLE', 'QQQ'];
    relevanceScore = Math.min(9 + mediaBoost, 10);
  }
  
  // Tech analysis
  else if (textLower.includes('tech') || textLower.includes('social media') || textLower.includes('ai')) {
    summary = hasMedia ? 'Technology-focused content with visual elements may indicate regulatory or policy changes affecting tech stocks.' : 'Technology sector regulation discussions can create volatility in tech stocks and related ETFs.';
    tickers = ['XLK', 'QQQ', 'META'];
    relevanceScore = Math.min(8 + mediaBoost, 10);
  }
  
  // Energy analysis
  else if (textLower.includes('energy') || textLower.includes('oil') || textLower.includes('drill')) {
    summary = hasMedia ? 'Energy-related content with visual materials could signal policy changes benefiting energy sector equities.' : 'Energy policy changes typically boost energy sector equities and related commodity funds.';
    tickers = ['XLE', 'USO'];
    relevanceScore = Math.min(9 + mediaBoost, 10);
  }
  
  // Default broad market
  else {
    summary = hasMedia ? 'Trump post with visual content may contain policy or market-relevant information affecting broad market sentiment.' : 'General policy announcement with potential broad market implications across major indices.';
    tickers = ['SPY', 'QQQ'];
    relevanceScore = Math.min(5 + mediaBoost, 10);
  }
  
  // Generate ticker analysis using the same function
  const tickerAnalysis = generateTickerAnalysis(tickers, text);
  
  return { summary, tickers, relevanceScore, tickerAnalysis };
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

// Generate detailed ticker analysis from tickers and post content
function generateTickerAnalysis(tickers: string[], text: string): Array<{symbol: string; impact: 'positive' | 'negative'; reason: string}> {
  const textLower = text.toLowerCase();
  const tickerAnalysis: Array<{symbol: string; impact: 'positive' | 'negative'; reason: string}> = [];
  
  for (const ticker of tickers.slice(0, 3)) { // Max 3 tickers for clean display
    let impact: 'positive' | 'negative' = 'positive'; // Default bullish
    let reason = 'Market impact';
    
    // Tech/AI analysis
    if ((textLower.includes('ai') || textLower.includes('tech') || textLower.includes('innovation') || textLower.includes('dominate')) && 
        ['NVDA', 'AMD', 'XLK', 'QQQ', 'GOOGL', 'META', 'AAPL', 'MSFT'].includes(ticker)) {
      impact = 'positive';
      reason = ticker === 'NVDA' ? 'AI dominance leadership' :
               ticker === 'XLK' ? 'Technology sector dominance' :
               ticker === 'QQQ' ? 'Tech leadership strength' :
               'Innovation sector boost';
    }
    
    // Energy analysis  
    else if ((textLower.includes('energy') || textLower.includes('oil') || textLower.includes('drill') || textLower.includes('independence')) &&
             ['XLE', 'USO', 'XOM', 'CVX'].includes(ticker)) {
      impact = 'positive';
      reason = ticker === 'XLE' ? 'Energy independence dominance' :
               ticker === 'USO' ? 'Oil sector leadership' :
               'Energy dominance policy';
    }
    
    // China/Trade analysis
    else if ((textLower.includes('china') || textLower.includes('tariff') || textLower.includes('trade')) &&
             ['FXI', 'ASHR', 'MCHI'].includes(ticker)) {
      impact = 'negative';
      reason = ticker === 'FXI' ? 'China trade tensions' :
               ticker === 'ASHR' ? 'Chinese market pressure' :
               'Trade war escalation';
    }
    
    // Defense/Military
    else if ((textLower.includes('defense') || textLower.includes('military') || textLower.includes('war')) &&
             ['ITA', 'PPA', 'LMT', 'RTX'].includes(ticker)) {
      impact = 'positive';
      reason = ticker === 'ITA' ? 'Defense spending increase' :
               'Military contracts boost';
    }
    
    // Federal Reserve/Interest rates
    else if ((textLower.includes('fed') || textLower.includes('rate') || textLower.includes('inflation')) &&
             ['TLT', 'XLF', 'IEF'].includes(ticker)) {
      // Determine impact based on sentiment
      if (textLower.includes('cut') || textLower.includes('lower')) {
        impact = ticker === 'TLT' ? 'positive' : 'negative';
        reason = ticker === 'TLT' ? 'Bond rally expected' : 'Rate cut pressure';
      } else {
        impact = ticker === 'XLF' ? 'positive' : 'negative';
        reason = ticker === 'XLF' ? 'Banking sector gains' : 'Rising rate pressure';
      }
    }
    
    // Broad market tickers
    else if (['SPY', 'QQQ', 'DIA', 'IWM'].includes(ticker)) {
      // Analyze overall sentiment for market impact
      const bullishWords = ['great', 'amazing', 'win', 'best', 'strong', 'success'];
      const bearishWords = ['destroy', 'terrible', 'bad', 'fail', 'disaster', 'crisis'];
      
      const bullishCount = bullishWords.filter(word => textLower.includes(word)).length;
      const bearishCount = bearishWords.filter(word => textLower.includes(word)).length;
      
      impact = bearishCount > bullishCount ? 'negative' : 'positive';
      reason = ticker === 'SPY' ? 'Broad market sentiment' :
               ticker === 'QQQ' ? 'Tech sector momentum' :
               ticker === 'DIA' ? 'Blue chip impact' :
               'Small cap reaction';
    }
    
    // Default analysis
    else {
      impact = 'positive';
      reason = 'Policy implementation impact';
    }
    
    tickerAnalysis.push({ symbol: ticker, impact, reason });
  }
  
  return tickerAnalysis;
}
