import axios from 'axios';
import pino from 'pino';
import { analyzePost } from './llm.js';
import { sendTrumpAlert } from './tg.js';

const log = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });

// Deduplication memory with TTL
const processedPosts = new Map<string, number>();
const DEDUP_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Polling configuration
const POLL_INTERVAL_MS = 30 * 1000; // 30 seconds
let pollingTimer: NodeJS.Timeout | null = null;

interface TruthSocialPost {
  id: string;
  text: string;
  url: string;
  created_at: string;
  user?: {
    username: string;
  };
}

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

async function fetchTrumpPosts(): Promise<TruthSocialPost[]> {
  const apiKey = process.env.SCRAPECREATORS_API_KEY;
  if (!apiKey) {
    log.warn('SCRAPECREATORS_API_KEY not provided');
    return [];
  }

  try {
    const username = 'realDonaldTrump'; // Trump's Truth Social username
    const endpoint = `https://api.scrapecreators.com/v1/truthsocial/posts`;
    
    log.debug({ username, endpoint }, 'Fetching posts from Scrape Creators API');
    
    const response = await axios.get(endpoint, {
      headers: {
        'x-api-key': apiKey,
        'User-Agent': 'Trump2Trade/1.0'
      },
      params: {
        handle: username, // Correct parameter name is 'handle', not 'username'
        limit: 10 // Get latest 10 posts
      },
      timeout: 15000
    });

    // Handle different response structures - could be array or object with posts property
    let posts = [];
    if (Array.isArray(response.data)) {
      posts = response.data;
    } else if (response.data && Array.isArray(response.data.posts)) {
      posts = response.data.posts;
    } else if (response.data && Array.isArray(response.data.data)) {
      posts = response.data.data;
    } else {
      log.warn({ data: response.data }, 'Unexpected API response format');
      return [];
    }

    return posts.map((post: any) => ({
      id: post.id || post.post_id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: post.content || post.text || post.body || '',
      url: post.url || post.link || `https://truthsocial.com/@realDonaldTrump/posts/${post.id}`,
      created_at: post.created_at || post.timestamp || new Date().toISOString(),
      user: {
        username: post.user?.username || 'realDonaldTrump'
      }
    }));

  } catch (error) {
    if (axios.isAxiosError(error)) {
      log.error({
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      }, 'API request failed');
    } else {
      log.error({ error }, 'Unexpected error fetching posts');
    }
    return [];
  }
}

async function pollTruthSocial() {
  try {
    log.debug('Polling Trump posts from Scrape Creators API...');
    
    const posts = await fetchTrumpPosts();
    
    if (posts.length === 0) {
      log.debug('No posts received from API');
      return;
    }

    log.info({ postsCount: posts.length }, 'Received posts from Scrape Creators API');

    // Process posts in chronological order (oldest first)
    const sortedPosts = posts.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (const post of sortedPosts) {
      if (!post.text || post.text.trim().length === 0) {
        log.debug({ postId: post.id }, 'Skipping post with no text content');
        continue;
      }

      if (isDuplicate(post.id)) {
        log.debug({ postId: post.id }, 'Skipping duplicate post');
        continue;
      }

      log.info({ 
        postId: post.id, 
        text: post.text.substring(0, 100) + '...',
        created_at: post.created_at 
      }, 'Processing new Trump post');

      try {
        // Analyze the post with Gemini
        const analysis = await analyzePost(post.text);

        // Send Telegram alert
        await sendTrumpAlert({
          summary: analysis.summary,
          tickers: analysis.tickers,
          url: post.url
        });

        log.info({ 
          postId: post.id, 
          tickers: analysis.tickers 
        }, 'Successfully processed Trump post');

      } catch (error) {
        log.error({ error, postId: post.id }, 'Error processing post');
      }
    }

  } catch (error) {
    log.error({ error }, 'Error in polling cycle');
  }
}

export function startScrapeCreatorsPoller() {
  if (!process.env.SCRAPECREATORS_API_KEY) {
    log.warn('SCRAPECREATORS_API_KEY not provided, Scrape Creators poller will not start');
    return;
  }

  log.info({ intervalMs: POLL_INTERVAL_MS }, 'Starting Scrape Creators Truth Social poller...');

  // Run immediately and then every interval
  pollTruthSocial();

  pollingTimer = setInterval(pollTruthSocial, POLL_INTERVAL_MS);
}

export function stopScrapeCreatorsPoller() {
  if (pollingTimer) {
    log.info('Stopping Scrape Creators Truth Social poller');
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

// Graceful shutdown
process.on('SIGTERM', stopScrapeCreatorsPoller);
process.on('SIGINT', stopScrapeCreatorsPoller);