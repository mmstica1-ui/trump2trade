# Trump2Trade System - Complete Technical Documentation

## System Overview
Trump2Trade is a real-time market intelligence system that monitors Donald Trump's Truth Social posts via SYNOPTIC WebSocket API and provides instant Telegram alerts with AI-powered market impact analysis.

## Architecture Components

### 1. SYNOPTIC WebSocket Integration (`src/synoptic.ts`)
**Primary Data Source**: Real-time Trump post monitoring
- **Endpoint**: `wss://api.synoptic.com/v1/ws/on-stream-post?apiKey={SYNOPTIC_API_KEY}`
- **Stream ID**: `01JEYDKB3PH1WJ1BANH2V0H9HP` (Trump's Truth Social stream)
- **Keep-alive**: 15 seconds (optimized for fast detection)
- **Reconnection**: Exponential backoff with max 10 attempts
- **Deduplication**: 24-hour TTL memory to prevent duplicate alerts

#### Key Functions:
```typescript
startSynopticListener() // Initialize WebSocket connection
extractPostData(data) // Parse incoming Trump posts
isDuplicate(postId) // Prevent duplicate processing
```

### 2. Telegram Bot Integration (`src/tg.ts`)
**Alert Delivery System**: Instant notifications with trading options
- **Bot Name**: `trumpimpbot`
- **Framework**: Grammy (Telegram Bot API)
- **Chat Support**: Individual users AND group chats
- **Parse Mode**: HTML with rich formatting

#### Message Format Structure:
```
⚡ Trump Post → INSTANT Alert
🕓 Original Post: HH:MM:SS UTC
⏱️ Alert Time: HH:MM:SS UTC  
🔥 Total Delay: Xs from original post
📨 Delivery: Xs

📝 Original Trump Post:
"[Post content]"

🧠 Market Impact Analysis:
[AI-generated summary]

📊 Trading Opportunities: 🎯X/10

[Ticker buttons with Call/Put options]
```

#### Key Functions:
```typescript
sendTrumpAlert(args) // Main alert sender with timing analysis
sendText(text) // Simple text message sender
```

### 3. AI Analysis Engine (`src/llm.ts`)
**Market Intelligence**: Google Gemini AI for post analysis
- **Model**: `gemini-1.5-flash` (optimized for speed)
- **Timeout**: 8 seconds max processing
- **Fallback**: Smart text-based analysis if API fails
- **Output Format**: `{summary: string, tickers: string[]}`

#### Supported Tickers (Safe List):
```typescript
// Major ETFs and Stocks
SPY, QQQ, DIA, IWM, XLK, XLF, XLE, XLI, XLV
META, AAPL, GOOGL, NVDA, MSFT, TSLA
FXI, ASHR, MCHI // China/Trade exposure
TLT, HYG, USO, GLD // Bonds/Commodities
```

### 4. Process Management (`ecosystem.config.cjs`)
**Production Deployment**: PM2 daemon management
- **Script**: `start.js` (ES module wrapper for environment loading)
- **Mode**: Cluster (single instance, scalable)
- **Logs**: `logs/out-0.log`, `logs/err-0.log`
- **Auto-restart**: Yes, on crashes
- **Memory**: ~70MB typical usage

## Environment Variables (.env)

### Required API Keys:
```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=7597128133:AAGtGl22gep4b3tfokrEPVOPgOcmdjSTLes
TELEGRAM_CHAT_ID=540751833  # Can be user ID or group chat ID

# Google Gemini AI
GOOGLE_API_KEY=AIzaSyA0oLF9UXHpRBPF4j3dR1ePd_NI55NWMmk
GEMINI_MODEL=gemini-1.5-flash

# SYNOPTIC WebSocket API  
SYNOPTIC_API_KEY=1f082681-21a2-6b80-bf48-2c16d80faa8e

# Application Settings
PORT=8080
NODE_ENV=development|production
DISABLE_TRADES=true  # Safety first
```

### Optional Settings:
```bash
# Legacy polling (disabled when SYNOPTIC active)
POLL_ENABLED=false
TRUTH_PROFILE_URL=https://truthsocial.com/@realDonaldTrump

# Webhook secrets (legacy APIFY support)  
APIFY_WEBHOOK_SECRET=moshe454
GENSPARK_WEBHOOK_SECRET=moshe454
```

## Data Flow Architecture

```
Trump Posts Truth Social
        ↓
SYNOPTIC WebSocket API (Stream: 01JEYDKB3PH1WJ1BANH2V0H9HP)
        ↓
Trump2Trade WebSocket Client (src/synoptic.ts)
        ↓
Deduplication Check (24h TTL)
        ↓
Google Gemini AI Analysis (src/llm.ts)
        ↓ 
Telegram Alert Generation (src/tg.ts)
        ↓
User/Group Chat Notification
```

## Performance Metrics

### Timing Targets:
- **Discovery Delay**: <5 seconds (SYNOPTIC WebSocket)
- **AI Analysis**: <8 seconds (with timeout)
- **Total Alert Delay**: <15 seconds from original post
- **Keep-alive Frequency**: Every 15 seconds

### Memory Usage:
- **Base Application**: ~70MB
- **Deduplication Cache**: <1MB (24h TTL)
- **WebSocket Buffer**: <1MB

## API Endpoints

### Health & Monitoring:
```
GET /health          # Detailed system health
GET /healthz         # Simple Railway compatibility
POST /dev/mock       # Development testing endpoint
```

### Webhook Support (Legacy):
```
POST /webhook/apify     # Legacy APIFY integration (disabled)
POST /webhook/genspark  # Legacy webhook support
```

## Telegram Commands

### User Commands:
```
/help        # Show available commands
/ping        # Simple connectivity test
/status      # System status overview
/health      # Detailed health report
/daily       # Trigger daily analytics report
/analytics   # Show analytics for date
```

### Admin Commands:
```
/monitor     # Show recent errors
/safe_mode   # Toggle trading safety
/system      # Enable/disable system
/check       # Run full system diagnostics
```

## Error Handling & Recovery

### WebSocket Connection:
- **Auto-reconnect**: Exponential backoff (1s → 512s)
- **Max attempts**: 10 before giving up
- **Health monitoring**: Connection status tracked
- **Fallback**: None (SYNOPTIC is primary source)

### AI Analysis:
- **Timeout protection**: 8-second limit
- **Fallback analysis**: Text-based ticker extraction
- **Error recovery**: Continue with basic analysis

### Telegram Delivery:
- **Retry logic**: Built into Grammy framework
- **Error logging**: Full error capture
- **Non-blocking**: Fire-and-forget delivery

## Security Considerations

### API Key Management:
- **Environment variables**: Never hardcoded
- **Railway deployment**: Secure environment storage
- **Local development**: `.env` file (gitignored)

### Webhook Security:
- **Secret validation**: HMAC signature verification
- **Rate limiting**: Built into Express.js
- **Input sanitization**: JSON parsing with limits

### Telegram Bot:
- **Admin verification**: Chat ID validation
- **Command restrictions**: Admin-only sensitive commands
- **Token protection**: Environment variable storage

## Deployment Configuration

### Railway Platform:
```bash
# Build Command
npm run build

# Start Command  
node start.js

# Environment Variables
[All .env variables must be set in Railway dashboard]
```

### PM2 Local Development:
```bash
# Start daemon
pm2 start ecosystem.config.cjs

# Monitor
pm2 status
pm2 logs trump2trade --nostream
```

## Integration Points

### SYNOPTIC API Integration:
- **WebSocket URL**: `wss://api.synoptic.com/v1/ws/on-stream-post`
- **Authentication**: API key as query parameter
- **Stream Filter**: Trump's Truth Social posts only
- **Message Format**: `{event: 'stream.post.created', data: {...}}`

### Google Gemini AI:
- **Model**: `gemini-1.5-flash` for speed optimization
- **Input**: Raw post text (max 200 chars for speed)
- **Output**: JSON with summary and ticker array
- **Fallback**: Text pattern matching for policy keywords

### Telegram Bot API:
- **Framework**: Grammy for modern async/await support
- **Rich formatting**: HTML parse mode with inline keyboards
- **Group support**: Works with both individual and group chats
- **Media support**: Link previews, inline buttons

## Monitoring & Analytics

### System Health Metrics:
- **Connection status**: SYNOPTIC, Telegram, Gemini AI
- **Processing times**: Discovery, analysis, delivery delays
- **Error tracking**: Recent errors with timestamps
- **Memory usage**: Real-time memory consumption

### Daily Analytics:
- **Post counting**: Total posts processed
- **Average delays**: Processing time analysis  
- **Ticker frequency**: Most impacted markets
- **Relevance scoring**: AI confidence levels

## Troubleshooting Guide

### Common Issues:

1. **WebSocket Disconnections**:
   ```bash
   # Check logs
   pm2 logs trump2trade --nostream
   # Look for "WebSocket connection closed" messages
   # System auto-reconnects with exponential backoff
   ```

2. **Missing Telegram Alerts**:
   ```bash
   # Verify bot token and chat ID
   curl -X GET "https://api.telegram.org/bot${TOKEN}/getMe"
   # Check bot permissions in target chat
   ```

3. **AI Analysis Failures**:
   ```bash
   # Check Google API key validity
   # System falls back to text-based analysis
   # Monitor /health endpoint for Gemini status
   ```

4. **Environment Variable Issues**:
   ```bash
   # Verify .env file loading
   node -e "console.log(process.env.SYNOPTIC_API_KEY)"
   # Check PM2 environment loading
   pm2 show trump2trade
   ```

## Development Notes

### Code Structure:
- **TypeScript**: Full type safety with ES modules
- **Modular design**: Each service in separate file
- **Error boundaries**: Comprehensive try/catch blocks
- **Logging**: Structured JSON logging with pino

### Testing:
```bash
# Mock post injection for testing
curl -X POST http://localhost:8080/dev/mock \
  -H "Content-Type: application/json" \
  -d '{"text":"TEST: Federal Reserve destroying economy"}'
```

### Git Workflow:
- **Branch**: `main` for production code
- **Commits**: Descriptive commit messages required
- **Documentation**: Update this file for any major changes

## Performance Optimizations

### Speed Enhancements:
1. **AI Analysis**: Limited to 200 chars input, 8s timeout
2. **WebSocket**: 15s keep-alive for fast detection  
3. **Deduplication**: In-memory cache with TTL cleanup
4. **Telegram**: Fire-and-forget delivery pattern
5. **Ticker Analysis**: Pre-computed policy mappings

### Memory Optimizations:
1. **Limited ticker set**: Only liquid, tradeable symbols
2. **TTL cleanup**: Automatic memory management
3. **Stream processing**: No persistent storage requirements

This documentation should be kept updated as the system evolves. Last updated: August 2025.