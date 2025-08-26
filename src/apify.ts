import type { Request, Response } from 'express';
import { z } from 'zod';
import { analyzePost } from './llm.js';
import { sendTrumpAlert } from './tg.js';
import { markApifyHit } from './stats.js';

const ApifyBody = z.object({ text: z.string().min(3), url: z.string().url() });

export async function handleApifyWebhook(req: Request, res: Response) {
  const sig = (req.headers['x-apify-signature'] as string) || '';
  if (sig !== process.env.APIFY_WEBHOOK_SECRET) return res.status(401).json({ ok: false });

  const parsed = ApifyBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.message });

  const { text, url } = parsed.data;
  
  // Capture timing for webhook processing
  const webhookReceivedAt = new Date();
  
  const analysisStartTime = Date.now();
  const analysis = await analyzePost(text);
  const analysisEndTime = Date.now();
  
  markApifyHit();
  
  await sendTrumpAlert({ 
    summary: analysis.summary, 
    tickers: analysis.tickers, 
    url,
    originalPost: text,
    postDiscoveredAt: webhookReceivedAt,
    analysisTimeMs: analysisEndTime - analysisStartTime,
    relevanceScore: analysis.relevanceScore
  });
  
  return res.json({ 
    ok: true,
    processed: {
      analysisTimeMs: analysisEndTime - analysisStartTime,
      tickers: analysis.tickers,
      relevanceScore: analysis.relevanceScore
    }
  });
}
