import { Bot, InlineKeyboard } from 'grammy';
import axios from 'axios';
import { chooseTrade, InlineTradePayload } from './ibkr';
import { getHealthSnapshot, toggleSafeMode, pauseApifySchedule, resumeApifySchedule, triggerDeploy } from './ops';

const token = process.env.TELEGRAM_BOT_TOKEN!;
export const bot = new Bot(token);
const chatId = process.env.TELEGRAM_CHAT_ID!;

function adminOnly(ctx: any) {
  return String(ctx.chat?.id) === String(chatId);
}

export function sendText(text: string) {
  return axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  });
}

export async function sendTrumpAlert(args: { summary: string; tickers: string[]; url: string }) {
  const kb = new InlineKeyboard();
  for (const t of args.tickers.slice(0, 4)) {
    kb.text(`🟢 Buy Call ${t}`, JSON.stringify({ a: 'buy_call', t })).row();
    kb.text(`🔴 Buy Put ${t}`, JSON.stringify({ a: 'buy_put', t })).row();
    kb.text(`⚪ Sell Call ${t}`, JSON.stringify({ a: 'sell_call', t }));
    kb.text(`⚫ Sell Put ${t}`, JSON.stringify({ a: 'sell_put', t })).row();
  }
  kb.text('🧪 Preview (no trade)', JSON.stringify({ a: 'preview' })).row();

  return bot.api.sendMessage(chatId, `🦅 <b>Trump post → trade idea</b>\n\n<b>Summary:</b> ${args.summary}\n<b>Tickers:</b> ${args.tickers.join(', ')}\n\n<code>${args.url}</code>`, { parse_mode: 'HTML', reply_markup: kb });
}

bot.command('help', ctx => ctx.reply('Commands: /help, /ping, /stats, /health, /status, /deploy, /safe_mode on|off, /apify pause|resume'));
bot.command('ping', ctx => ctx.reply('pong'));

bot.on('callback_query:data', async ctx => {
  try {
    const payload = JSON.parse(ctx.callbackQuery.data!) as InlineTradePayload;
    const reply = await chooseTrade(payload);
    await ctx.answerCallbackQuery();
    await ctx.reply(reply);
  } catch (e: any) {
    await ctx.reply(`❌ Error: ${e?.message || e}`);
  }
});

// Ops: status summary
bot.command('status', async (ctx) => {
  if (!adminOnly(ctx)) return;
  try {
    const s = await getHealthSnapshot();
    await ctx.reply(
      `📈 Status\n`+
      `App: ${s.appOk ? 'OK' : 'DOWN'}\n`+
      `IBKR: ${s.ibkrOk ? 'OK' : 'DOWN'}\n`+
      `Apify last hit: ${Math.round(s.msSinceApify/1000)}s ago\n`+
      `SafeMode: ${(process.env.DISABLE_TRADES||'false')}`
    );
  } catch (e:any) {
    await ctx.reply(`❌ Status error: ${e?.message||e}`);
  }
});

// Ops: deploy via GitHub Actions
bot.command('deploy', async (ctx) => {
  if (!adminOnly(ctx)) return;
  try {
    await triggerDeploy();
    await ctx.reply('🚀 Deploy started (GitHub Actions).');
  } catch (e:any) {
    await ctx.reply(`❌ Deploy error: ${e?.message||e}`);
  }
});

// Ops: safe_mode on|off
bot.command('safe_mode', async (ctx) => {
  if (!adminOnly(ctx)) return;
  const arg = (ctx.message?.text || '').split(' ')[1]?.toLowerCase();
  if (!['on','off'].includes(arg)) return ctx.reply('Usage: /safe_mode on|off');
  try {
    await toggleSafeMode(arg === 'on');
    await ctx.reply(`🛡️ Safe Mode is now ${arg.toUpperCase()}. (Variable updated on Railway)`);
  } catch (e:any) {
    await ctx.reply(`❌ SafeMode error: ${e?.message||e}`);
  }
});

// Ops: apify pause|resume
bot.command('apify', async (ctx) => {
  if (!adminOnly(ctx)) return;
  const action = (ctx.message?.text || '').split(' ')[1]?.toLowerCase();
  if (!['pause','resume'].includes(action)) return ctx.reply('Usage: /apify pause|resume');
  try {
    if (action === 'pause') await pauseApifySchedule();
    else await resumeApifySchedule();
    await ctx.reply(`🛰️ Apify schedule ${action}d.`);
  } catch (e:any) {
    await ctx.reply(`❌ Apify error: ${e?.message||e}`);
  }
});

export default bot;
