import type { Request, Response } from 'express';
import { analyzePost } from './llm.js';
import { sendTrumpAlert } from './tg.js';

// ✅ זיכרון קצר למניעת כפילויות: מיפוי post_id -> timestamp
const seen = new Map<string, number>();
const DEDUP_TTL_MS = 24 * 60 * 60 * 1000; // 24 שעות

function pickTextUrl(body: any): { text?: string; url?: string; post_id?: string } {
  if (body?.text && body?.url) return { text: body.text, url: body.url, post_id: body.post_id };
  const item = body?.item || body?.data?.item || body?.payload?.item || body?.data;
  if (item?.text && item?.url) return { text: item.text, url: item.url, post_id: item.post_id || item.id };
  if (body?.payload?.text && body?.payload?.url)
    return { text: body.payload.text, url: body.payload.url, post_id: body.payload.post_id };
  const text = body?.text || body?.message || body?.content || item?.content || '';
  const url  = body?.url  || body?.link    || item?.link    || item?.url   || '';
  const post_id = body?.post_id || item?.post_id || item?.id;
  return { text, url, post_id };
}

function isDuplicate(id?: string) {
  if (!id) return false;
  const now = Date.now();
  const last = seen.get(id);
  // ניקוי ישנים
  for (const [k, t] of seen) if (now - t > DEDUP_TTL_MS) seen.delete(k);
  if (last && (now - last) < DEDUP_TTL_MS) return true;
  seen.set(id, now);
  return false;
}

export async function handleGensparkWebhook(req: Request, res: Response) {
  const secret = (req.query.secret as string) || '';
  if (secret !== (process.env.GENSPARK_WEBHOOK_SECRET || '')) {
    return res.status(401).json({ ok: false, error: 'bad secret' });
  }

  const { text, url, post_id } = pickTextUrl(req.body || {});
  if (!text || !url) {
    return res.status(400).json({ ok: false, error: 'missing text/url' });
  }

  // ✅ דדופ צד שרת – אם הגיע פעמיים מהרצאות חופפות
  if (isDuplicate(post_id)) {
    return res.json({ ok: true, skipped: 'duplicate' });
  }

  const analysis = await analyzePost(text);
  await sendTrumpAlert({ summary: analysis.summary, tickers: analysis.tickers, url });
  return res.json({ ok: true });
}