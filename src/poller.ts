import axios from 'axios';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { analyzePost } from './llm.js';
import { sendTrumpAlert } from './tg.js';

const log = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });

type State = { lastPostId?: string|null; lastETag?: string|null };
const STATE_PATH = process.env.STATE_PATH || '/tmp/truth_state.json';

function loadState(): State {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8')); }
  catch { return {}; }
}
function saveState(s: State) {
  try {
    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
    fs.writeFileSync(STATE_PATH, JSON.stringify(s), 'utf-8');
  } catch (e:any) {
    log.warn({ err: e?.message || e }, 'Failed to save state');
  }
}
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

let pollerRunning = false;
let pollerAbortController: AbortController | null = null;

export function startTruthPoller() {
  const enabled = (process.env.POLL_ENABLED || 'false').toLowerCase() === 'true';
  if (!enabled) { log.info('Truth poller disabled (set POLL_ENABLED=true to enable)'); return; }
  
  if (pollerRunning) {
    log.info('Truth poller already running');
    return;
  }

  const url = process.env.TRUTH_PROFILE_URL || 'https://truthsocial.com/@realDonaldTrump';
  const baseEvery = Number(process.env.POLL_INTERVAL_MS || '60000');

  const BACKOFF_MULT = Number(process.env.BACKOFF_MULT || '2');
  const BACKOFF_MAX  = Number(process.env.BACKOFF_MAX_MS || '300000');
  const BACKOFF_RESET_OKS = Number(process.env.BACKOFF_RESET_OKS || '3');

  let currentEvery = baseEvery;
  let okStreak = 0;
  let state: State = loadState();
  let lastPostId: string | null = state.lastPostId ?? null;
  let lastETag: string | null = state.lastETag ?? null;

  pollerRunning = true;
  pollerAbortController = new AbortController();
  
  (async () => {
    log.info({ url, baseEvery, STATE_PATH }, 'Truth poller started');
    while (pollerRunning && !pollerAbortController?.signal.aborted) {
      try {
        const headers: Record<string,string> = {
          'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'en-US,en;q=0.9'
        };
        if (lastETag) headers['if-none-match'] = lastETag;

        const res = await axios.get(url, { headers, validateStatus: s => s === 200 || s === 304, timeout: 15000 });
        if (res.status === 304) {
          okStreak++;
          if (okStreak >= BACKOFF_RESET_OKS && currentEvery !== baseEvery) {
            currentEvery = baseEvery; okStreak = 0; log.info({ currentEvery }, 'Backoff reset to base (304)');
          }
          await sleep(currentEvery); continue;
        }
        if (res.headers.etag) { lastETag = String(res.headers.etag); saveState({ lastPostId, lastETag }); }

        const html = String(res.data || '');

        let newestId: string | null = null;
        const m1 = html.match(/\/@[A-Za-z0-9_.-]+\/post[s]?\/(\d+)/);
        if (m1 && m1[1]) newestId = m1[1];
        if (!newestId) {
          const m2 = html.match(/"statusId"\s*:\s*"(\d+)"/);
          if (m2 && m2[1]) newestId = m2[1];
        }
        if (!newestId) throw new Error('Could not parse latest post id');

        if (lastPostId === newestId) {
          okStreak++;
          if (okStreak >= BACKOFF_RESET_OKS && currentEvery !== baseEvery) {
            currentEvery = baseEvery; okStreak = 0; log.info({ currentEvery }, 'Backoff reset to base (same id)');
          }
          await sleep(currentEvery); continue;
        }

        let text = '';
        const mText = html.match(/"content"\s*:\s*"([^"]{20,2000})"/);
        if (mText && mText[1]) { text = mText[1].replace(/\\n/g, ' ').replace(/\\u[a-fA-F0-9]{4}/g, ' '); }
        else {
          const mOg = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
          if (mOg && mOg[1]) text = mOg[1];
        }
        if (!text) text = 'New post detected';

        const postUrl = `${url.replace(/\/$/,'')}/post/${newestId}`;

        const analysis = await analyzePost(text);
        await sendTrumpAlert({ summary: analysis.summary, tickers: analysis.tickers, url: postUrl });

        lastPostId = newestId;
        okStreak++;
        if (okStreak >= BACKOFF_RESET_OKS && currentEvery !== baseEvery) {
          currentEvery = baseEvery; okStreak = 0; log.info({ currentEvery }, 'Backoff reset to base (new post)');
        }
        saveState({ lastPostId, lastETag });
        log.info({ newestId }, 'New post processed');
      } catch (e:any) {
        okStreak = 0;
        currentEvery = Math.min(currentEvery * BACKOFF_MULT, BACKOFF_MAX);
        log.error({ err: e?.message || e, nextWaitMs: currentEvery }, 'Poller error (backing off)');
      }
      await sleep(currentEvery);
    }
    pollerRunning = false;
    log.info('Truth poller stopped');
  })();
}

export function stopTruthPoller() {
  if (pollerAbortController) {
    pollerAbortController.abort();
    pollerAbortController = null;
  }
  pollerRunning = false;
}
