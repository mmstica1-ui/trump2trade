# 🏦 IBKR Gateway Setup Guide

## Option 1: Local Installation (Recommended)

### Step 1: Download IBKR Gateway
1. Go to https://www.interactivebrokers.com/en/trading/ib-api.php
2. Download "IB Gateway" (stable version)
3. Install on your computer

### Step 2: Configure for Paper Trading
1. Launch IB Gateway
2. Login with your Paper Trading credentials:
   - Username: Your IBKR paper username
   - Password: Your IBKR paper password
   - Trading Mode: "Paper Trading"
3. Enable API connections in configuration

### Step 3: Update Bot Configuration
```javascript
// In ecosystem.config.cjs, change:
IBKR_BASE_URL: 'http://localhost:5000',  // Your Gateway URL
IBKR_ACCOUNT_ID: 'DU1234567',  // Your actual Paper Trading account
IBKR_GATEWAY_MODE: 'REAL',  // Enable real API calls
```

## Option 2: Docker Container (Advanced)

### Step 1: Install Docker
```bash
# On your system (not sandbox):
docker pull gnzsnz/ib-gateway:latest
```

### Step 2: Run Container
```bash
docker run -d --name ib-gateway \
  -p 5000:4001 \
  -e TWS_USERNAME=your_paper_username \
  -e TWS_PASSWORD=your_paper_password \
  -e TRADING_MODE=paper \
  gnzsnz/ib-gateway:latest
```

### Step 3: Update Bot Configuration
Same as Option 1, but use your Docker host IP.

## Option 3: Cloud Deployment (Railway/Railway)

### Step 1: Deploy Gateway to Railway
1. Fork: https://github.com/gnzsnz/ib-gateway-docker
2. Deploy to Railway with environment variables:
   - TWS_USERNAME
   - TWS_PASSWORD
   - TRADING_MODE=paper

### Step 2: Update Bot
Use Railway URL as IBKR_BASE_URL

## Testing Your Setup

1. Check Gateway status:
```bash
curl http://localhost:5000/iserver/auth/status
```

2. Should return:
```json
{"authenticated": true, "competing": false, "connected": true}
```

## Paper Trading Account Setup

If you don't have a paper account:

1. Go to IBKR Account Management
2. Settings → Account Configuration
3. Enable "Paper Trading Account"
4. Note your Paper Trading username (usually starts with DU)

## Security Notes

- Use Paper Trading only for testing
- Never commit real credentials to code
- Use environment variables for sensitive data
- Monitor API usage and permissions

## Troubleshooting

### "Gateway not authenticated"
- Restart Gateway application
- Check username/password
- Verify Paper Trading mode is selected

### Connection refused
- Check if Gateway is running
- Verify port 5000 is accessible
- Check firewall settings

### API permission denied
- Enable API in Gateway settings
- Check API permissions in IBKR account
- Verify account has API access enabled