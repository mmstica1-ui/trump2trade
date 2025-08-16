import { sendText } from './tg';

let errors = 0;
export function bumpError() { errors++; }

export function scheduleDailyStats() {
  const ms = 1000 * 60 * 60 * 24;
  setInterval(async () => {
    const upMin = Math.round(process.uptime() / 60);
    await sendText(`📊 Daily stats: uptime ${upMin}m, errors ${errors}.`);
    errors = 0;
  }, ms);
}
