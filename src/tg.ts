import { Bot, InlineKeyboard } from 'grammy';
import axios from 'axios';
import { chooseTrade, InlineTradePayload } from './ibkr';

const token = process.env.TELEGRAM_BOT_TOKEN!;
export const bot = new Bot(token);
const chatId = process.env.TELEGRAM_CHAT_ID!;

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

bot.command('help', ctx => ctx.reply('Commands: /help, /ping, /stats, /health'));
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

export default bot;
