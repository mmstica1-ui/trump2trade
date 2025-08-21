import 'dotenv/config';
import express from 'express';
import pino from 'pino';
import bot, { sendText } from './tg.js';
import { scheduleDailyStats } from './stats.js';
import { startOpsSelfChecks } from './ops.js';
import { startTruthPoller } from './poller.js';
import { handleApifyWebhook } from './apify.js';
import { handleGensparkWebhook } from './genspark.js';

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

const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, () => {
  log.info({ PORT }, 'server started');
  bot.start();
  scheduleDailyStats();
  startOpsSelfChecks();
  startTruthPoller();
  sendText('🚀 Trump2Trade is live. Use /help');
});
