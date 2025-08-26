import type { Request, Response } from 'express';
import { z } from 'zod';
import { analyzePost } from './llm.js';
import { sendTrumpAlert } from './tg.js';
import { markApifyHit } from './stats.js';

// ⚡ Fast fallback for Apify
function getFastAnalysis(text: string) {
  const textLower = text.toLowerCase();
  if (textLower.includes('china') || textLower.includes('tariff')) {
    return { summary: 'China trade policy impact', tickers: ['FXI', 'ASHR', 'XLI'], relevanceScore: 8 };
  }
  if (textLower.includes('tech') || textLower.includes('social')) {
    return { summary: 'Tech regulation impact', tickers: ['XLK', 'QQQ'], relevanceScore: 7 };
  }
  if (textLower.includes('energy') || textLower.includes('drill')) {
    return { summary: 'Energy policy impact', tickers: ['XLE', 'USO'], relevanceScore: 8 };
  }
  return { summary: 'General market impact', tickers: ['SPY', 'QQQ'], relevanceScore: 5 };
}

const ApifyBody = z.object({ text: z.string().min(3), url: z.string().url() });

export async function handleApifyWebhook(req: Request, res: Response) {
  const sig = (req.headers['x-apify-signature'] as string) || '';
  if (sig !== process.env.APIFY_WEBHOOK_SECRET) return res.status(401).json({ ok: false });

  const parsed = ApifyBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.message });

  const { text, url } = parsed.data;
  
  // ⚡ APIFY SPEED OPTIMIZATION
  const webhookReceivedAt = new Date();
  const pipelineStart = Date.now();
  
  // Estimate original post time (Apify usually has some delay)
  const originalPostTime = new Date(webhookReceivedAt.getTime() - 45000); // Assume 45s Apify delay
  
  markApifyHit();
  
  // ⚡ ULTRA-FAST analysis with timeout
  let analysis: { summary: string; tickers: string[]; relevanceScore: number };
  try {
    const analysisPromise = analyzePost(text);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('timeout')), 5000)
    );
    analysis = await Promise.race([analysisPromise, timeoutPromise]) as any;
  } catch (error) {
    analysis = getFastAnalysis(text); // Instant fallback
  }
  
  const analysisTime = Date.now() - pipelineStart;
  const totalDelayMs = Date.now() - originalPostTime.getTime();
  
  // ⚡ NON-BLOCKING alert
  const alertPromise = sendTrumpAlert({ 
    summary: analysis.summary, 
    tickers: analysis.tickers, 
    url,
    originalPost: text,
    originalPostTime,
    postDiscoveredAt: webhookReceivedAt,
    analysisTimeMs: analysisTime,
    relevanceScore: analysis.relevanceScore,
    totalDelayMs
  });
  
  alertPromise.catch(err => console.error('Apify alert failed:', err.message));
  
  return res.json({ 
    ok: true,
    processed: {
      analysisTimeMs: analysisTime,
      tickers: analysis.tickers,
      relevanceScore: analysis.relevanceScore
    }
  });
}
