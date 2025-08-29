import { Bot, InlineKeyboard } from 'grammy';
import axios from 'axios';
import { chooseTrade, InlineTradePayload } from './ibkr-simple.js';
import { getHealthSnapshot, toggleSafeMode, toggleSystemActive, runFullSystemCheck } from './ops.js';
import { getMonitor } from './monitoring.js';

const token = process.env.TELEGRAM_BOT_TOKEN!;
export const bot = new Bot(token);
const chatId = process.env.TELEGRAM_CHAT_ID!;

// Add global error handler for bot
bot.catch((err: any) => {
  console.error('🚨 Bot error caught:', err);
  
  // Handle Markdown parsing errors specifically
  if (err.message && err.message.includes("can't parse entities")) {
    console.log('⚠️  Ignoring Markdown parsing error from old cached command');
    return;
  }
  
  // Handle Grammy BotError with Telegram API errors
  if (err.error && err.error.error_code) {
    console.error(`❌ Telegram API error ${err.error.error_code}: ${err.error.description}`);
    return;
  }
  
  // Handle direct error_code (different error format)
  if (err.error_code) {
    console.error(`❌ Telegram API error ${err.error_code}: ${err.description}`);
    return;
  }
  
  // Log other errors but don't crash
  console.error('❌ Unhandled bot error:', err);
});

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
      
      // Update advanced monitoring - successful message sent
      try {
        const { advancedMonitor } = await import('./advanced-monitoring.js');
        advancedMonitor.updateMessageSuccess();
      } catch (monitorError) {
        // Don't let monitoring errors break message sending
        console.log('⚠️ Monitor update failed (non-critical):', monitorError);
      }
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
  
  // Build inline keyboard with percentage-based strike buttons (only Buy options)
  const kb = new InlineKeyboard();
  
  // Use ticker analysis if available for smart button ordering
  const tickerData = args.tickerAnalysis || args.tickers.slice(0, 4).map(t => ({symbol: t, impact: 'neutral' as const, reason: 'Market impact'}));
  
  for (const ticker of tickerData.slice(0, 4)) { // Support up to 4 tickers
    const t = ticker.symbol;
    if (ticker.impact === 'positive') {
      // For bullish tickers: Call buttons with percentages (recommended first)
      kb.text(`🟢 ${t} C0.5%`, JSON.stringify({ a: 'buy_call', t, pct: '0.5' }));
      kb.text(`🟢 ${t} C1%`, JSON.stringify({ a: 'buy_call', t, pct: '1' }));
      kb.text(`🟢 ${t} C1.5%`, JSON.stringify({ a: 'buy_call', t, pct: '1.5' })).row();
      kb.text(`🟢 ${t} C2%`, JSON.stringify({ a: 'buy_call', t, pct: '2' }));
      kb.text(`🟢 ${t} C3%`, JSON.stringify({ a: 'buy_call', t, pct: '3' })).row();
      kb.text(`🔴 ${t} P0.5%`, JSON.stringify({ a: 'buy_put', t, pct: '0.5' }));
      kb.text(`🔴 ${t} P1%`, JSON.stringify({ a: 'buy_put', t, pct: '1' }));
      kb.text(`🔴 ${t} P1.5%`, JSON.stringify({ a: 'buy_put', t, pct: '1.5' })).row();
      kb.text(`🔴 ${t} P2%`, JSON.stringify({ a: 'buy_put', t, pct: '2' }));
      kb.text(`🔴 ${t} P3%`, JSON.stringify({ a: 'buy_put', t, pct: '3' })).row();
    } else if (ticker.impact === 'negative') {
      // For bearish tickers: Put buttons first (recommended)
      kb.text(`🔴 ${t} P0.5%`, JSON.stringify({ a: 'buy_put', t, pct: '0.5' }));
      kb.text(`🔴 ${t} P1%`, JSON.stringify({ a: 'buy_put', t, pct: '1' }));
      kb.text(`🔴 ${t} P1.5%`, JSON.stringify({ a: 'buy_put', t, pct: '1.5' })).row();
      kb.text(`🔴 ${t} P2%`, JSON.stringify({ a: 'buy_put', t, pct: '2' }));
      kb.text(`🔴 ${t} P3%`, JSON.stringify({ a: 'buy_put', t, pct: '3' })).row();
      kb.text(`🟢 ${t} C0.5%`, JSON.stringify({ a: 'buy_call', t, pct: '0.5' }));
      kb.text(`🟢 ${t} C1%`, JSON.stringify({ a: 'buy_call', t, pct: '1' }));
      kb.text(`🟢 ${t} C1.5%`, JSON.stringify({ a: 'buy_call', t, pct: '1.5' })).row();
      kb.text(`🟢 ${t} C2%`, JSON.stringify({ a: 'buy_call', t, pct: '2' }));
      kb.text(`🟢 ${t} C3%`, JSON.stringify({ a: 'buy_call', t, pct: '3' })).row();
    } else {
      // Neutral: all percentage options
      kb.text(`🟢 ${t} C0.5%`, JSON.stringify({ a: 'buy_call', t, pct: '0.5' }));
      kb.text(`🟢 ${t} C1%`, JSON.stringify({ a: 'buy_call', t, pct: '1' }));
      kb.text(`🟢 ${t} C1.5%`, JSON.stringify({ a: 'buy_call', t, pct: '1.5' })).row();
      kb.text(`🟢 ${t} C2%`, JSON.stringify({ a: 'buy_call', t, pct: '2' }));
      kb.text(`🟢 ${t} C3%`, JSON.stringify({ a: 'buy_call', t, pct: '3' })).row();
      kb.text(`🔴 ${t} P0.5%`, JSON.stringify({ a: 'buy_put', t, pct: '0.5' }));
      kb.text(`🔴 ${t} P1%`, JSON.stringify({ a: 'buy_put', t, pct: '1' }));
      kb.text(`🔴 ${t} P1.5%`, JSON.stringify({ a: 'buy_put', t, pct: '1.5' })).row();
      kb.text(`🔴 ${t} P2%`, JSON.stringify({ a: 'buy_put', t, pct: '2' }));
      kb.text(`🔴 ${t} P3%`, JSON.stringify({ a: 'buy_put', t, pct: '3' })).row();
    }
  }
  
  // Add manual trading button and preview button - mobile optimized
  kb.text('🛠 Manual', JSON.stringify({ a: 'manual_trade' }));
  kb.text('👁 Preview', JSON.stringify({ a: 'preview' })).row();
  
  // Add prominent link button to original post
  kb.url('🔗 View Original Post', args.url).row();

  // Calculate precise delays 
  const discoveryDelayMs = postDiscoveredAt.getTime() - originalPostTime.getTime();
  const processingDelayMs = alertTime.getTime() - postDiscoveredAt.getTime();
  
  // Build comprehensive message with PRECISE timing and professional design (restored full format)
  let message = `🦅 <b>Trump Alert • INSTANT</b>\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  
  // Show timing with professional formatting
  message += `🕐 <b>Original Post:</b> ${originalPostTime.toLocaleString('en-US', { 
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })} UTC\n`;
  
  message += `⚡ <b>Alert Time:</b> ${alertTime.toLocaleString('en-US', { 
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
  
  message += `${delayIcon} <b>Processing Time:</b> ${totalDelaySeconds} seconds\n`;
  
  // Technical breakdown with clear separation
  const breakdownParts = [];
  if (discoveryDelayMs > 1000) {
    breakdownParts.push(`🔍 Discovery: ${Math.round(discoveryDelayMs/1000)}s`);
  }
  if (analysisTimeMs > 0) {
    breakdownParts.push(`🧠 Analysis: ${Math.round(analysisTimeMs/1000)}s`);
  }
  breakdownParts.push(`📡 Delivery: ${Math.round(processingDelayMs/1000)}s`);
  
  if (breakdownParts.length > 0) {
    message += `📊 <b>Breakdown:</b> ${breakdownParts.join(' • ')}\n`;
  }
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Original post with better formatting
  if (args.originalPost) {
    const truncatedPost = args.originalPost.length > 200 
      ? args.originalPost.substring(0, 200) + '...' 
      : args.originalPost;
    message += `📄 <b>Original Trump Post:</b>\n`;
    message += `${truncatedPost}\n\n`;
  }
  
  // Analysis with professional presentation
  message += `📈 <b>Market Impact Analysis:</b>\n`;
  message += `${args.summary}\n\n`;
  
  // Trading opportunities section
  const relevanceEmoji = relevanceScore >= 8 ? '🎯' : relevanceScore >= 6 ? '🟢' : '🟡';
  message += `💰 <b>Trading Opportunities:</b> ${relevanceEmoji}${relevanceScore}/10\n\n`;
  
  if (args.tickerAnalysis && args.tickerAnalysis.length > 0) {
    // Enhanced ticker format with professional icons
    for (const ticker of args.tickerAnalysis) {
      const impactEmoji = ticker.impact === 'positive' ? '📈' : '📉';
      const impactText = ticker.impact === 'positive' ? 'BULLISH' : 'BEARISH';
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
  message += `🔗 <a href="${args.url}">View Original Post on Truth Social</a>`;

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
      
      // Update advanced monitoring - Trump post successfully processed
      try {
        const { advancedMonitor } = await import('./advanced-monitoring.js');
        advancedMonitor.updateTrumpPostProcessed(args.url);
      } catch (monitorError) {
        // Don't let monitoring errors break Trump alert sending
        console.log('⚠️ Monitor update failed (non-critical):', monitorError);
      }
    } catch (error: any) {
      console.error(`❌ Failed to send Trump alert to ${targetChatId}:`, error?.response?.data || error?.message || error);
    }
  }
  
  return results[0]; // Return first result for compatibility
}

// Add debugging for all messages
bot.on('message', (ctx) => {
  console.log('📨 Bot received message:', ctx.message.text, 'from:', ctx.from?.username);
  console.log('📨 Full message object:', JSON.stringify(ctx.message, null, 2));
});

bot.command('help', async (ctx) => {
  console.log('✅ HELP command received from:', ctx.from?.username);
  console.log('🔧 Processing help command...');
  const helpMessage = `<b>Help</b>

📊 <b>System Commands:</b>
/help - Show this help menu
/ping - Test bot connectivity  
/status - System status
/check - Run full diagnostics

⚙️ <b>Control Commands:</b>
/safe_mode on|off - Toggle safe mode
/system on|off - System control

🏦 <b>IBKR Trading:</b>
/connect_real_ibkr - Test IBKR connection
/ibkr_balance - View account balance
/ibkr_positions - View current positions
/place_real_order - Place manual order

📊 <b>Monitoring & Health:</b>
/health - System health report
/monitor - Recent errors check

💹 <b>Analytics & Reports:</b>
/daily - Generate daily trading report
/analytics [YYYY-MM-DD] - View analytics

🎯 <b>Usage:</b> Bot responds to Trump posts with trading buttons`;

  try {
    console.log('📤 Sending help message...');
    await ctx.reply(helpMessage, { parse_mode: 'HTML' });
    console.log('✅ Help message sent successfully!');
  } catch (error) {
    console.error('❌ Error sending help message:', error);
  }
});
// ping command handled by manual webhook handler in index.ts

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

// ===============================
// REAL IBKR CONNECTION COMMANDS
// ===============================

bot.command('connect_real_ibkr', async (ctx) => {
  if (!adminOnly(ctx)) return;
  
  try {
    await ctx.reply('🔍 Testing connection to YOUR real IBKR account...');
    
    // Import the real connector
    const { realIBKR } = await import('./real-ibkr-connector.js');
    
    const connectionTest = await realIBKR.testRealConnection();
    
    if (connectionTest.connected) {
      const data = connectionTest.data;
      
      let message = `✅ <b>SUCCESS! Connected to YOUR real IBKR account!</b>\n\n`;
      message += `🎯 <b>Account Verified:</b> ${data.accountId}\n`;
      message += `🔗 <b>Connection:</b> ${data.isRealAccount ? 'Real Account' : 'Demo'}\n`;
      message += `📈 <b>Mode:</b> ${data.mode.toUpperCase()}\n\n`;
      
      if (data.portfolio) {
        message += `💰 <b>Real Balance Found:</b>\n`;
        if (data.portfolio.NetLiquidation) {
          message += `├─ Net Liquidation: $${Number(data.portfolio.NetLiquidation.amount).toLocaleString()}\n`;
          message += `├─ Cash: $${Number(data.portfolio.TotalCashValue?.amount || 0).toLocaleString()}\n`;
          message += `└─ Buying Power: $${Number(data.portfolio.BuyingPower?.amount || 0).toLocaleString()}\n\n`;
        }
      }
      
      message += `🤖 <b>Bot Status:</b> Ready for real trading!\n`;
      message += `🔥 <b>Next:</b> Use /ibkr_balance and /ibkr_positions to see YOUR data`;
      
      await ctx.reply(message, { parse_mode: 'HTML' });
      
    } else {
      let message = `❌ <b>Failed to connect to real IBKR account</b>\n\n`;
      message += `🔴 <b>Error:</b> ${connectionTest.error}\n\n`;
      message += `🔧 <b>Solutions:</b>\n`;
      message += `1. Make sure TWS/Gateway is running on your computer\n`;
      message += `2. Enable API in TWS settings (port 5000)\n`;
      message += `3. Login with your real IBKR credentials\n`;
      message += `4. Check firewall settings\n\n`;
      message += `📋 <b>Setup Guide:</b> Check REAL_IBKR_SETUP_GUIDE.md`;
      
      await ctx.reply(message, { parse_mode: 'HTML' });
    }
    
  } catch (error: any) {
    await ctx.reply(`❌ Connection test failed: ${error?.message || error}`);
  }
});

bot.command('real_balance', async (ctx) => {
  if (!adminOnly(ctx)) return;
  
  try {
    await ctx.reply('💰 Accessing YOUR real IBKR account...');
    
    // First check if your server is healthy
    const serverResponse = await fetch(`${process.env.IBKR_BASE_URL}/health`);
    const serverHealth = await serverResponse.json();
    
    if (!serverHealth.ibkr_connected || !serverHealth.trading_ready) {
      await ctx.reply(`❌ <b>Your IBKR Server Not Ready</b>\n\nServer Status: ${serverHealth.status}\nIBKR Connected: ${serverHealth.ibkr_connected ? '✅' : '❌'}\nTrading Ready: ${serverHealth.trading_ready ? '✅' : '❌'}\n\n🔧 Check your server at: ${process.env.IBKR_BASE_URL}`, { parse_mode: 'HTML' });
      return;
    }
    
    // Try to get real data from your server
    let message = `💰 <b>YOUR REAL IBKR ACCOUNT</b>\n\n`;
    message += `🎯 <b>Account:</b> ${process.env.IBKR_ACCOUNT_ID}\n`;
    message += `🌐 <b>Server:</b> ${process.env.IBKR_BASE_URL}\n\n`;
    
    // Try to get real balance data using authentication
    try {
      const { realIBKR } = await import('./real-ibkr-connector.js');
      const balance = await realIBKR.getRealBalance();
      const positions = await realIBKR.getRealPositions();
      
      message += `💰 <b>Account Balance:</b>\n\n`;
      
      if (balance && balance.balance) {
        const bal = balance.balance;
        message += `💵 <b>Net Liquidation:</b> $${Number(bal.net_liquidation || 0).toLocaleString()}\n`;
        message += `💰 <b>Total Cash:</b> $${Number(bal.total_cash_value || 0).toLocaleString()}\n`;
        message += `💪 <b>Buying Power:</b> $${Number(bal.buying_power || 0).toLocaleString()}\n`;
        message += `📊 <b>Gross Position Value:</b> $${Number(bal.gross_position_value || 0).toLocaleString()}\n\n`;
        
        const pnl = Number(bal.unrealized_pnl || 0);
        const pnlIcon = pnl >= 0 ? '📈' : '📉';
        message += `${pnlIcon} <b>Unrealized P&L:</b> ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}\n\n`;
        
        message += `📋 <b>Account Details:</b>\n`;
        message += `├─ Account Type: ${bal.account_type}\n`;
        message += `├─ Trading Mode: ${bal.trading_mode}\n`;
        message += `├─ Account Status: ${bal.account_status}\n`;
        message += `├─ Currency: ${bal.currency}\n`;
        message += `└─ Last Updated: ${bal.last_updated}\n\n`;
        
        if (bal.net_liquidation === 0 && bal.total_cash_value === 0) {
          message += `ℹ️ <b>Account Status:</b> Empty account or no funds deposited\n`;
        }
      } else {
        message += `Raw balance data:\n${JSON.stringify(balance, null, 2)}\n\n`;
      }
      
      message += `📊 <b>Positions:</b>\n`;
      if (positions && typeof positions === 'object' && 'positions' in positions) {
        if (positions.total_positions === 0) {
          message += `No open positions\n\n`;
        } else {
          message += `${JSON.stringify(positions, null, 2)}\n\n`;
        }
      } else {
        message += `${JSON.stringify(positions, null, 2)}\n\n`;
      }
      
      message += `✅ <b>Authenticated access to YOUR server!</b>\n`;
      message += `🎯 Account: ${process.env.IBKR_ACCOUNT_ID}\n`;
      message += `📊 Trading Mode: ${positions.trading_mode || 'paper'}`;
    } catch (error: any) {
      message += `❌ <b>Authentication Error</b>\n\n`;
      message += `Error: ${error.message}\n\n`;
      message += `🔧 Check server connection and credentials.`;
    }
    
    await ctx.reply(message, { parse_mode: 'HTML' });
    
  } catch (error: any) {
    await ctx.reply(`❌ Connection error: ${error?.message || error}\n\n🔧 Check server: ${process.env.IBKR_BASE_URL}`);
  }
});

bot.command('real_positions', async (ctx) => {
  if (!adminOnly(ctx)) return;
  
  try {
    await ctx.reply('📊 Getting YOUR real positions...');
    
    const { realIBKR } = await import('./real-ibkr-connector.js');
    const positions = await realIBKR.getRealPositions();
    
    // First check if your server is healthy
    const serverResponse = await fetch(`${process.env.IBKR_BASE_URL}/health`);
    const serverHealth = await serverResponse.json();
    
    if (!serverHealth.ibkr_connected || !serverHealth.trading_ready) {
      await ctx.reply(`❌ <b>Your IBKR Server Not Ready</b>\n\nServer Status: ${serverHealth.status}\nIBKR Connected: ${serverHealth.ibkr_connected ? '✅' : '❌'}\nTrading Ready: ${serverHealth.trading_ready ? '✅' : '❌'}`, { parse_mode: 'HTML' });
      return;
    }
    
    // Try to get real positions from your server
    let message = `📊 <b>YOUR REAL PORTFOLIO</b>\n\n`;
    message += `🎯 <b>Account:</b> ${process.env.IBKR_ACCOUNT_ID}\n`;
    message += `🌐 <b>Server:</b> ${process.env.IBKR_BASE_URL}\n\n`;
    
    // Try to get real positions using authentication
    try {
      const { realIBKR } = await import('./real-ibkr-connector.js');
      const positions = await realIBKR.getRealPositions();
      
      message += `📊 <b>Live Positions:</b>\n\n`;
      
      if (positions && typeof positions === 'object' && 'total_positions' in positions) {
        message += `Total Positions: ${(positions as any).total_positions}\n`;
        message += `Trading Mode: ${(positions as any).trading_mode || 'paper'}\n`;
        message += `Last Updated: ${(positions as any).last_updated || 'Unknown'}\n\n`;
        
        if ((positions as any).total_positions === 0) {
          message += `✅ <b>No Open Positions</b>\n`;
          message += `Your account is ready for trading.\n\n`;
        } else {
          message += `<b>Active Positions:</b>\n`;
          message += `${JSON.stringify((positions as any).positions, null, 2)}\n\n`;
        }
      } else {
        message += `Positions data:\n${JSON.stringify(positions, null, 2)}\n\n`;
      }
      
      message += `✅ <b>Authenticated access to YOUR server!</b>\n`;
      message += `🎯 Account: ${process.env.IBKR_ACCOUNT_ID}`;
    } catch (error: any) {
      message += `❌ <b>Positions Access Error</b>\n\n`;
      message += `Error: ${error.message}\n\n`;
      message += `🔧 Check authentication with your server.`;
    }
    
    await ctx.reply(message, { parse_mode: 'HTML' });
    
  } catch (error: any) {
    await ctx.reply(`❌ Real positions error: ${error?.message || error}\n\n🔧 Try: /connect_real_ibkr first`);
  }
});

// Add aliases for easier access
bot.command('ibkr_positions', async (ctx) => {
  if (!adminOnly(ctx)) return;
  
  try {
    await ctx.reply('📊 Accessing YOUR IBKR positions...');
    
    // First check if your server is healthy
    const serverResponse = await fetch(`${process.env.IBKR_BASE_URL}/health`);
    const serverHealth = await serverResponse.json();
    
    if (!serverHealth.ibkr_connected || !serverHealth.trading_ready) {
      await ctx.reply(`❌ <b>Your IBKR Server Not Ready</b>\n\nServer Status: ${serverHealth.status}\nIBKR Connected: ${serverHealth.ibkr_connected ? '✅' : '❌'}\nTrading Ready: ${serverHealth.trading_ready ? '✅' : '❌'}`, { parse_mode: 'HTML' });
      return;
    }
    
    // Try to get real positions using authentication
    try {
      const { realIBKR } = await import('./real-ibkr-connector.js');
      const positions = await realIBKR.getRealPositions();
      
      let message = `📊 <b>YOUR IBKR POSITIONS</b>\n\n`;
      message += `🎯 <b>Account:</b> ${process.env.IBKR_ACCOUNT_ID}\n`;
      message += `🌐 <b>Server:</b> ${process.env.IBKR_BASE_URL}\n\n`;
      
      if (positions && typeof positions === 'object' && 'total_positions' in positions) {
        message += `📈 <b>Total Positions:</b> ${(positions as any).total_positions}\n`;
        message += `🔄 <b>Trading Mode:</b> ${(positions as any).trading_mode || 'paper'}\n`;
        message += `⏰ <b>Last Updated:</b> ${(positions as any).last_updated || 'Unknown'}\n\n`;
        
        if ((positions as any).total_positions === 0) {
          message += `✅ <b>No Open Positions</b>\n`;
          message += `Your account is ready for new trades.\n\n`;
        } else {
          message += `📊 <b>Active Positions:</b>\n`;
          message += `${JSON.stringify((positions as any).positions, null, 2)}\n\n`;
        }
      } else {
        message += `📊 <b>Raw Data:</b>\n${JSON.stringify(positions, null, 2)}\n\n`;
      }
      
      message += `✅ <b>Live data from YOUR server!</b>`;
      
      await ctx.reply(message, { parse_mode: 'HTML' });
      
    } catch (error: any) {
      await ctx.reply(`❌ <b>Connection Error</b>\n\nError: ${error.message}\n\n🔧 Check your IBKR server connection.`);
    }
    
  } catch (error: any) {
    await ctx.reply(`❌ Server error: ${error?.message || error}\n\n🔧 Server: ${process.env.IBKR_BASE_URL}`);
  }
});

bot.command('ibkr_balance', async (ctx) => {
  if (!adminOnly(ctx)) return;
  
  try {
    await ctx.reply('💰 Accessing YOUR IBKR balance...');
    
    // First check if your server is healthy
    const serverResponse = await fetch(`${process.env.IBKR_BASE_URL}/health`);
    const serverHealth = await serverResponse.json();
    
    if (!serverHealth.ibkr_connected || !serverHealth.trading_ready) {
      await ctx.reply(`❌ <b>Your IBKR Server Not Ready</b>\n\nServer Status: ${serverHealth.status}\nIBKR Connected: ${serverHealth.ibkr_connected ? '✅' : '❌'}\nTrading Ready: ${serverHealth.trading_ready ? '✅' : '❌'}`, { parse_mode: 'HTML' });
      return;
    }
    
    // Try to get real balance using authentication
    try {
      const { realIBKR } = await import('./real-ibkr-connector.js');
      const balance = await realIBKR.getRealBalance();
      
      let message = `💰 <b>YOUR IBKR ACCOUNT BALANCE</b>\n\n`;
      message += `🎯 <b>Account:</b> ${process.env.IBKR_ACCOUNT_ID}\n`;
      message += `🌐 <b>Server:</b> ${process.env.IBKR_BASE_URL}\n\n`;
      
      if (balance && balance.balance) {
        const bal = balance.balance;
        message += `💵 <b>Net Liquidation:</b> $${Number(bal.net_liquidation || 0).toLocaleString()}\n`;
        message += `💰 <b>Total Cash:</b> $${Number(bal.total_cash_value || 0).toLocaleString()}\n`;
        message += `💪 <b>Buying Power:</b> $${Number(bal.buying_power || 0).toLocaleString()}\n`;
        message += `📊 <b>Gross Position Value:</b> $${Number(bal.gross_position_value || 0).toLocaleString()}\n\n`;
        
        const pnl = Number(bal.unrealized_pnl || 0);
        const pnlIcon = pnl >= 0 ? '📈' : '📉';
        message += `${pnlIcon} <b>Unrealized P&L:</b> ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}\n\n`;
        
        message += `📋 <b>Account Info:</b>\n`;
        message += `├─ Type: ${bal.account_type}\n`;
        message += `├─ Trading Mode: ${bal.trading_mode}\n`;
        message += `├─ Status: ${bal.account_status}\n`;
        message += `└─ Currency: ${bal.currency}\n\n`;
        
        if (bal.net_liquidation === 0 && bal.total_cash_value === 0) {
          message += `ℹ️ <b>Note:</b> Account appears empty - no funds currently deposited\n`;
        }
      } else {
        message += `Balance data: ${JSON.stringify(balance, null, 2)}\n\n`;
      }
      
      message += `✅ <b>Live data from YOUR server!</b>`;
      
      await ctx.reply(message, { parse_mode: 'HTML' });
      
    } catch (error: any) {
      await ctx.reply(`❌ <b>Balance Access Error</b>\n\nError: ${error.message}\n\n🔧 Check your IBKR server connection.`);
    }
    
  } catch (error: any) {
    await ctx.reply(`❌ Server error: ${error?.message || error}\n\n🔧 Server: ${process.env.IBKR_BASE_URL}`);
  }
});

bot.command('place_real_order', async (ctx) => {
  if (!adminOnly(ctx)) return;
  
  const args = ctx.message?.text?.split(' ').slice(1) || [];
  
  if (args.length < 3) {
    await ctx.reply(`❌ Usage: /place_real_order <SYMBOL> <BUY/SELL> <QUANTITY> [PRICE]\n\nExample: /place_real_order TSLA BUY 10\nExample: /place_real_order AAPL SELL 5 450.00`);
    return;
  }
  
  const [symbol, action, quantityStr, priceStr] = args;
  const quantity = parseInt(quantityStr);
  const price = priceStr ? parseFloat(priceStr) : undefined;
  
  if (!['BUY', 'SELL'].includes(action.toUpperCase())) {
    await ctx.reply('❌ Action must be BUY or SELL');
    return;
  }
  
  if (!quantity || quantity <= 0) {
    await ctx.reply('❌ Quantity must be a positive number');
    return;
  }
  
  try {
    await ctx.reply(`🔥 Placing REAL order: ${action} ${quantity} ${symbol}${price ? ` @ $${price}` : ' (Market)'}\n\n⚠️ This will execute on your REAL IBKR account!`);
    
    const { realIBKR } = await import('./real-ibkr-connector.js');
    
    const orderResult = await realIBKR.placeRealOrder({
      symbol: symbol.toUpperCase(),
      action: action.toUpperCase() as 'BUY' | 'SELL',
      quantity,
      orderType: price ? 'LMT' : 'MKT',
      price
    });
    
    let message = `✅ <b>REAL ORDER PLACED SUCCESSFULLY!</b>\n\n`;
    message += `📊 <b>Order Details:</b>\n`;
    message += `├─ Symbol: ${symbol.toUpperCase()}\n`;
    message += `├─ Action: ${action.toUpperCase()}\n`;
    message += `├─ Quantity: ${quantity}\n`;
    message += `├─ Type: ${price ? 'LIMIT' : 'MARKET'}\n`;
    if (price) message += `├─ Price: $${price}\n`;
    message += `└─ Account: ${process.env.IBKR_ACCOUNT_ID}\n\n`;
    
    if (orderResult.id) {
      message += `🎯 <b>Order ID:</b> ${orderResult.id}\n`;
    }
    
    message += `🔥 <b>Status:</b> Order submitted to IBKR\n`;
    message += `📱 Check TWS or IBKR mobile app for execution status`;
    
    await ctx.reply(message, { parse_mode: 'HTML' });
    
  } catch (error: any) {
    await ctx.reply(`❌ Order failed: ${error?.message || error}\n\n🔧 Make sure you're connected with /connect_real_ibkr`);
  }
});

export default bot;
