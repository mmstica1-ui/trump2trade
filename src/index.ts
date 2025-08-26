import 'dotenv/config';
import express from 'express';
import pino from 'pino';
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

app.get('/healthz', (_: express.Request, res: express.Response) => res.json({ ok: true }));

// Webhooks
app.post('/webhook/apify', handleApifyWebhook);
app.post('/webhook/genspark', handleGensparkWebhook);
app.get('/webhook/genspark', (_: express.Request, res: express.Response) => 
  res.status(405).json({ ok: false, use: 'POST' }));

// dev helper: inject a fake post
app.post('/dev/mock', async (req: express.Request, res: express.Response) => {
  const { text = 'Tariffs removed on chips from China', url = 'https://truth.social/mock' } = req.body || {};
  const { analyzePost } = await import('./llm.js');
  const { sendTrumpAlert } = await import('./tg.js');
  const analysis = await analyzePost(text);
  await sendTrumpAlert({ summary: analysis.summary, tickers: analysis.tickers, url });
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
  bot.start();
  scheduleDailyStats();
  startOpsSelfChecks();
  startTruthPoller();
  startSynopticListener(); // Start the corrected Synoptic WebSocket listener
  
  // Send startup message only if enough time has passed (prevents Railway redeploy spam)
  const now = Date.now();
  const lastStartupTime = getLastStartupTime();
  
  if (now - lastStartupTime > STARTUP_MSG_THROTTLE_MS) {
    saveStartupTime(now);
    await sendText('🚀 Trump2Trade is live. Use /help');
    log.info('Startup message sent to Telegram');
  } else {
    log.info({ 
      timeSinceLastMs: now - lastStartupTime,
      throttleMs: STARTUP_MSG_THROTTLE_MS 
    }, 'Startup message throttled (too soon after last restart)');
  }
});
