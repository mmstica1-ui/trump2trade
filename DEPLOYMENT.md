# Trump2Trade Railway Deployment Guide

## 🚀 Quick Railway Deployment

### 1. Prerequisites
- Railway account (https://railway.app)
- API keys ready:
  - Telegram Bot Token & Chat ID
  - Google Gemini API Key  
  - Synoptic API Key (for Trump post monitoring)

### 2. Deploy to Railway

```bash
# Option A: One-click deploy (recommended)
# 1. Fork/clone this repository
# 2. Connect to Railway via GitHub integration
# 3. Set environment variables (see section 3)

# Option B: CLI deployment
railway login
railway init
railway up
```

### 3. Required Environment Variables

Set these in Railway Dashboard → Variables:

```
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-chat-id
GOOGLE_API_KEY=your-google-gemini-api-key
SYNOPTIC_API_KEY=your-synoptic-api-key
NODE_ENV=production
GENSPARK_WEBHOOK_SECRET=moshe454
APIFY_WEBHOOK_SECRET=moshe454
```

### 4. Webhook URLs (Post-Deployment)

After deployment, configure these webhook URLs:

```
GenSpark Webhook: https://your-app.railway.app/webhook/genspark?secret=moshe454
Apify Webhook: https://your-app.railway.app/webhook/apify
Synoptic: Uses WebSocket connection (automatic)
```

## 📊 System Architecture

### Data Sources (in priority order):
1. **Synoptic WebSocket** - Real-time Trump posts (primary)
2. **GenSpark Webhook** - Secondary monitoring  
3. **Apify Webhook** - Backup scraping
4. **Direct Polling** - Fallback (disabled by default)

### Processing Pipeline:
```
Trump Post → AI Analysis (Gemini) → Telegram Alert → Trading Options
```

## 🔧 Configuration Options

### Optional Environment Variables:
```
# Safety (recommended in production)
DISABLE_TRADES=true

# Manual trading platform integration
MANUAL_TRADING_URL=https://your-trading-platform.com

# Performance tuning
OPS_CHECK_EVERY_MS=60000
POLL_INTERVAL_MS=60000

# IBKR Trading (when ready)
IBKR_BASE_URL=https://localhost:5000/v1/api
IBKR_ACCOUNT_ID=your-account-id
```

## 🎯 Features Included

### ✅ Timing Analysis & Optimization
- Detailed processing time tracking
- Shows analysis time and delivery delays
- Performance monitoring and logging

### ✅ Enhanced Ticker Relevance  
- AI-powered policy-to-ticker mapping
- Relevance scoring (1-10) with visual indicators
- Focused selection (max 3 tickers per alert)

### ✅ Original Post Access
- Clickable URL button in Telegram
- Direct link in message text as backup
- Always accessible original content

### ✅ Advanced Alert System
- Original post content display
- Processing time breakdown
- Relevance score visualization
- Multiple trading options

## 🚨 Troubleshooting

### Common Issues:

1. **No alerts received**
   - Check Synoptic API key is valid
   - Verify webhook URLs are configured
   - Check Railway logs: `railway logs`

2. **Telegram errors**
   - Verify bot token is correct
   - Ensure chat ID is valid number/string
   - Check bot has message permissions

3. **AI analysis errors**
   - Verify Google Gemini API key
   - Check API quotas and limits
   - System falls back to mock analysis if key invalid

### Health Checks:
```
GET https://your-app.railway.app/healthz
POST /dev/mock (for testing)
Telegram: /status command
```

## 📈 Monitoring

### Built-in Commands:
- `/status` - System health check
- `/help` - Available commands  
- `/safe_mode on|off` - Toggle trading safety
- `/system on|off` - Enable/disable system
- `/check` - Full diagnostics

### Key Metrics Tracked:
- Processing times (discovery → analysis → delivery)
- Relevance scores for ticker selections
- Webhook success/failure rates
- Deduplication effectiveness

## 🔄 Updates & Maintenance

The system includes automatic health checks and reconnection logic:
- WebSocket auto-reconnect with exponential backoff
- Startup message throttling (prevents deployment spam)
- Memory-based deduplication with TTL cleanup
- Comprehensive error handling and logging

## 📞 Support

System logs all processing details including:
- Post discovery timestamps
- Analysis processing times  
- Telegram delivery confirmation
- Error details and recovery attempts

Check Railway logs for detailed troubleshooting information.