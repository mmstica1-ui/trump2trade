import { Bot, InlineKeyboard } from 'grammy';
import axios from 'axios';
import { chooseTrade, InlineTradePayload } from './ibkr.js';
import { getHealthSnapshot, toggleSafeMode, toggleSystemActive, runFullSystemCheck } from './ops.js';

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

export async function sendTrumpAlert(args: { summary: string; tickers: string[]; url: string; originalPost?: string }) {
  // Build inline keyboard with Call/Put buttons for each ticker
  const kb = new InlineKeyboard();
  
  for (const t of args.tickers.slice(0, 6)) { // Support up to 6 tickers
    kb.text(`🟢 Buy Call ${t}`, JSON.stringify({ a: 'buy_call', t }));
    kb.text(`🔴 Buy Put ${t}`, JSON.stringify({ a: 'buy_put', t })).row();
  }
  
  // Add manual trading button and preview button
  kb.text('📈 Manual Trading', JSON.stringify({ a: 'manual_trade' }));
  kb.text('🧪 Preview (no trade)', JSON.stringify({ a: 'preview' })).row();

  // Build comprehensive message
  let message = `🦅 <b>Trump Post → Trade Alert</b>\n\n`;
  
  // Add original post if provided
  if (args.originalPost) {
    const truncatedPost = args.originalPost.length > 200 
      ? args.originalPost.substring(0, 200) + '...' 
      : args.originalPost;
    message += `📝 <b>Original Post:</b>\n<i>"${truncatedPost}"</i>\n\n`;
  }
  
  // Add analysis summary
  message += `🧠 <b>AI Analysis:</b>\n${args.summary}\n\n`;
  
  // Add relevant tickers
  message += `📊 <b>Relevant Tickers:</b> ${args.tickers.join(', ')}\n\n`;
  
  // Add source link
  message += `🔗 <b>Source:</b> <a href="${args.url}">Truth Social Post</a>`;

  return bot.api.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    reply_markup: kb
  });
}

bot.command('help', ctx => ctx.reply('Commands: /help, /ping, /status, /safe_mode on|off, /system on|off, /check'));
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

bot.command('status', async (ctx) => {
  if (!adminOnly(ctx)) return;
  try {
    const s = await getHealthSnapshot();
    await ctx.reply(
      `📈 Status\n`+
      `App: ${s.appOk ? 'OK' : 'DOWN'}\n`+
      `IBKR: ${s.ibkrOk ? 'OK' : 'DOWN'}\n`+
      `SafeMode: ${(process.env.DISABLE_TRADES||'false')}`
    );
  } catch (e:any) {
    await ctx.reply(`❌ Status error: ${e?.message||e}`);
  }
});

bot.command('safe_mode', async (ctx) => {
  if (!adminOnly(ctx)) return;
  const arg = (ctx.message?.text || '').split(' ')[1]?.toLowerCase();
  if (!['on','off'].includes(arg)) return ctx.reply('Usage: /safe_mode on|off');
  try {
    await toggleSafeMode(arg === 'on');
    await ctx.reply(`🛡️ Safe Mode is now ${arg.toUpperCase()}.`);
  } catch (e:any) {
    await ctx.reply(`❌ SafeMode error: ${e?.message||e}`);
  }
});

bot.command('system', async (ctx) => {
  if (!adminOnly(ctx)) return;
  const arg = (ctx.message?.text || '').split(' ')[1]?.toLowerCase();
  if (!['on','off'].includes(arg)) return ctx.reply('Usage: /system on|off');
  try {
    await toggleSystemActive(arg === 'on');
    if (arg === 'on') {
      await ctx.reply('🔄 System ACTIVATING...\n⏳ Running full diagnostics...');
      await runFullSystemCheck();
    } else {
      await ctx.reply('⏸️ System DEACTIVATED\n💡 Use /system on to reactivate');
    }
  } catch (e:any) {
    await ctx.reply(`❌ System toggle error: ${e?.message||e}`);
  }
});

bot.command('check', async (ctx) => {
  if (!adminOnly(ctx)) return;
  await ctx.reply('🔍 Running full system diagnostics...');
  await runFullSystemCheck();
});

export default bot;
