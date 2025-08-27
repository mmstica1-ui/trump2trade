import { Bot, InlineKeyboard } from 'grammy';
import axios from 'axios';
import { chooseTrade, InlineTradePayload } from './ibkr.js';
import { getHealthSnapshot, toggleSafeMode, toggleSystemActive, runFullSystemCheck } from './ops.js';
import { getMonitor } from './monitoring.js';

const token = process.env.TELEGRAM_BOT_TOKEN!;
export const bot = new Bot(token);
const chatId = process.env.TELEGRAM_CHAT_ID!;

// Support multiple chat IDs for both personal chat and group
function getAllChatIds(): string[] {
  const chatIds = [chatId]; // Always include the main chat
  
  // Add group chat if configured
  const groupChatId = process.env.TELEGRAM_GROUP_CHAT_ID;
  if (groupChatId && groupChatId.trim() && groupChatId !== '') {
    // Support comma-separated list of chat IDs
    const groupIds = groupChatId.split(',').map(id => id.trim()).filter(id => id);
    chatIds.push(...groupIds);
  }
  
  return chatIds;
}

function adminOnly(ctx: any) {
  return String(ctx.chat?.id) === String(chatId);
}

export async function sendText(text: string) {
  const chatIds = getAllChatIds();
  const results = [];
  
  for (const targetChatId of chatIds) {
    try {
      const result = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: targetChatId,
        text,
        parse_mode: 'HTML'
      });
      console.log(`✅ Telegram message sent successfully to ${targetChatId}: ${result.data.result.message_id}`);
      results.push(result);
    } catch (error: any) {
      console.error(`❌ Failed to send Telegram message to ${targetChatId}:`, error?.response?.data || error?.message || error);
    }
  }
  
  return results[0]; // Return first result for compatibility
}

export async function sendTrumpAlert(args: { 
  summary: string; 
  tickers: string[]; 
  tickerAnalysis?: Array<{symbol: string; impact: 'positive' | 'negative'; reason: string}>;
  url: string; 
  originalPost?: string; 
  timestamp?: Date;
  originalPostTime?: Date;
  postDiscoveredAt?: Date;
  analysisTimeMs?: number;
  relevanceScore?: number;
  totalDelayMs?: number;
}) {
  const alertTime = args.timestamp || new Date();
  const originalPostTime = args.originalPostTime || args.postDiscoveredAt || alertTime;
  const postDiscoveredAt = args.postDiscoveredAt || alertTime;
  const analysisTimeMs = args.analysisTimeMs || 0;
  const relevanceScore = args.relevanceScore || 5;
  const totalDelayMs = args.totalDelayMs || (alertTime.getTime() - originalPostTime.getTime());
  
  // Build inline keyboard with smart Call/Put buttons for each ticker
  const kb = new InlineKeyboard();
  
  // Use ticker analysis if available for smart button ordering
  const tickerData = args.tickerAnalysis || args.tickers.slice(0, 6).map(t => ({symbol: t, impact: 'neutral' as const, reason: 'Market impact'}));
  
  for (const ticker of tickerData.slice(0, 6)) { // Support up to 6 tickers
    if (ticker.impact === 'positive') {
      // For bullish tickers: Call button first (recommended) - Hebrew text
      kb.text(`📈 קנה Call ${ticker.symbol}`, JSON.stringify({ a: 'buy_call', t: ticker.symbol }));
      kb.text(`📉 קנה Put ${ticker.symbol}`, JSON.stringify({ a: 'buy_put', t: ticker.symbol })).row();
    } else if (ticker.impact === 'negative') {
      // For bearish tickers: Put button first (recommended) - Hebrew text
      kb.text(`📉 קנה Put ${ticker.symbol}`, JSON.stringify({ a: 'buy_put', t: ticker.symbol }));
      kb.text(`📈 קנה Call ${ticker.symbol}`, JSON.stringify({ a: 'buy_call', t: ticker.symbol })).row();
    } else {
      // Neutral or legacy format: default order - Hebrew text
      kb.text(`📈 קנה Call ${ticker.symbol}`, JSON.stringify({ a: 'buy_call', t: ticker.symbol }));
      kb.text(`📉 קנה Put ${ticker.symbol}`, JSON.stringify({ a: 'buy_put', t: ticker.symbol })).row();
    }
  }
  
  // Add manual trading button and preview button - Hebrew text
  kb.text('💼 מסחר ידני', JSON.stringify({ a: 'manual_trade' }));
  kb.text('👁️ תצוגה מקדימה', JSON.stringify({ a: 'preview' })).row();
  
  // Add prominent link button to original post - Hebrew text
  kb.url('🔗 צפייה בפוסט המקורי', args.url).row();

  // Calculate precise delays 
  const discoveryDelayMs = postDiscoveredAt.getTime() - originalPostTime.getTime();
  const processingDelayMs = alertTime.getTime() - postDiscoveredAt.getTime();
  
  // Build comprehensive message with PRECISE timing and improved Hebrew-friendly design
  let message = `🦅 <b>התרעת טראמפ • מיידית</b>\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  
  // Show timing with more professional icons and Hebrew format
  message += `🕐 <b>פוסט מקורי:</b> ${originalPostTime.toLocaleString('he-IL', { 
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })} UTC\n`;
  
  message += `⚡ <b>זמן התרעה:</b> ${alertTime.toLocaleString('he-IL', { 
    timeZone: 'UTC', 
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })} UTC\n`;
  
  // Professional delay indication with clearer icons
  const totalDelaySeconds = Math.round(totalDelayMs / 1000);
  let delayIcon = '🚀'; // Ultra fast
  if (totalDelaySeconds > 5) delayIcon = '⚡'; // Fast
  if (totalDelaySeconds > 15) delayIcon = '⏱️'; // Medium
  if (totalDelaySeconds > 30) delayIcon = '⚠️'; // Slow
  
  message += `${delayIcon} <b>זמן עיבוד:</b> ${totalDelaySeconds} שניות\n`;
  
  // Technical breakdown with clear separation
  const breakdownParts = [];
  if (discoveryDelayMs > 1000) {
    breakdownParts.push(`🔍 גילוי: ${Math.round(discoveryDelayMs/1000)}ש`);
  }
  if (analysisTimeMs > 0) {
    breakdownParts.push(`🧠 ניתוח: ${Math.round(analysisTimeMs/1000)}ש`);
  }
  breakdownParts.push(`📡 משלוח: ${Math.round(processingDelayMs/1000)}ש`);
  
  if (breakdownParts.length > 0) {
    message += `📊 פירוט: ${breakdownParts.join(' • ')}\n`;
  }
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Original post with better formatting
  if (args.originalPost) {
    const truncatedPost = args.originalPost.length > 200 
      ? args.originalPost.substring(0, 200) + '...' 
      : args.originalPost;
    message += `📄 <b>הפוסט המקורי:</b>\n`;
    message += `<blockquote expandable>${truncatedPost}</blockquote>\n\n`;
  }
  
  // Analysis with professional presentation
  message += `📈 <b>ניתוח השפעה על השוק:</b>\n`;
  message += `${args.summary}\n\n`;
  
  // Trading opportunities with Hebrew terminology
  const relevanceEmoji = relevanceScore >= 8 ? '🎯' : relevanceScore >= 6 ? '🟢' : '🟡';
  message += `💰 <b>הזדמנויות מסחר:</b> ${relevanceEmoji}${relevanceScore}/10\n\n`;
  
  if (args.tickerAnalysis && args.tickerAnalysis.length > 0) {
    // Enhanced ticker format with professional icons
    for (const ticker of args.tickerAnalysis) {
      const impactEmoji = ticker.impact === 'positive' ? '📈' : '📉';
      const impactText = ticker.impact === 'positive' ? 'עלייה צפויה' : 'ירידה צפויה';
      const impactColor = ticker.impact === 'positive' ? '🟢' : '🔴';
      
      message += `${impactColor} <b>${ticker.symbol}</b> • ${impactEmoji} ${impactText}\n`;
      message += `    💭 ${ticker.reason}\n\n`;
    }
  } else {
    // Fallback format with better styling
    message += `📊 <code>${args.tickers.join(' • ')}</code>\n\n`;
  }
  
  // Link with professional styling
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🔗 <a href="${args.url}">צפייה בפוסט המקורי ב-Truth Social</a>`;

  // Add to daily analytics
  try {
    const { getDailyAnalytics } = await import('./daily-analytics.js');
    const analytics = getDailyAnalytics();
    analytics.addPost({
      originalPost: args.originalPost || 'Post content unavailable',
      tickers: args.tickers,
      relevanceScore: relevanceScore,
      processingTimeMs: totalDelayMs,
      url: args.url
    });
  } catch (analyticsError: any) {
    console.warn('Failed to add post to daily analytics:', analyticsError?.message || analyticsError);
  }

  // Send to all configured chat IDs (personal + groups)
  const chatIds = getAllChatIds();
  const results = [];
  
  for (const targetChatId of chatIds) {
    try {
      console.log(`🦅 sendTrumpAlert called for chat ${targetChatId}: {
  summary: "${args.summary}",
  tickers: ${JSON.stringify(args.tickers)},
  tickerAnalysis: ${JSON.stringify(args.tickerAnalysis || 'none')},
  url: '${args.url}'
}`);
      
      const result = await bot.api.sendMessage(targetChatId, message, { 
        parse_mode: 'HTML', 
        reply_markup: kb,
        link_preview_options: { is_disabled: false }
      });
      
      console.log(`✅ Telegram message sent successfully to ${targetChatId}: ${result.message_id}`);
      results.push(result);
    } catch (error: any) {
      console.error(`❌ Failed to send Trump alert to ${targetChatId}:`, error?.response?.data || error?.message || error);
    }
  }
  
  return results[0]; // Return first result for compatibility
}

bot.command('help', ctx => ctx.reply('Commands: /help, /ping, /status, /health, /monitor, /daily, /analytics, /safe_mode on|off, /system on|off, /check'));
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


// Monitoring commands
bot.command('health', async (ctx) => {
  if (!adminOnly(ctx)) return;
  try {
    const monitor = getMonitor();
    const health = monitor.getSystemHealth();
    
    const statusIcon = health.status === 'healthy' ? '✅' : health.status === 'warning' ? '⚠️' : '🆘';
    const uptimeHours = Math.floor(health.uptime / (1000 * 60 * 60));
    const uptimeMins = Math.floor((health.uptime % (1000 * 60 * 60)) / (1000 * 60));
    
    const connectionStatus = Object.entries(health.connections)
      .map(([service, status]) => `${service}: ${status ? '✅' : '❌'}`)
      .join('\n');
    
    const message = `${statusIcon} <b>System Health Report</b>\n\n` +
      `🔄 <b>Status:</b> ${health.status.toUpperCase()}\n` +
      `⏱️ <b>Uptime:</b> ${uptimeHours}h ${uptimeMins}m\n` +
      `🧠 <b>Memory:</b> ${health.memory.percentage}% used\n` +
      `📊 <b>Alerts 24h:</b> ${health.alertsSent24h}\n` +
      `🔗 <b>Connections:</b>\n${connectionStatus}\n` +
      `🐛 <b>Recent Errors:</b> ${health.errors.length}\n` +
      `📮 <b>Last Post:</b> ${health.lastPostProcessed ? 
        new Date(health.lastPostProcessed).toLocaleString('he-IL') : 'Never'}`;
    
    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    await ctx.reply(`❌ Health check failed: ${error}`);
  }
});

bot.command('monitor', async (ctx) => {
  if (!adminOnly(ctx)) return;
  try {
    const monitor = getMonitor();
    const health = monitor.getSystemHealth();
    
    if (health.errors.length === 0) {
      await ctx.reply('✅ No recent errors found');
      return;
    }
    
    const recentErrors = health.errors.slice(-5).map((error, index) => 
      `${index + 1}. [${new Date(error.timestamp).toLocaleTimeString('he-IL')}] ${error.error}`
    ).join('\n');
    
    const message = `🐛 <b>Recent System Errors (${health.errors.length} total)</b>\n\n` + recentErrors;
    
    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    await ctx.reply(`❌ Monitor check failed: ${error}`);
  }
});

// Daily analytics commands
bot.command('daily', async (ctx) => {
  if (!adminOnly(ctx)) return;
  try {
    const { getDailyAnalytics } = await import('./daily-analytics.js');
    const analytics = getDailyAnalytics();
    await analytics.triggerDailyReport();
  } catch (error: any) {
    await ctx.reply(`❌ Daily report failed: ${error?.message || error}`);
  }
});

bot.command('analytics', async (ctx) => {
  if (!adminOnly(ctx)) return;
  try {
    const args = (ctx.message?.text || '').split(' ');
    const dateArg = args[1]; // Optional date in YYYY-MM-DD format
    
    const { getDailyAnalytics } = await import('./daily-analytics.js');
    const analytics = getDailyAnalytics();
    
    if (dateArg && dateArg.match(/^\d{4}-\d{2}-\d{2}$/)) {
      await analytics.triggerDailyReport(dateArg);
    } else {
      const today = new Date().toISOString().split('T')[0];
      const todayData = analytics.getAnalytics(today);
      
      if (!todayData || todayData.totalPosts === 0) {
        await ctx.reply('📊 No posts today yet. System is monitoring for Trump posts...\n\nUse /analytics YYYY-MM-DD for specific date');
      } else {
        await analytics.triggerDailyReport();
      }
    }
  } catch (error: any) {
    await ctx.reply(`❌ Analytics failed: ${error?.message || error}`);
  }
});

export default bot;
