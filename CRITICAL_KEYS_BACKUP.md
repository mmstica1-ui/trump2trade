# 🔒 CRITICAL CONFIGURATION BACKUP
## למקרה חירום - כל המפתחות והערכים החשובים

### 📱 Telegram Configuration
```bash
TELEGRAM_BOT_TOKEN=7597128133:AAGtGl22gep4b3tfokrEPVOPgOcmdjSTLes
TELEGRAM_CHAT_ID=540751833
TELEGRAM_GROUP_CHAT_ID=
```

### 🤖 Google AI (Gemini)  
```bash
GOOGLE_API_KEY=AIzaSyA0oLF9UXHpRBPF4j3dR1ePd_NI55NWMmk
GEMINI_MODEL=gemini-1.5-flash
```

### 🏦 IBKR Trading (Updated Server)
```bash
IBKR_BASE_URL=https://8080-ix8k1qaxvxn9fi89j5kbn.e2b.dev
IBKR_ACCOUNT_ID=DU1234567
IBKR_ORDER_DEFAULT_QTY=1
IBKR_ORDER_TIF=DAY
IBKR_OUTSIDE_RTH=false
IBKR_GATEWAY_MODE=REAL
DISABLE_TRADES=false
```

### 📊 Synoptic API (Trump Posts)
```bash
SYNOPTIC_API_KEY=1f082681-21a2-6b80-bf48-2c16d80faa8e
```

### 🔐 Webhook Secrets
```bash
APIFY_WEBHOOK_SECRET=moshe454
GENSPARK_WEBHOOK_SECRET=moshe454
```

### ✅ Working IBKR Endpoints
- `/health` - Server health check
- `/auth/login` - Authentication (demo_user/demo_password)
- `/config` - Server configuration
- `/trading/status` - IBKR connection status
- `/trading/positions` - Account positions
- `/trading/orders` - Order history

### 🚀 Authentication Flow
1. POST `/auth/login` with demo credentials (demo_user/demo_password)
2. Get `api_token` from response
3. Use `Authorization: Bearer {token}` header for all /trading/* endpoints

### 📝 Railway Variables (For Reference)
```bash
# These are the actual Railway TWS credentials (not used by current server)
TWS_USERNAME=ilyuwc476
TWS_PASSWORD=trump123!
```
**Note**: Current server uses demo credentials, not Railway TWS credentials

### 📋 Test Commands Work
- `/ibkr_status` ✅ - Shows server connection
- `/ibkr_account` ✅ - Shows trading capabilities  
- `/ibkr_positions` ✅ - Shows positions (empty for new account)
- `/ibkr_balance` ✅ - Shows trading status and capabilities

### 🎯 Critical Status
- **IBKR Server**: ✅ Operational (https://8080-ix8k1qaxvxn9fi89j5kbn.e2b.dev)
- **Authentication**: ✅ Working (demo_user/demo_password)  
- **Trading Ready**: ✅ True
- **Real Trading**: ✅ Enabled (DISABLE_TRADES=false)

### 📝 Last Updated
- Date: 2025-08-27
- Status: All systems operational
- Server: New IBKR gateway integrated successfully