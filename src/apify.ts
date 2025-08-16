import type { Request, Response } from 'express';
import { z } from 'zod';
import { analyzePost } from './llm';
import { sendTrumpAlert } from './tg';

const ApifyBody = z.object({ text: z.string().min(3), url: z.string().url() });

export async function handleApifyWebhook(req: Request, res: Response) {
  const sig = (req.headers['x-apify-signature'] as string) || '';
  if (sig !== process.env.APIFY_WEBHOOK_SECRET) return res.status(401).json({ ok: false });

  const parsed = ApifyBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.message });

  const { text, url } = parsed.data;
  const analysis = await analyzePost(text);
  await sendTrumpAlert({ summary: analysis.summary, tickers: analysis.tickers, url });
  return res.json({ ok: true });
}
