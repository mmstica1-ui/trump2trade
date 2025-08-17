import 'dotenv/config';
import express from 'express';
import pino from 'pino';
import bot, { sendText } from './tg';
import { handleApifyWebhook } from './apify';
import { scheduleDailyStats } from './stats';
import { startOpsSelfChecks } from './ops';

const log = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/healthz', (_, res) => res.json({ ok: true }));
app.post('/webhook/apify', (req, res) => handleApifyWebhook(req, res));

// dev helper: inject a fake post
app.post('/dev/mock', async (req, res) => {
  const { text = 'Tariffs removed on chips from China', url = 'https://truth.social/mock' } = req.body || {};
  await handleApifyWebhook(
    { body: { text, url }, headers: { 'x-apify-signature': process.env.APIFY_WEBHOOK_SECRET || '' } } as any,
    { status: (c:number) => ({ json: (obj:any) => undefined }), json: (obj:any) => undefined } as any
  );
  res.json({ ok: true });
});

const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, () => {
  log.info({ PORT }, 'server started');
  bot.start();
  scheduleDailyStats();
  startOpsSelfChecks();
  sendText('🚀 Trump2Trade is live. Use /help');
});
