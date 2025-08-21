import type { Request, Response } from 'express';
import { analyzePost } from './llm.js';
import { sendTrumpAlert } from './tg.js';

function pickTextUrl(body: any): { text?: string; url?: string } {
  if (body?.text && body?.url) return { text: body.text, url: body.url };
  const item = body?.item || body?.data?.item || body?.payload?.item || body?.data;
  if (item?.text && item?.url) return { text: item.text, url: item.url };
  if (body?.payload?.text && body?.payload?.url)
    return { text: body.payload.text, url: body.payload.url };
  const text = body?.text || body?.message || body?.content || item?.content || '';
  const url = body?.url || body?.link || item?.link || item?.url || '';
  return { text, url };
}

export async function handleGensparkWebhook(req: Request, res: Response) {
  const secret = (req.query.secret as string) || '';
  if (secret !== (process.env.GENSPARK_WEBHOOK_SECRET || process.env.APIFY_WEBHOOK_SECRET || '')) {
    return res.status(401).json({ ok: false, error: 'bad secret' });
  }

  const { text, url } = pickTextUrl(req.body || {});
  if (!text || !url) return res.status(400).json({ ok: false, error: 'missing text/url' });

  try {
    const analysis = await analyzePost(text);
    await sendTrumpAlert({ summary: analysis.summary, tickers: analysis.tickers, url });
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || e });
  }
}