import WebSocket from 'ws';
import pino from 'pino';
import { analyzePost } from './llm.js';
import { sendTrumpAlert } from './tg.js';

const log = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });

// Deduplication memory with TTL
const processedPosts = new Map<string, number>();
const DEDUP_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function isDuplicate(postId: string): boolean {
  const now = Date.now();
  
  // Clean expired entries
  for (const [id, timestamp] of processedPosts.entries()) {
    if (now - timestamp > DEDUP_TTL_MS) {
      processedPosts.delete(id);
    }
  }
  
  if (processedPosts.has(postId)) {
    return true;
  }
  
  processedPosts.set(postId, now);
  return false;
}

function extractPostData(data: any): { text: string; url: string; postId: string } | null {
  try {
    // Handle different possible data structures from Synoptic
    let postData = data;
    
    // If data is wrapped in additional layers, unwrap it
    if (data.data) postData = data.data;
    if (data.post) postData = data.post;
    if (data.message) postData = data.message;
    
    // Extract text content from various possible fields
    const text = postData.text || 
                 postData.content || 
                 postData.message ||
                 postData.body ||
                 (typeof postData === 'string' ? postData : '');
    
    // Extract URL from various possible fields
    const url = postData.url || 
                postData.link || 
                postData.permalink ||
                postData.post_url ||
                'https://truthsocial.com';
    
    // Extract post ID from various possible fields
    const postId = postData.id || 
                   postData.post_id ||
                   postData.messageId ||
                   postData.uid ||
                   `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (!text || text.trim().length === 0) {
      log.debug('No valid text content found in post data');
      return null;
    }
    
    return { text: text.trim(), url, postId: String(postId) };
  } catch (error) {
    log.error({ error, data }, 'Error extracting post data');
    return null;
  }
}

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_BASE = 1000; // Start with 1 second

function connectToSynoptic() {
  const wsUrl = process.env.SYNOPTIC_WS || 'wss://api.synoptic.com/v1/ws';
  const apiKey = process.env.SYNOPTIC_API_KEY;
  
  if (!apiKey) {
    log.error('SYNOPTIC_API_KEY not provided, cannot connect to Synoptic WebSocket');
    return;
  }
  
  log.info('Connecting to Synoptic WebSocket...');
  
  // Add API key as query parameter (correct format)
  const fullUrl = `${wsUrl}/on-stream-post?apiKey=${apiKey}`;
  
  ws = new WebSocket(fullUrl);
  
  ws.on('open', () => {
    log.info('Connected to Synoptic WebSocket');
    reconnectAttempts = 0;
    
    // Send subscription message if needed
    const subscriptionMessage = {
      action: 'subscribe',
      channels: ['truthsocial.posts'],
      filters: {
        user: 'realDonaldTrump' // Focus on Trump's posts
      }
    };
    
    ws?.send(JSON.stringify(subscriptionMessage));
    log.info('Sent subscription message to Synoptic');
  });
  
  ws.on('message', async (data: WebSocket.Data) => {
    try {
      const rawMessage = data.toString();
      log.debug({ rawMessage }, 'Received WebSocket message');
      
      const parsed = JSON.parse(rawMessage);
      
      // Handle different message types
      if (parsed.type === 'ping') {
        ws?.send(JSON.stringify({ type: 'pong' }));
        return;
      }
      
      if (parsed.type === 'subscription_confirmed') {
        log.info('Subscription confirmed by Synoptic');
        return;
      }
      
      if (parsed.type !== 'post' && parsed.type !== 'message') {
        log.debug({ type: parsed.type }, 'Ignoring non-post message');
        return;
      }
      
      const postData = extractPostData(parsed);
      if (!postData) {
        log.debug('Could not extract valid post data');
        return;
      }
      
      const { text, url, postId } = postData;
      
      if (isDuplicate(postId)) {
        log.debug({ postId }, 'Skipping duplicate post');
        return;
      }
      
      log.info({ postId, text: text.substring(0, 100) }, 'Processing new Trump post from Synoptic');
      
      // Capture timing for WebSocket processing
      const postReceivedAt = new Date();
      
      const analysisStartTime = Date.now();
      const analysis = await analyzePost(text);
      const analysisEndTime = Date.now();
      
      // Send enhanced Telegram alert
      await sendTrumpAlert({
        summary: analysis.summary,
        tickers: analysis.tickers,
        url,
        originalPost: text,
        postDiscoveredAt: postReceivedAt,
        analysisTimeMs: analysisEndTime - analysisStartTime,
        relevanceScore: analysis.relevanceScore
      });
      
      log.info({ 
        postId, 
        tickers: analysis.tickers,
        analysisTimeMs: analysisEndTime - analysisStartTime,
        relevanceScore: analysis.relevanceScore
      }, 'Successfully processed Trump post from Synoptic');
      
    } catch (error) {
      log.error({ error, data: data.toString() }, 'Error processing WebSocket message');
    }
  });
  
  ws.on('error', (error) => {
    log.error({ error }, 'Synoptic WebSocket error');
  });
  
  ws.on('close', (code, reason) => {
    log.warn({ code, reason: reason.toString() }, 'Synoptic WebSocket connection closed');
    ws = null;
    
    // Implement exponential backoff for reconnection
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttempts);
      reconnectAttempts++;
      
      log.info({ attempt: reconnectAttempts, delay }, 'Scheduling reconnection to Synoptic');
      
      setTimeout(() => {
        connectToSynoptic();
      }, delay);
    } else {
      log.error('Maximum reconnection attempts reached, giving up on Synoptic connection');
    }
  });
}

export function startSynopticListener() {
  if (!process.env.SYNOPTIC_API_KEY) {
    log.warn('SYNOPTIC_API_KEY not provided, Synoptic WebSocket listener will not start');
    return;
  }
  
  log.info('Starting Synoptic WebSocket listener for Trump posts...');
  connectToSynoptic();
}

export function stopSynopticListener() {
  if (ws) {
    log.info('Stopping Synoptic WebSocket listener');
    ws.close();
    ws = null;
  }
}

// Graceful shutdown
process.on('SIGTERM', stopSynopticListener);
process.on('SIGINT', stopSynopticListener);