import 'dotenv/config';
import express from 'express';
import pino from 'pino';
import { initializeMonitoring, getHealthEndpointData } from './monitoring.js';

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
  }
  
  await sendTrumpAlert({ 
    summary: finalSummary, 
    tickers: finalTickers, 
    url,
    originalPost: text || postText,
    relevanceScore
  });
  res.json({ ok: true });
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
  
  bot.start();
  monitor.setConnectionStatus('telegram', true);
  
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
});
