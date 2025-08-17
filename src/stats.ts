import { sendText } from './tg.js';

let errors = 0;

// שמירת "פעם אחרונה שקיבלנו webhook מאפיפיי" — גם אם לא משתמשים, זה לא מזיק
let lastApifyHit = Date.now();

export function bumpError() { errors++; }

// פונקציה שה-apify.ts קורא לה — מעדכנת טיימסטמפ
export function markApifyHit() { lastApifyHit = Date.now(); }

// מאפשר לדוחות/סטטוס לדעת כמה זמן עבר מאז האירוע האחרון
export function getLastApifyHitMs(): number { return Date.now() - lastApifyHit; }

export function scheduleDailyStats() {
  const ms = 1000 * 60 * 60 * 24;
  setInterval(async () => {
    const upMin = Math.round(process.uptime() / 60);
    const apifyAgoSec = Math.round((Date.now() - lastApifyHit) / 1000);
    await sendText(`📊 Daily stats: uptime ${upMin}m, errors ${errors}, apify last hit ${apifyAgoSec}s ago.`);
    errors = 0;
  }, ms);
}
