import { sendText } from './tg.js';

let errors = 0;
let lastApifyHit = Date.now();

export function bumpError() { errors++; }
export function markApifyHit() { lastApifyHit = Date.now(); }
export function getLastApifyHitMs(): number { return Date.now() - lastApifyHit; }

export function scheduleDailyStats() {
  const ms = 1000 * 60 * 60 * 24;
  setInterval(async () => {
    const upMin = Math.round(process.uptime() / 60);
    const apifyAgo = Math.round((Date.now() - lastApifyHit)/1000);
    await sendText(`📊 Daily stats: uptime ${upMin}m, errors ${errors}, apify last hit ${apifyAgo}s ago.`);
    errors = 0;
  }, ms);
}
