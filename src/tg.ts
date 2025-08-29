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

// ALL COMMANDS PROCESSED VIA WEBHOOK ONLY - NO GRAMMY HANDLERS

// Only callback_query handler remains active for trading buttons
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
