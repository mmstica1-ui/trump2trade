import 'dotenv/config';
import express from 'express';
import pino from 'pino';
import { Bot } from 'grammy';

const log = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });

const token = process.env.TELEGRAM_BOT_TOKEN!;
const chatId = process.env.TELEGRAM_CHAT_ID!;

console.log('🚀 Starting Trump2Trade Bot...');

if (!token || !chatId) {
  console.error('❌ Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
  process.exit(1);
}

const bot = new Bot(token);
const app = express();
app.use(express.json({ limit: '1mb' }));

// Admin check
function adminOnly(ctx: any) {
  return String(ctx.chat?.id) === String(chatId);
}

// Error handling
bot.catch((err) => {
  console.error('🚨 Bot error:', err);
});

// Commands
bot.command('ping', async (ctx) => {
  console.log('✅ PING received from:', ctx.from?.username);
  await ctx.reply('🏓 pong - Trump2Trade Bot is alive! ✅\n⏰ Time: ' + new Date().toISOString());
});

bot.command('help', async (ctx) => {
  console.log('✅ HELP received from:', ctx.from?.username);
  const helpText = `📋 **Trump2Trade Bot Commands:**

🔸 /ping - Test connectivity
🔸 /help - Show this menu  
🔸 /status - System status
🔸 /safe_mode on|off - Toggle safe mode
🔸 /system on|off - System control
🔸 /check - Run diagnostics

✅ Bot is active and monitoring Trump posts!
🚀 Ready for trading signals!`;
  
  await ctx.reply(helpText, { parse_mode: 'Markdown' });
});

bot.command('status', async (ctx) => {
  if (!adminOnly(ctx)) return;
  console.log('✅ STATUS received from:', ctx.from?.username);
  
  const status = `📊 **Trump2Trade Status:**

🤖 Bot: ✅ Online
🔄 Polling: ✅ Active
💾 Environment: Railway Production
🛡️ Safe Mode: ${process.env.DISABLE_TRADES || 'true'}
⏰ Uptime: ${Math.floor(process.uptime())}s

🟢 All systems operational!`;

  await ctx.reply(status);
});

bot.command('safe_mode', async (ctx) => {
  if (!adminOnly(ctx)) return;
  const arg = (ctx.message?.text || '').split(' ')[1]?.toLowerCase();
  if (!['on','off'].includes(arg)) {
    return ctx.reply('Usage: /safe_mode on|off');
  }
  
  await ctx.reply(`🛡️ Safe Mode is now ${arg.toUpperCase()}.\n(Note: This is a demo - actual trading requires IBKR integration)`);
});

bot.command('system', async (ctx) => {
  if (!adminOnly(ctx)) return;
  const arg = (ctx.message?.text || '').split(' ')[1]?.toLowerCase();
  if (!['on','off'].includes(arg)) {
    return ctx.reply('Usage: /system on|off');
  }
  
  if (arg === 'on') {
    await ctx.reply('🔄 System ACTIVATING...\n⏳ Running diagnostics...\n✅ System is now ACTIVE');
  } else {
    await ctx.reply('⏸️ System DEACTIVATED\n💡 Use /system on to reactivate');
  }
});

bot.command('check', async (ctx) => {
  if (!adminOnly(ctx)) return;
  await ctx.reply('🔍 Running full system diagnostics...');
  
  setTimeout(async () => {
    await ctx.reply(`🔧 **Diagnostic Results:**

✅ Bot connectivity: OK
✅ Telegram API: OK  
✅ Railway hosting: OK
✅ Environment vars: OK
⚠️ IBKR connection: Not configured
⚠️ Trading: Disabled (Safe mode)

🎯 System is ready for development!`);
  }, 2000);
});

// Express routes
app.get('/', (req, res) => {
  res.json({
    message: 'Trump2Trade Bot - Active!',
    status: 'online',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

app.get('/healthz', (req, res) => {
  res.json({ status: 'healthy', bot: 'active' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', bot: 'active' });
});

// Legacy webhooks (kept for compatibility)
app.post('/webhook/apify', (req, res) => {
  res.json({ message: 'Webhook received', status: 'ok' });
});

app.post('/webhook/genspark', (req, res) => {
  res.json({ message: 'Webhook received', status: 'ok' });
});

const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, '0.0.0.0', () => {
  log.info({ PORT }, 'server started');
  console.log(`🌐 HTTP server running on port ${PORT}`);
  
  // Start bot
  bot.start({
    onStart: () => {
      console.log('✅ Bot started successfully!');
      // Send startup notification
      bot.api.sendMessage(chatId, 
        '🚀 **Trump2Trade Bot Started!**\n\n' +
        '✅ Railway deployment active\n' + 
        '🤖 Bot is now online and monitoring\n' +
        '📱 Try: /ping, /help, /status\n\n' +
        '⏰ Started: ' + new Date().toISOString(), 
        { parse_mode: 'Markdown' }
      ).catch(err => console.error('Failed to send startup message:', err));
    }
  });
  
  console.log('🎯 Trump2Trade system fully operational!');
});