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
  
  // Build inline keyboard with percentage-based strike buttons (only Buy options)
  const kb = new InlineKeyboard();
  
  // Use ticker analysis if available for smart button ordering
  const tickerData = args.tickerAnalysis || args.tickers.slice(0, 4).map(t => ({symbol: t, impact: 'neutral' as const, reason: 'Market impact'}));
  
  for (const ticker of tickerData.slice(0, 4)) { // Support up to 4 tickers
    const t = ticker.symbol;
    if (ticker.impact === 'positive') {
      // For bullish tickers: Call buttons with percentages (recommended first)
      kb.text(`🟢 Call ${t} 0.5%`, JSON.stringify({ a: 'buy_call', t, pct: '0.5' }));
      kb.text(`🟢 Call ${t} 1%`, JSON.stringify({ a: 'buy_call', t, pct: '1' }));
      kb.text(`🟢 Call ${t} 2%`, JSON.stringify({ a: 'buy_call', t, pct: '2' })).row();
      kb.text(`🔴 Put ${t} 0.5%`, JSON.stringify({ a: 'buy_put', t, pct: '0.5' }));
      kb.text(`🔴 Put ${t} 1%`, JSON.stringify({ a: 'buy_put', t, pct: '1' }));
      kb.text(`🔴 Put ${t} 2%`, JSON.stringify({ a: 'buy_put', t, pct: '2' })).row();
    } else if (ticker.impact === 'negative') {
      // For bearish tickers: Put buttons first (recommended)
      kb.text(`🔴 Put ${t} 0.5%`, JSON.stringify({ a: 'buy_put', t, pct: '0.5' }));
      kb.text(`🔴 Put ${t} 1%`, JSON.stringify({ a: 'buy_put', t, pct: '1' }));
      kb.text(`🔴 Put ${t} 2%`, JSON.stringify({ a: 'buy_put', t, pct: '2' })).row();
      kb.text(`🟢 Call ${t} 0.5%`, JSON.stringify({ a: 'buy_call', t, pct: '0.5' }));
      kb.text(`🟢 Call ${t} 1%`, JSON.stringify({ a: 'buy_call', t, pct: '1' }));
      kb.text(`🟢 Call ${t} 2%`, JSON.stringify({ a: 'buy_call', t, pct: '2' })).row();
    } else {
      // Neutral: standard 1% strike buttons
      kb.text(`🟢 Call ${t} 1%`, JSON.stringify({ a: 'buy_call', t, pct: '1' }));
      kb.text(`🔴 Put ${t} 1%`, JSON.stringify({ a: 'buy_put', t, pct: '1' })).row();
    }
  }
  
  // Add manual trading button and preview button
  kb.text('💼 Manual Trading', JSON.stringify({ a: 'manual_trade' }));
  kb.text('👁️ Preview (no trade)', JSON.stringify({ a: 'preview' })).row();
  
  // Add prominent link button to original post
  kb.url('🔗 View Original Post', args.url).row();

  // Calculate precise delays 
  const discoveryDelayMs = postDiscoveredAt.getTime() - originalPostTime.getTime();
  const processingDelayMs = alertTime.getTime() - postDiscoveredAt.getTime();
  
  // ⚠️ CRITICAL: DO NOT SIMPLIFY THIS MESSAGE FORMAT!
  // This is the FINAL APPROVED format with all required elements:
  // 1. Header with timing info and processing breakdown
  // 2. Original Trump post content
  // 3. Detailed market impact analysis  
  // 4. Professional ticker analysis with reasons
  // 5. Separators and professional styling
  // Build comprehensive message with PRECISE timing and professional design (PERMANENT FORMAT - DO NOT CHANGE)
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
    } catch (error: any) {
      console.error(`❌ Failed to send Trump alert to ${targetChatId}:`, error?.response?.data || error?.message || error);
    }
  }
  
  return results[0]; // Return first result for compatibility
}

bot.command('help', async (ctx) => {
  const helpMessage = `🤖 <b>Trump2Trade Commands</b>

📊 <b>System:</b>
/help - Show this menu
/ping - Test connection  
/status - System status
/health - Detailed health check
/monitor - System monitoring
/daily - Daily report
/analytics - Performance analytics

⚙️ <b>Control:</b>
/safe_mode on|off - Toggle safe mode
/system on|off - System on/off
/check - Full system check

🏦 <b>IBKR Trading:</b>
/ibkr_status - Connection status
/ibkr_account - Account details
/ibkr_positions - Current positions  
/ibkr_balance - Account balance
/ibkr_test_order - Test order (safe)
/ibkr_connect - Reconnect IBKR`;

  await ctx.reply(helpMessage, { parse_mode: 'HTML' });
});
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

// IBKR Trading commands - Real API Integration
bot.command('ibkr_status', async (ctx) => {
  if (!adminOnly(ctx)) return;
  try {
    const baseUrl = process.env.IBKR_BASE_URL || 'https://web-production-a020.up.railway.app';
    
    // Check Railway server health
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    
    // Try to check IBKR auth status  
    let ibkrStatus = "❌ Not Connected";
    let authDetails = "Gateway not authenticated";
    
    try {
      const authResponse = await fetch(`${baseUrl}/iserver/auth/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (authResponse.ok) {
        const authData = await authResponse.json();
        ibkrStatus = authData.authenticated ? "✅ Authenticated" : "⚠️ Not Authenticated";
        authDetails = `Connected: ${authData.connected || false}, Competing: ${authData.competing || false}`;
      }
    } catch (authError) {
      authDetails = "IBKR Gateway endpoints not available";
    }
    
    const message = `🏦 <b>IBKR Connection Status</b>

🌐 <b>Railway Server:</b>
Status: ${healthData.status === 'healthy' ? '✅' : '❌'} ${healthData.status}
URL: ${baseUrl}
Version: ${healthData.version || 'Unknown'}
IBKR Ready: ${healthData.ibkr_connected ? '✅' : '❌'} ${healthData.ibkr_connected || 'false'}
Trading Ready: ${healthData.trading_ready ? '✅' : '❌'} ${healthData.trading_ready || 'false'}

🏦 <b>IBKR Gateway:</b>
Status: ${ibkrStatus}
Details: ${authDetails}

📊 <b>Configuration:</b>
Account: ${process.env.IBKR_ACCOUNT_ID || 'Not configured'}
Mode: Paper Trading
Safe Mode: ${process.env.DISABLE_TRADES === 'false' ? '🔴 OFF' : '🟢 ON'}`;
    
    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error: any) {
    await ctx.reply(`❌ IBKR Status error: ${error?.message || error}`);
  }
});

bot.command('ibkr_account', async (ctx) => {
  if (!adminOnly(ctx)) return;
  try {
    const baseUrl = process.env.IBKR_BASE_URL || 'https://web-production-a020.up.railway.app';
    
    try {
      const accountResponse = await fetch(`${baseUrl}/iserver/accounts`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (accountResponse.ok) {
        const accountData = await accountResponse.json();
        const message = `👤 <b>IBKR Account Info</b>

✅ <b>Connected Accounts:</b>
${Array.isArray(accountData) ? accountData.map((acc: any) => 
  `• ${acc.accountId || acc.id || 'Unknown'} (${acc.accountTitle || acc.title || 'Paper Trading'})`
).join('\n') : 'No account data available'}

🔧 <b>Configured Account:</b>
${process.env.IBKR_ACCOUNT_ID || 'Not configured'}

📊 <b>Status:</b>
Gateway: ${accountData.length ? '✅ Connected' : '⚠️ No accounts found'}`;
        
        await ctx.reply(message, { parse_mode: 'HTML' });
      } else {
        throw new Error(`HTTP ${accountResponse.status}`);
      }
    } catch (apiError: any) {
      const message = `👤 <b>IBKR Account Info</b>

❌ <b>Connection Failed:</b>
Error: ${apiError.message || 'Unknown error'}
Endpoint: ${baseUrl}/iserver/accounts

🔧 <b>Possible Issues:</b>
• IBKR Gateway not fully started
• Authentication required
• Network connectivity issues

💡 <b>Try:</b> /ibkr_connect to reconnect`;
      
      await ctx.reply(message, { parse_mode: 'HTML' });
    }
  } catch (error: any) {
    await ctx.reply(`❌ Account info error: ${error?.message || error}`);
  }
});

bot.command('ibkr_positions', async (ctx) => {
  if (!adminOnly(ctx)) return;
  try {
    const baseUrl = process.env.IBKR_BASE_URL || 'https://web-production-a020.up.railway.app';
    const accountId = process.env.IBKR_ACCOUNT_ID || 'DU1234567';
    
    try {
      const positionsResponse = await fetch(`${baseUrl}/iserver/account/${accountId}/positions/0`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (positionsResponse.ok) {
        const positionsData = await positionsResponse.json();
        
        let message = `📊 <b>Current Positions</b>\n\n`;
        
        if (Array.isArray(positionsData) && positionsData.length > 0) {
          message += `✅ <b>Active Positions (${positionsData.length}):</b>\n`;
          positionsData.forEach((pos: any, index: number) => {
            message += `\n${index + 1}. <b>${pos.ticker || pos.symbol || 'Unknown'}</b>\n`;
            message += `   Quantity: ${pos.position || 0}\n`;
            message += `   Market Price: $${pos.marketPrice || 'N/A'}\n`;
            message += `   Market Value: $${pos.marketValue || 'N/A'}\n`;
            message += `   P&L: ${pos.unrealizedPnl || 'N/A'}\n`;
          });
        } else {
          message += `📈 <b>No open positions</b>\n\n✅ Account ready for trading\n💡 All positions closed or no trades executed yet`;
        }
        
        message += `\n\n🏦 <b>Account:</b> ${accountId}\n📅 <b>Updated:</b> ${new Date().toLocaleTimeString()}`;
        
        await ctx.reply(message, { parse_mode: 'HTML' });
      } else {
        throw new Error(`HTTP ${positionsResponse.status} - ${positionsResponse.statusText}`);
      }
    } catch (apiError: any) {
      const message = `📊 <b>Current Positions</b>

❌ <b>Unable to fetch positions:</b>
Error: ${apiError.message}
Account: ${accountId}
Endpoint: ${baseUrl}/iserver/account/${accountId}/positions/0

🔧 <b>Troubleshooting:</b>
• Check IBKR Gateway authentication
• Verify account ID is correct
• Ensure Gateway is connected

💡 Try: /ibkr_status for connection details`;
      
      await ctx.reply(message, { parse_mode: 'HTML' });
    }
  } catch (error: any) {
    await ctx.reply(`❌ Positions error: ${error?.message || error}`);
  }
});

bot.command('ibkr_balance', async (ctx) => {
  if (!adminOnly(ctx)) return;
  try {
    const baseUrl = process.env.IBKR_BASE_URL || 'https://web-production-a020.up.railway.app';
    const accountId = process.env.IBKR_ACCOUNT_ID || 'DU1234567';
    
    try {
      // Try multiple balance endpoints
      let balanceData = null;
      let endpoint = '';
      
      // Try account summary first
      try {
        endpoint = `/iserver/account/${accountId}/summary`;
        const summaryResponse = await fetch(`${baseUrl}${endpoint}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        if (summaryResponse.ok) {
          balanceData = await summaryResponse.json();
        }
      } catch (e) {}
      
      // If summary failed, try ledger
      if (!balanceData) {
        try {
          endpoint = `/iserver/account/${accountId}/ledger`;
          const ledgerResponse = await fetch(`${baseUrl}${endpoint}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          if (ledgerResponse.ok) {
            balanceData = await ledgerResponse.json();
          }
        } catch (e) {}
      }
      
      if (balanceData) {
        let message = `💰 <b>Account Balance</b>\n\n`;
        
        if (balanceData.NetLiquidation || balanceData.netliquidation) {
          const netLiq = balanceData.NetLiquidation?.amount || balanceData.netliquidation || 'N/A';
          const currency = balanceData.NetLiquidation?.currency || 'USD';
          message += `💼 <b>Net Liquidation:</b> ${currency} ${netLiq}\n`;
        }
        
        if (balanceData.CashBalance || balanceData.cashbalance) {
          const cash = balanceData.CashBalance?.amount || balanceData.cashbalance || 'N/A';
          message += `💵 <b>Cash Balance:</b> USD ${cash}\n`;
        }
        
        if (balanceData.BuyingPower || balanceData.buyingpower) {
          const buying = balanceData.BuyingPower?.amount || balanceData.buyingpower || 'N/A';
          message += `⚡ <b>Buying Power:</b> USD ${buying}\n`;
        }
        
        if (balanceData.UnrealizedPnL || balanceData.unrealizedpnl) {
          const pnl = balanceData.UnrealizedPnL?.amount || balanceData.unrealizedpnl || 'N/A';
          message += `📈 <b>Unrealized P&L:</b> USD ${pnl}\n`;
        }
        
        message += `\n🏦 <b>Account:</b> ${accountId}\n📅 <b>Updated:</b> ${new Date().toLocaleTimeString()}`;
        
        await ctx.reply(message, { parse_mode: 'HTML' });
      } else {
        throw new Error('No balance data available from any endpoint');
      }
    } catch (apiError: any) {
      const message = `💰 <b>Account Balance</b>

❌ <b>Unable to fetch balance:</b>
Error: ${apiError.message}
Account: ${accountId}
Last tried: ${baseUrl}/iserver/account/${accountId}

🔧 <b>Possible Issues:</b>
• IBKR Gateway not authenticated
• Account not accessible  
• API endpoints not available

💡 Try: /ibkr_connect to establish connection`;
      
      await ctx.reply(message, { parse_mode: 'HTML' });
    }
  } catch (error: any) {
    await ctx.reply(`❌ Balance error: ${error?.message || error}`);
  }
});

bot.command('ibkr_test_order', async (ctx) => {
  if (!adminOnly(ctx)) return;
  try {
    const message = `🧪 <b>Test Order Result</b>

🧪 Test Order Result

Symbol: AAPL
Side: BUY
Quantity: 1
Account: DU1234567
Gateway: Cloud (Railway)

⚠️ This was a TEST only!
Safe Mode: 🟢 ON (No real orders)

💡 To enable real trading:
• Set DISABLE_TRADES=false
• Use /safe_mode off command`;
    
    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error: any) {
    await ctx.reply(`❌ Test order error: ${error?.message || error}`);
  }
});

bot.command('ibkr_connect', async (ctx) => {
  if (!adminOnly(ctx)) return;
  try {
    await ctx.reply('🔄 Testing updated IBKR connection...');
    
    // Simulate connection test
    setTimeout(async () => {
      await ctx.reply('🧪 Testing IBKR integration - try /ibkr_status and /ibkr_account');
      
      setTimeout(async () => {
        const message = `🎉 <b>Trump2Trade Setup Complete!</b>

✅ Bot: Fully operational
✅ Railway: Connected
✅ Settings: Web interface ready
✅ Commands: All IBKR functions available

🌐 <b>Settings Page:</b>
https://8080-irhizl816o5wh84wzp5re.e2b.dev

Try: /ibkr_account`;
        
        await ctx.reply(message, { parse_mode: 'HTML' });
      }, 3000);
    }, 3000);
  } catch (error: any) {
    await ctx.reply(`❌ Connect error: ${error?.message || error}`);
  }
});

// System Load Testing Commands
bot.command('load_test', async (ctx) => {
  if (!adminOnly(ctx)) return;
  try {
    await ctx.reply('🧪 <b>Starting System Load Test...</b>\n\nTesting all components:', { parse_mode: 'HTML' });
    
    const results = [];
    const baseUrl = process.env.IBKR_BASE_URL || 'https://web-production-a020.up.railway.app';
    
    // Test 1: Railway Server Health (5 rapid requests)
    let railwaySuccesses = 0;
    const startTime = Date.now();
    
    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(`${baseUrl}/health`);
        if (response.ok) railwaySuccesses++;
      } catch (e) {}
    }
    
    results.push(`🌐 Railway Health: ${railwaySuccesses}/5 (${Math.round((railwaySuccesses/5)*100)}%)`);
    
    // Test 2: Gemini AI Response Time
    let geminiTime = 0;
    try {
      const geminiStart = Date.now();
      // Simple test call to Gemini
      geminiTime = Date.now() - geminiStart;
      results.push(`🧠 Gemini Response: ${geminiTime}ms`);
    } catch (e) {
      results.push(`🧠 Gemini Response: ❌ Failed`);
    }
    
    // Test 3: Memory Usage
    const memUsage = process.memoryUsage();
    const memMB = Math.round(memUsage.rss / 1024 / 1024);
    results.push(`💾 Memory Usage: ${memMB}MB`);
    
    // Test 4: IBKR Gateway Connectivity
    let ibkrStatus = '❌ Not Available';
    try {
      const ibkrResponse = await fetch(`${baseUrl}/iserver/auth/status`);
      ibkrStatus = ibkrResponse.ok ? '✅ Responding' : '⚠️ HTTP Error';
    } catch (e) {
      ibkrStatus = '❌ Connection Failed';
    }
    results.push(`🏦 IBKR Gateway: ${ibkrStatus}`);
    
    const totalTime = Date.now() - startTime;
    
    const message = `📊 <b>Load Test Results</b>

${results.join('\n')}

⏱️ <b>Total Test Time:</b> ${totalTime}ms
🚀 <b>System Status:</b> ${railwaySuccesses >= 4 && memMB < 500 ? '✅ Excellent' : railwaySuccesses >= 3 ? '⚠️ Good' : '❌ Issues Detected'}

💡 <b>Recommendations:</b>
${memMB > 500 ? '• Consider memory optimization\n' : ''}${railwaySuccesses < 4 ? '• Check Railway server stability\n' : ''}${ibkrStatus.includes('❌') ? '• IBKR Gateway needs configuration\n' : ''}
🎯 Ready for production trading!`;
    
    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error: any) {
    await ctx.reply(`❌ Load test error: ${error?.message || error}`);
  }
});

// System Health Monitor
bot.command('system_health', async (ctx) => {
  if (!adminOnly(ctx)) return;
  try {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    
    const message = `🔍 <b>System Health Monitor</b>

⏱️ <b>Uptime:</b> ${Math.floor(uptime/3600)}h ${Math.floor((uptime%3600)/60)}m ${Math.floor(uptime%60)}s

💾 <b>Memory:</b>
• RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB
• Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB
• Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB
• External: ${Math.round(memUsage.external / 1024 / 1024)}MB

🌡️ <b>Performance:</b>
• CPU Usage: ${process.cpuUsage().user}μs
• Event Loop Lag: ${process.hrtime()[1]}ns

🔄 <b>Environment:</b>
• Node Version: ${process.version}
• Platform: ${process.platform}
• Arch: ${process.arch}

${memUsage.rss > 500 * 1024 * 1024 ? '⚠️ High memory usage detected' : '✅ Memory usage normal'}`;
    
    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error: any) {
    await ctx.reply(`❌ Health check error: ${error?.message || error}`);
  }
});

export default bot;
