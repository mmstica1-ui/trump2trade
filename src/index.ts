import 'dotenv/config';
import express from 'express';
import pino from 'pino';
import { initializeMonitoring, getHealthEndpointData } from './monitoring.js';
import { initializeDailyAnalytics } from './daily-analytics.js';

// Environment validation
const requiredEnvVars = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
};

// Check critical environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value || value === `your-${key.toLowerCase().replace('_', '-')}-here`)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
  console.warn('System will run in limited mode. Set proper values for full functionality.');
}
import bot, { sendText } from './tg.js';
import { scheduleDailyStats } from './stats.js';
import { startOpsSelfChecks } from './ops.js';
import { startTruthPoller } from './poller.js';
import { handleApifyWebhook } from './apify.js';
import { handleGensparkWebhook } from './genspark.js';
import { startSynopticListener } from './synoptic.js';
import { healthMonitor } from './health-monitor.js';

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
      gatewayUrl: process.env.IBKR_GATEWAY_URL || 'https://web-production-a020.up.railway.app',
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
      outsideRth: process.env.IBKR_OUTSIDE_RTH === 'true'
    },
    monitoring: {
      alertsEnabled: true,
      dailyReports: true,
      errorNotifications: true
    }
  };
  res.json(settings);
});

// Simple root endpoint
app.get('/', (_: express.Request, res: express.Response) => {
  res.json({ 
    name: 'Trump2Trade',
    status: 'online',
    version: '0.7.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Startup throttling
const STARTUP_MSG_THROTTLE_MS = 2 * 60 * 1000; // 2 minutes
let lastStartupTimestamp = 0;

function getLastStartupTime(): number {
  return lastStartupTimestamp;
}

function saveStartupTime(timestamp: number): void {
  lastStartupTimestamp = timestamp;
}

const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, '0.0.0.0', async () => {
  log.info({ PORT }, 'server started');
  
  // Initialize monitoring first
  initializeMonitoring();
  initializeDailyAnalytics();
  
  console.log(`🦅 Trump2Trade v0.7.0 - PRODUCTION READY`);
  console.log('═'.repeat(50));
  console.log(`🌐 HTTP server running on port ${PORT}`);
  console.log(`💾 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🛡️ Safe Mode: ${process.env.DISABLE_TRADES || 'enabled'}`);
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  console.log('═'.repeat(50));
  
  scheduleDailyStats();
  startOpsSelfChecks();
  startTruthPoller();
  startSynopticListener(); // Start the corrected Synoptic WebSocket listener
  
  // Start Health Monitor - Auto-fixing system
  healthMonitor.start();
  log.info('🔧 Health Monitor started - Auto-healing system active');
  
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
      
    } catch (error) {
      log.warn({ error: (error as any)?.message || error }, 'Failed to send startup message - continuing anyway');
    }
  } else {
    log.info({ 
      timeSinceLastMs: now - lastStartupTime,
      throttleMs: STARTUP_MSG_THROTTLE_MS 
    }, 'Startup message throttled (too soon after last restart)');
  }
});