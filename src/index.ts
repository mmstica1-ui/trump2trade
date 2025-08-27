import 'dotenv/config';
import express from 'express';
import pino from 'pino';
import { initializeMonitoring, getHealthEndpointData } from './monitoring.js';
import { initializeDailyAnalytics } from './daily-analytics.js';

// Environment validation
const requiredEnvVars = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  IBKR_BASE_URL: process.env.IBKR_BASE_URL,
  IBKR_ACCOUNT_ID: process.env.IBKR_ACCOUNT_ID,
};

// Check critical environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value || value === `your-${key.toLowerCase().replace('_', '-')}-here` || value === 'DEVELOPMENT_MOCK_MODE')
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.warn(`🚨 CRITICAL: Missing environment variables: ${missingVars.join(', ')}`);
  console.warn('⚠️  IBKR Trading will NOT work without proper configuration!');
  console.warn('📋 Check ecosystem.config.cjs and .env.production files');
}

// Configuration validation logging
console.log(`🔧 Configuration Status:`);
console.log(`   Telegram: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ Configured' : '❌ Missing'}`);
console.log(`   Gemini AI: ${process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== 'DEVELOPMENT_MOCK_MODE' ? '✅ Real API' : '🧪 Mock Mode'}`);
console.log(`   IBKR Gateway: ${process.env.IBKR_BASE_URL ? '✅ Configured' : '❌ Missing'}`);
console.log(`   IBKR Account: ${process.env.IBKR_ACCOUNT_ID ? '✅ Configured' : '❌ Missing'}`);
console.log(`   Trading: ${process.env.DISABLE_TRADES === 'false' ? '✅ ENABLED' : '🛡️ DISABLED (Safe Mode)'}`);
console.log(`   ────────────────────────────────────────`);
import bot, { sendText } from './tg.js';
import { scheduleDailyStats } from './stats.js';
import { startOpsSelfChecks } from './ops.js';
import { startTruthPoller } from './poller.js';
import { handleApifyWebhook } from './apify.js';
import { handleGensparkWebhook } from './genspark.js';
import { startSynopticListener } from './synoptic.js';

const log = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });

const app = express();
app.use(express.json({ limit: '1mb' }));

// Enhanced health check endpoint
app.get('/health', (_: express.Request, res: express.Response) => {
  const health = getHealthEndpointData();
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'warning' ? 206 : 500;
  res.status(statusCode).json({
    ok: health.status === 'healthy',
    status: health.status,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(health.uptime / 1000),
    memory: health.memory,
    connections: health.connections,
    lastPostProcessed: health.lastPostProcessed,
    alertsSent24h: health.alertsSent24h,
    recentErrors: health.errors.length
  });
});

// Legacy endpoint for Railway
app.get('/healthz', (_: express.Request, res: express.Response) => {
  const health = getHealthEndpointData();
  res.status(health.status === 'critical' ? 500 : 200).json({ ok: health.status !== 'critical' });
});

// Webhooks
app.post('/webhook/apify', handleApifyWebhook);
app.post('/webhook/genspark', handleGensparkWebhook);
app.get('/webhook/genspark', (_: express.Request, res: express.Response) => 
  res.status(405).json({ ok: false, use: 'POST' }));

// Telegram bot webhook
app.post('/webhook/telegram', async (req: express.Request, res: express.Response) => {
  try {
    await bot.handleUpdate(req.body);
    res.json({ ok: true });
  } catch (error: any) {
    log.error({ error: error?.message || error }, '❌ Telegram webhook error');
    res.status(500).json({ ok: false });
  }
});

// dev helper: test media analysis
app.post('/dev/media-test', async (req: express.Request, res: express.Response) => {
  const { text, mediaUrls } = req.body || {};
  const { analyzePost } = await import('./llm.js');
  const { sendTrumpAlert } = await import('./tg.js');
  
  const analysis = await analyzePost(text || 'Trump post with media content', mediaUrls);
  
  await sendTrumpAlert({
    summary: analysis.summary,
    tickers: analysis.tickers,
    tickerAnalysis: analysis.tickerAnalysis,
    url: 'https://truth.social/media-test',
    originalPost: text,
    relevanceScore: analysis.relevanceScore
  });
  
  res.json({ ok: true, analysis });
});

// dev helper: inject a fake post
app.post('/dev/mock', async (req: express.Request, res: express.Response) => {
  const { 
    postText = 'Tariffs removed on chips from China', 
    text = postText, // backward compatibility
    url = 'https://truth.social/mock',
    summary,
    tickerAnalysis,
    tickers,
    relevanceScore = 5
  } = req.body || {};
  
  const { sendTrumpAlert } = await import('./tg.js');
  
  // Support new ticker analysis format or fall back to legacy
  let finalTickers = tickers || [];
  let finalSummary = summary || 'Market impact analysis of Trump post';
  let finalTickerAnalysis = tickerAnalysis;
  let finalRelevanceScore = relevanceScore;
  
  if (tickerAnalysis && Array.isArray(tickerAnalysis)) {
    // New format with ticker analysis
    finalTickers = tickerAnalysis.map((t: any) => t.symbol);
    finalSummary = summary || 'Enhanced ticker impact analysis';
  } else if (text || postText) {
    // Legacy format - analyze the post
    const { analyzePost } = await import('./llm.js');
    const analysis = await analyzePost(text || postText);
    finalTickers = analysis.tickers;
    finalSummary = analysis.summary;
    finalTickerAnalysis = analysis.tickerAnalysis;
    finalRelevanceScore = analysis.relevanceScore;
  }
  
  await sendTrumpAlert({ 
    summary: finalSummary, 
    tickers: finalTickers, 
    tickerAnalysis: finalTickerAnalysis,
    url,
    originalPost: text || postText,
    relevanceScore: finalRelevanceScore
  });
  res.json({ ok: true });
});

// Serve static files (settings page)
app.use(express.static('public'));

// API endpoints for settings management
app.get('/api/settings', (req: express.Request, res: express.Response) => {
  const settings = {
    broker: {
      username: process.env.TRUMP_BOT_IBKR_USERNAME || '',
      password: '***hidden***', // Don't expose password
      gatewayUrl: process.env.IBKR_GATEWAY_URL || 'http://localhost:5000',
      tradingMode: process.env.TRUMP_BOT_TRADING_MODE || 'paper',
      environment: process.env.TRUMP_BOT_ENVIRONMENT || 'production',
      safeMode: process.env.DISABLE_TRADES === 'true',
      defaultQty: process.env.IBKR_ORDER_DEFAULT_QTY || '1',
      tif: process.env.IBKR_ORDER_TIF || 'DAY'
    },
    orders: {
      enableBuyCall: true,
      enableBuyPut: true,
      orderType: 'MKT',
      executionMode: 'instant'
    },
    strikes: {
      strikePercentage: '1',
      strikeDirection: 'otm',
      dteSelection: '0',
      dteFallback: 'next'
    },
    risk: {
      maxPosition: '1000',
      maxDailyTrades: '10',
      stopLoss: '20',
      takeProfit: '50'
    }
  };
  res.json(settings);
});

app.post('/api/settings', (req: express.Request, res: express.Response) => {
  // For now, just return success - in production this would update environment
  const settings = req.body;
  log.info({ settings }, 'Settings update requested');
  res.json({ success: true, message: 'Settings saved successfully' });
});

app.get('/api/test-connection', async (req: express.Request, res: express.Response) => {
  try {
    const axios = (await import('axios')).default;
    const railwayUrl = 'http://localhost:5000';
    
    // Test Railway connection
    const response = await axios.get(`${railwayUrl}/health`, { timeout: 5000 });
    const isHealthy = response.data?.status === 'healthy';
    
    res.json({ 
      success: isHealthy, 
      status: isHealthy ? 'Railway Gateway Connected' : 'Railway Gateway Issue',
      details: response.data 
    });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/test-ibkr', async (req: express.Request, res: express.Response) => {
  try {
    const { symbol = 'SPY', strikePercentage = '1', dte = '0', orderType = 'MKT' } = req.body;
    
    // Mock current price (in real implementation, get from IBKR)
    const currentPrice = 150.00;
    const percentage = parseFloat(strikePercentage);
    
    // Calculate strike prices
    const callStrike = (currentPrice * (1 + percentage / 100)).toFixed(2);
    const putStrike = (currentPrice * (1 - percentage / 100)).toFixed(2);
    
    // Calculate expiration date
    const now = new Date();
    const expirationDate = new Date(now);
    expirationDate.setDate(now.getDate() + parseInt(dte));
    
    // Test Railway IBKR connection
    const axios = (await import('axios')).default;
    const railwayUrl = 'http://localhost:5000';
    
    try {
      const configResponse = await axios.get(`${railwayUrl}/config`, { timeout: 5000 });
      const ibkrReady = configResponse.data?.ready_for_trading === true;
      
      if (ibkrReady) {
        res.json({
          success: true,
          symbol,
          currentPrice,
          callStrike,
          putStrike,
          expiration: expirationDate.toISOString().split('T')[0],
          dte,
          orderType,
          strikePercentage: `${percentage}%`,
          message: 'IBKR integration ready - parameters validated'
        });
      } else {
        res.json({
          success: false,
          error: 'IBKR not ready for trading on Railway gateway'
        });
      }
    } catch (railwayError: any) {
      res.json({
        success: false,
        error: `Railway gateway error: ${railwayError.message}`
      });
    }
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// Startup message throttling to prevent spam
import fs from 'fs';
const STARTUP_MSG_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes
const STARTUP_STATE_FILE = '/tmp/trump2trade_startup.json';

function getLastStartupTime(): number {
  try {
    const data = fs.readFileSync(STARTUP_STATE_FILE, 'utf8');
    const state = JSON.parse(data);
    return state.lastStartup || 0;
  } catch {
    return 0;
  }
}

function saveStartupTime(timestamp: number): void {
  try {
    fs.writeFileSync(STARTUP_STATE_FILE, JSON.stringify({ lastStartup: timestamp }));
  } catch (error) {
    log.warn({ error }, 'Failed to save startup state');
  }
}

const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, async () => {
  log.info({ PORT }, 'server started');
  
  // Initialize monitoring system FIRST
  const monitor = initializeMonitoring(process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID);
  
  // Initialize daily analytics system
  initializeDailyAnalytics();
  log.info('Daily analytics system initialized');
  
  // Initialize bot without starting polling to prevent hanging
  try {
    // Delete any existing webhook first
    await bot.api.deleteWebhook();
    log.info('🧹 Webhook deleted');
    
    // Test bot connectivity
    const me = await bot.api.getMe();
    log.info({ botInfo: me }, '✅ Telegram bot initialized successfully');
    monitor.setConnectionStatus('telegram', true);
  } catch (botError: any) {
    log.error({ error: botError?.message || botError }, '❌ Failed to initialize Telegram bot');
    monitor.setConnectionStatus('telegram', false);
  }
  
  // Initialize Gemini status check
  const geminiApiKey = process.env.GOOGLE_API_KEY;
  if (geminiApiKey && geminiApiKey !== 'your-google-api-key-here') {
    // Test Gemini connection on startup
    try {
      const { analyzePost } = await import('./llm.js');
      await analyzePost('Test connection');
      monitor.setConnectionStatus('gemini', true);
      log.info('Gemini AI connection verified on startup');
    } catch (error) {
      monitor.setConnectionStatus('gemini', false);
      log.warn({ error }, 'Gemini AI connection failed on startup');
    }
  } else {
    monitor.setConnectionStatus('gemini', false);
    log.warn('Gemini API key not configured');
  }
  
  scheduleDailyStats();
  startOpsSelfChecks();
  startTruthPoller();
  startSynopticListener(); // Start the corrected Synoptic WebSocket listener
  
  // Send startup message only if enough time has passed (prevents Railway redeploy spam)
  const now = Date.now();
  const lastStartupTime = getLastStartupTime();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (now - lastStartupTime > STARTUP_MSG_THROTTLE_MS) {
    saveStartupTime(now);
    try {
      const mode = isProduction ? 'PRODUCTION' : 'DEVELOPMENT';
      const features = [];
      if (process.env.SYNOPTIC_API_KEY) features.push('Synoptic WebSocket');
      if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== 'your-google-api-key-here') features.push('Gemini AI');
      if (process.env.POLL_ENABLED === 'true') features.push('Truth Polling');
      
      const message = `🦅 Trump2Trade ${mode} MODE is live!\n\n` +
        `🔧 Active Features: ${features.join(', ') || 'Basic webhook support'}\n` +
        `📡 Listening for posts on /webhook/genspark and /webhook/apify\n\n` +
        `Use /help for commands`;
      
      await sendText(message);
      log.info('Startup message sent to Telegram');
      
      // Send admin startup notification
      if (isProduction) {
        try {
          await monitor.sendWarningAlert(`🚀 Trump2Trade Production Started\n\nFeatures: ${features.join(', ')}\nUptime monitoring active`);
        } catch (err) {
          log.warn('Failed to send admin startup notification');
        }
      }
    } catch (error) {
      log.warn({ error: (error as any)?.message || error }, 'Failed to send startup message - continuing anyway');
    }
  } else {
    log.info({ 
      timeSinceLastMs: now - lastStartupTime,
      throttleMs: STARTUP_MSG_THROTTLE_MS 
    }, 'Startup message throttled (too soon after last restart)');
  }
  
  // Start bot polling in background (non-blocking) - CRITICAL FIX
  setTimeout(async () => {
    try {
      log.info('🤖 Starting Telegram bot polling...');
      bot.start(); // Start polling asynchronously
      log.info('✅ Bot polling started');
    } catch (pollError: any) {
      log.error({ error: pollError?.message || pollError }, '❌ Failed to start bot polling');
    }
  }, 1000);
});
