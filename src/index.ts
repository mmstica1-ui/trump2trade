import 'dotenv/config';
import express from 'express';
import pino from 'pino';
import bot, { sendText } from './tg.js';
import { handleApifyWebhook } from './apify.js';
import { scheduleDailyStats } from './stats.js';
import { startOpsSelfChecks } from './ops.js';

const log = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/healthz', (_: express.Request, res: express.Response) => res.json({ ok: true }));
app.post('/webhook/apify', (req: express.Request, res: express.Response) => handleApifyWebhook(req, res));

// dev helper: inject a fake post
app.post('/dev/mock', async (req: express.Request, res: express.Response) => {
  const { text = 'Tariffs removed on chips from China', url = 'https://truth.social/mock' } = req.body || {};
  await handleApifyWebhook(
    { body: { text, url }, headers: { 'x-apify-signature': process.env.APIFY_WEBHOOK_SECRET || '' } } as any,
    { status: (c:number) => ({ json: (_obj:any) => undefined }), json: (_obj:any) => undefined } as any
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
