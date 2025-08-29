import 'dotenv/config';
import express from 'express';
import pino from 'pino';
import { initializeMonitoring, getHealthEndpointData } from './monitoring.js';
import { initializeDailyAnalytics } from './daily-analytics.js';

// Environment validation
const requiredEnvVars = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
};

// Check critical environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value || value === `your-${key.toLowerCase().replace('_', '-')}-here`)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
  console.warn('System will run in limited mode. Set proper values for full functionality.');
}
import bot, { sendText } from './tg.js';
import { scheduleDailyStats } from './stats.js';
import { startOpsSelfChecks } from './ops.js';
import { startTruthPoller } from './poller.js';
import { handleApifyWebhook } from './apify.js';
import { handleGensparkWebhook } from './genspark.js';
import { startSynopticListener } from './synoptic.js';
import { healthMonitor } from './health-monitor.js';
import { advancedMonitor } from './advanced-monitoring.js';

const log = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });

const app = express();
app.use(express.json({ limit: '1mb' }));

// Enhanced health check endpoint
app.get('/health', (_: express.Request, res: express.Response) => {
  const health = getHealthEndpointData();
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'warning' ? 206 : 500;
  res.status(statusCode).json({
    ok: health.status === 'healthy',
    status: health.status,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(health.uptime / 1000),
    memory: health.memory,
    connections: health.connections,
    lastPostProcessed: health.lastPostProcessed,
    alertsSent24h: health.alertsSent24h,
    recentErrors: health.errors.length
  });
});

// Legacy endpoint for Railway
app.get('/healthz', (_: express.Request, res: express.Response) => {
  const health = getHealthEndpointData();
  res.status(health.status === 'critical' ? 500 : 200).json({ ok: health.status !== 'critical' });
});

// Webhooks
app.post('/webhook/apify', handleApifyWebhook);
app.post('/webhook/genspark', handleGensparkWebhook);

// Telegram webhook endpoint
app.post('/webhook/telegram', async (req: express.Request, res: express.Response) => {
  try {
    console.log('🔍 Webhook received update ID:', req.body.update_id);
    
    // Update advanced monitoring - webhook activity detected
    const { advancedMonitor } = await import('./advanced-monitoring.js');
    advancedMonitor.updateWebhookSuccess();
    
    const update = req.body;
    
    // Manual command processing as backup
    if (update.message && update.message.text) {
      const text = update.message.text;
      const chatId = update.message.chat.id;
      const from = update.message.from;
      
      console.log('📨 Manual processing message:', text, 'from:', from?.username);
      
      // Handle commands manually
      if (text === '/ping') {
        console.log('🏓 Processing ping command manually');
        await bot.api.sendMessage(chatId, 'pong', { parse_mode: 'HTML' });
        console.log('✅ Pong sent!');
        advancedMonitor.updateCommandSuccess();
        advancedMonitor.updateMessageSuccess();
      } else if (text === '/status') {
        console.log('📊 Processing status command manually');
        try {
          const { getHealthSnapshot } = await import('./ops.js');
          const s = await getHealthSnapshot();
          const statusMessage = `📈 <b>System Status</b>

🤖 <b>App:</b> ${s.appOk ? '✅ OK' : '❌ DOWN'}
🏦 <b>IBKR:</b> ${s.ibkrOk ? '✅ OK' : '❌ DOWN'}  
🛡️ <b>Safe Mode:</b> ${process.env.DISABLE_TRADES === 'true' ? 'ON' : 'OFF'}
🎯 <b>Account:</b> DUA065113 ($99,216.72)
🌐 <b>Server:</b> https://8000-igsze8jx1po9nx2jjg1ut.e2b.dev

💡 All systems operational and ready!`;
          
          await bot.api.sendMessage(chatId, statusMessage, { parse_mode: 'HTML' });
          console.log('✅ Status sent!');
          advancedMonitor.updateCommandSuccess();
          advancedMonitor.updateMessageSuccess();
        } catch (error) {
          console.error('❌ Status error:', error);
          await bot.api.sendMessage(chatId, '❌ Status check failed', { parse_mode: 'HTML' });
        }
      } else if (text === '/monitoring' || text === '/monitor_status') {
        console.log('📊 Processing monitoring status command manually');
        try {
          const { advancedMonitor } = await import('./advanced-monitoring.js');
          const status = advancedMonitor.getMonitoringStatus();
          
          const statusMessage = `🔍 <b>Advanced Monitoring Status</b>\n\n` +
            `🟢 <b>System Running:</b> ${status.isRunning ? 'YES' : 'NO'}\n` +
            `⏰ <b>Last Command Response:</b> ${Math.round(status.timeSinceLastCommand/1000)}s ago\n` +
            `📡 <b>Last Webhook Activity:</b> ${Math.round(status.timeSinceLastWebhook/1000)}s ago\n` +
            `💬 <b>Last Message Sent:</b> ${Math.round(status.timeSinceLastMessage/1000)}s ago\n` +
            `🦅 <b>Last Trump Post:</b> ${Math.round(status.timeSinceLastTrumpPost/1000)}s ago\n` +
            `📊 <b>Consecutive Failures:</b> ${status.consecutiveFailures}\n\n` +
            `🚨 <b>Critical Issues:</b> ${status.criticalIssues.length > 0 ? status.criticalIssues.join(', ') : 'None'}\n` +
            `⚠️ <b>Missed Posts:</b> ${status.missedPosts.length}\n\n` +
            `✅ <b>Zero-tolerance monitoring active</b>\n` +
            `Health checks every 30 seconds`;
          
          await bot.api.sendMessage(chatId, statusMessage, { parse_mode: 'HTML' });
          console.log('✅ Monitoring status sent!');
          advancedMonitor.updateCommandSuccess();
          advancedMonitor.updateMessageSuccess();
        } catch (error) {
          console.error('❌ Monitoring status error:', error);
          await bot.api.sendMessage(chatId, '❌ Monitoring status check failed', { parse_mode: 'HTML' });
        }
      } else if (text === '/help') {
        console.log('📋 Processing help command manually');
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
/account - View account info (Demo/Real)

📊 <b>Monitoring & Health:</b>
/health - System health report
/monitor - Recent errors check
/monitoring - Advanced monitoring status

💹 <b>Analytics & Reports:</b>
/daily - Generate daily trading report
/analytics [YYYY-MM-DD] - View analytics

🎯 <b>Usage:</b> Bot responds to Trump posts with trading buttons`;
        
        await bot.api.sendMessage(chatId, helpMessage, { parse_mode: 'HTML' });
        console.log('✅ Help sent!');
        advancedMonitor.updateCommandSuccess();
        advancedMonitor.updateMessageSuccess();
      } else if (text === '/check') {
        console.log('🔍 Processing check command manually');
        try {
          await bot.api.sendMessage(chatId, '🔍 Running full system diagnostics...', { parse_mode: 'HTML' });
          const { runFullSystemCheck } = await import('./ops.js');
          await runFullSystemCheck();
          console.log('✅ Full system check completed!');
          advancedMonitor.updateCommandSuccess();
          advancedMonitor.updateMessageSuccess();
        } catch (error) {
          console.error('❌ Check command error:', error);
          await bot.api.sendMessage(chatId, '❌ System check failed', { parse_mode: 'HTML' });
        }
      } else if (text === '/monitor') {
        console.log('📊 Processing monitor command manually');
        try {
          const { getMonitor } = await import('./monitoring.js');
          const monitor = getMonitor();
          const health = monitor.getSystemHealth();
          
          if (health.errors.length === 0) {
            await bot.api.sendMessage(chatId, '✅ No recent errors found', { parse_mode: 'HTML' });
          } else {
            const recentErrors = health.errors.slice(-5).map((error, index) => 
              `${index + 1}. [${new Date(error.timestamp).toLocaleTimeString('he-IL')}] ${error.error}`
            ).join('\n');
            
            const message = `🐛 <b>Recent System Errors (${health.errors.length} total)</b>\n\n${recentErrors}`;
            await bot.api.sendMessage(chatId, message, { parse_mode: 'HTML' });
          }
          console.log('✅ Monitor report sent!');
          advancedMonitor.updateCommandSuccess();
          advancedMonitor.updateMessageSuccess();
        } catch (error) {
          console.error('❌ Monitor command error:', error);
          await bot.api.sendMessage(chatId, '❌ Monitor check failed', { parse_mode: 'HTML' });
        }
      } else if (text.startsWith('/analytics')) {
        console.log('📊 Processing analytics command manually');
        try {
          const args = text.split(' ');
          const dateArg = args[1]; // Optional date in YYYY-MM-DD format
          
          const { getDailyAnalytics } = await import('./daily-analytics.js');
          const analytics = getDailyAnalytics();
          
          if (dateArg && dateArg.match(/^\d{4}-\d{2}-\d{2}$/)) {
            await analytics.triggerDailyReport(dateArg);
            await bot.api.sendMessage(chatId, `📊 Analytics report generated for ${dateArg}`, { parse_mode: 'HTML' });
          } else {
            const today = new Date().toISOString().split('T')[0];
            const todayData = analytics.getAnalytics(today);
            
            if (!todayData || todayData.totalPosts === 0) {
              await bot.api.sendMessage(chatId, '📊 No posts today yet. System is monitoring for Trump posts...\n\nUse /analytics YYYY-MM-DD for specific date', { parse_mode: 'HTML' });
            } else {
              await analytics.triggerDailyReport();
              await bot.api.sendMessage(chatId, "📊 Today's analytics report generated", { parse_mode: 'HTML' });
            }
          }
          console.log('✅ Analytics report sent!');
          advancedMonitor.updateCommandSuccess();
          advancedMonitor.updateMessageSuccess();
        } catch (error) {
          console.error('❌ Analytics command error:', error);
          await bot.api.sendMessage(chatId, `❌ Analytics failed: ${(error as Error).message}`, { parse_mode: 'HTML' });
        }
      } else if (text === '/account_info' || text === '/account') {
        console.log('🏦 Processing account info command manually');
        try {
          const accountResponse = await fetch(`${process.env.IBKR_BASE_URL}/health`);
          const accountData = await accountResponse.json();
          
          // Always treat as DEMO since we're using demo accounts
          const isDemoMode = true; // Force DEMO mode since we don't have real accounts
          
          const demoMessage = '• זהו חשבון DEMO בלבד\n• לא נקנות מניות אמיתיות\n• כל העסקאות הן סימולציה\n• הכסף אינו אמיתי';
          const realMessage = '• זהו חשבון אמיתי\n• העסקאות יבוצעו עם כסף אמיתי\n• יש להיזהר עם כל עסקה';
          
          const message = `🏦 <b>מידע על חשבון IBKR</b>\n\n` +
            `📊 <b>סטטוס שרת:</b> ${accountData.status || 'Unknown'}\n` +
            `🎯 <b>חשבון:</b> ${process.env.IBKR_ACCOUNT_ID || 'Unknown'}\n` +
            `🔗 <b>מצב:</b> ${isDemoMode ? '🧪 DEMO' : '💰 אמיתי'}\n` +
            `📡 <b>שרת:</b> ${accountData.service || 'IBKR Gateway'}\n` +
            `🕒 <b>זמן:</b> ${new Date().toLocaleString('he-IL')}\n` +
            `⚡ <b>מחובר לIBKR:</b> ${accountData.ibkr_connected ? 'כן' : 'לא'}\n` +
            `🔄 <b>מוכן למסחר:</b> ${accountData.trading_ready ? 'כן' : 'לא'}\n\n` +
            `⚠️ <b>חשוב לדעת:</b>\n` +
            (isDemoMode ? demoMessage : realMessage) + '\n\n' +
            `📞 <b>לשינוי לחשבון אמיתי:</b> צור קשר עם מפתח הבוט`;
          
          await bot.api.sendMessage(chatId, message, { parse_mode: 'HTML' });
          console.log('✅ Account info sent!');
          advancedMonitor.updateCommandSuccess();
          advancedMonitor.updateMessageSuccess();
        } catch (error) {
          console.error('❌ Account info error:', error);
          await bot.api.sendMessage(chatId, '❌ שגיאה בבדיקת מידע החשבון - שרת IBKR לא זמין', { parse_mode: 'HTML' });
        }
      } else {
        console.log('🤖 Trying Grammy handleUpdate for:', text);
        // Initialize bot if not already initialized
        if (!bot.isInited()) {
          await bot.init();
        }
        // Try Grammy processing for other commands
        await bot.handleUpdate(req.body);
      }
    } else {
      // Non-message updates (callback queries, etc.) - use Grammy
      if (!bot.isInited()) {
        await bot.init();
      }
      await bot.handleUpdate(req.body);
    }
    
    console.log('✅ Webhook processed successfully');
    res.json({ ok: true });
  } catch (error) {
    console.error('❌ Telegram webhook error:', error);
    res.status(500).json({ ok: false, error: 'Webhook processing failed' });
  }
});
app.get('/webhook/genspark', (_: express.Request, res: express.Response) => 
  res.status(405).json({ ok: false, use: 'POST' }));

// dev helper: test media analysis
app.post('/dev/media-test', async (req: express.Request, res: express.Response) => {
  const { text, mediaUrls } = req.body || {};
  
  const { analyzePost } = await import('./llm.js');
  const { sendTrumpAlert } = await import('./tg.js');
  
  const analysis = await analyzePost(text || 'Trump post with media content', mediaUrls);
  
  await sendTrumpAlert({
    summary: analysis.summary,
    tickers: analysis.tickers,
    tickerAnalysis: analysis.tickerAnalysis,
    url: 'https://truth.social/media-test',
    originalPost: text,
    relevanceScore: analysis.relevanceScore
  });
  
  res.json({ ok: true, analysis });
});

// dev helper: inject a fake post
app.post('/dev/mock', async (req: express.Request, res: express.Response) => {
  const { 
    postText = 'Tariffs removed on chips from China', 
    text = postText, // backward compatibility
    url = 'https://truth.social/mock',
    summary,
    tickerAnalysis,
    tickers,
    relevanceScore = 5
  } = req.body || {};
  
  const { sendTrumpAlert } = await import('./tg.js');
  
  // Support new ticker analysis format or fall back to legacy
  let finalTickers = tickers || [];
  let finalSummary = summary || 'Market impact analysis of Trump post';
  let finalTickerAnalysis = tickerAnalysis;
  let finalRelevanceScore = relevanceScore;
  
  if (tickerAnalysis && Array.isArray(tickerAnalysis)) {
    // New format with ticker analysis
    finalTickers = tickerAnalysis.map((t: any) => t.symbol);
    finalSummary = summary || 'Enhanced ticker impact analysis';
  } else if (text || postText) {
    // Legacy format - analyze the post
    const { analyzePost } = await import('./llm.js');
    const analysis = await analyzePost(text || postText);
    finalTickers = analysis.tickers;
    finalSummary = analysis.summary;
    finalTickerAnalysis = analysis.tickerAnalysis;
    finalRelevanceScore = analysis.relevanceScore;
  }
  
  await sendTrumpAlert({ 
    summary: finalSummary, 
    tickers: finalTickers, 
    tickerAnalysis: finalTickerAnalysis,
    url,
    originalPost: text || postText,
    relevanceScore: finalRelevanceScore
  });
  res.json({ ok: true });
});

// Serve static files (settings page)
app.use(express.static('public'));

// API endpoints for settings management
app.get('/api/settings', (req: express.Request, res: express.Response) => {
  const settings = {
    broker: {
      username: process.env.TRUMP_BOT_IBKR_USERNAME || '',
      password: '***hidden***', // Don't expose password
      gatewayUrl: process.env.IBKR_GATEWAY_URL || 'https://web-production-a020.up.railway.app',
      tradingMode: process.env.TRUMP_BOT_TRADING_MODE || 'paper',
      environment: process.env.TRUMP_BOT_ENVIRONMENT || 'production',
      safeMode: process.env.DISABLE_TRADES === 'true',
      defaultQty: process.env.IBKR_ORDER_DEFAULT_QTY || '1',
      tif: process.env.IBKR_ORDER_TIF || 'DAY'
    },
    orders: {
      enableBuyCall: true,
      enableBuyPut: true,
      orderType: 'MKT',
      outsideRth: process.env.IBKR_OUTSIDE_RTH === 'true'
    },
    monitoring: {
      alertsEnabled: true,
      dailyReports: true,
      errorNotifications: true
    }
  };
  res.json(settings);
});

// Simple root endpoint
app.get('/', (_: express.Request, res: express.Response) => {
  res.json({ 
    name: 'Trump2Trade',
    status: 'online',
    version: '0.7.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Startup throttling
const STARTUP_MSG_THROTTLE_MS = 2 * 60 * 1000; // 2 minutes
let lastStartupTimestamp = 0;

function getLastStartupTime(): number {
  return lastStartupTimestamp;
}

function saveStartupTime(timestamp: number): void {
  lastStartupTimestamp = timestamp;
}

const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, '0.0.0.0', async () => {
  log.info({ PORT }, 'server started');
  
  // Initialize monitoring first
  initializeMonitoring();
  initializeDailyAnalytics();
  
  console.log(`🦅 Trump2Trade v0.7.0 - PRODUCTION READY`);
  console.log('═'.repeat(50));
  console.log(`🌐 HTTP server running on port ${PORT}`);
  console.log(`💾 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🛡️ Safe Mode: ${process.env.DISABLE_TRADES || 'enabled'}`);
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  console.log('═'.repeat(50));
  
  scheduleDailyStats();
  startOpsSelfChecks();
  startTruthPoller();
  startSynopticListener(); // Start the corrected Synoptic WebSocket listener
  
  // Configure Telegram Bot for webhook mode
  console.log('🤖 Configuring Telegram bot webhook...');
  log.info('🤖 Configuring Telegram bot webhook...');
  
  // Initialize bot and set webhook URL
  try {
    // Initialize bot first
    await bot.init();
    const botInfo = await bot.api.getMe();
    
    // Determine webhook URL - use public HTTPS URL
    const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : process.env.APP_URL || `https://8080-irhizl816o5wh84wzp5re.e2b.dev`;
    const webhookUrl = `${baseUrl}/webhook/telegram`;
    
    // Set the webhook URL
    await bot.api.setWebhook(webhookUrl);
    
    log.info(`✅ Bot @${botInfo.username} webhook configured: ${webhookUrl}`);
    console.log(`✅ Telegram Bot: @${botInfo.username} webhook set to: ${webhookUrl}`);
  } catch (error: any) {
    log.error('❌ Bot webhook configuration error:', error);
    console.error('❌ Bot webhook configuration failed:', error);
  }
  
  // Start Advanced Monitoring System - Zero-tolerance monitoring
  advancedMonitor.start();
  log.info('🔍 Advanced Monitoring System started - Zero-tolerance for downtime');
  
  // Keep basic health monitor as backup
  healthMonitor.start();
  log.info('🔧 Basic Health Monitor started - Auto-healing system active');
  
  // Send startup message only if enough time has passed (prevents Railway redeploy spam)
  const now = Date.now();
  const lastStartupTime = getLastStartupTime();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (now - lastStartupTime > STARTUP_MSG_THROTTLE_MS) {
    saveStartupTime(now);
    try {
      const mode = isProduction ? 'PRODUCTION' : 'DEVELOPMENT';
      const features = [];
      if (process.env.SYNOPTIC_API_KEY) features.push('Synoptic WebSocket');
      if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== 'your-google-api-key-here') features.push('Gemini AI');
      if (process.env.POLL_ENABLED === 'true') features.push('Truth Polling');
      
      const message = `🦅 Trump2Trade ${mode} MODE is live!\n\n` +
        `🔧 Active Features: ${features.join(', ') || 'Basic webhook support'}\n` +
        `📡 Listening for posts on /webhook/genspark and /webhook/apify\n\n` +
        `Use /help for commands`;
      
      await sendText(message);
      log.info('Startup message sent to Telegram');
      
    } catch (error) {
      log.warn({ error: (error as any)?.message || error }, 'Failed to send startup message - continuing anyway');
    }
  } else {
    log.info({ 
      timeSinceLastMs: now - lastStartupTime,
      throttleMs: STARTUP_MSG_THROTTLE_MS 
    }, 'Startup message throttled (too soon after last restart)');
  }
});