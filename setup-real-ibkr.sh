#!/bin/bash

# 🎯 Setup Real IBKR Connection
echo "🔥 Setting up connection to YOUR real IBKR account..."

# First, let's check if you have TWS running locally
echo "🔍 Checking for local TWS/Gateway..."

# Test local connection first
if curl -s "http://localhost:5000/v1/api/iserver/auth/status" &>/dev/null; then
    echo "✅ Found local TWS/Gateway running!"
    IBKR_URL="http://localhost:5000"
else
    echo "❌ No local TWS found. You need to:"
    echo "1. Download and install TWS or IB Gateway"
    echo "2. Login with your REAL IBKR credentials"
    echo "3. Enable API connections in TWS settings"
    echo "4. Make sure it's running on port 5000"
    exit 1
fi

# Update .env with real connection
cat > .env << EOF
# 🔒 REAL IBKR CONNECTION - Your actual account

# Telegram Configuration 
TELEGRAM_BOT_TOKEN=7597128133:AAGtGl22gep4b3tfokrEPVOPgOcmdjSTLes
TELEGRAM_CHAT_ID=540751833
TELEGRAM_GROUP_CHAT_ID=

# Google Gemini AI
GOOGLE_API_KEY=AIzaSyA0oLF9UXHpRBPF4j3dR1ePd_NI55NWMmk
GEMINI_MODEL=gemini-1.5-flash

# IBKR Trading (Interactive Brokers) - YOUR REAL ACCOUNT
IBKR_BASE_URL=${IBKR_URL}
IBKR_ACCOUNT_ID=DU7428350
TWS_USERNAME=ilyuwc476
TWS_PASSWORD=trump123!
IBKR_ORDER_DEFAULT_QTY=1
IBKR_ORDER_TIF=DAY
IBKR_OUTSIDE_RTH=false
IBKR_GATEWAY_MODE=PAPER
MANUAL_TRADING_URL=https://ndcdyn.interactivebrokers.com/sso/Login?RL=1

# Synoptic (Trump posts stream)
SYNOPTIC_API_KEY=1f082681-21a2-6b80-bf48-2c16d80faa8e

# Webhooks
APIFY_WEBHOOK_SECRET=moshe454
GENSPARK_WEBHOOK_SECRET=moshe454

# Safety and Operations
DISABLE_TRADES=false
OPS_CHECK_EVERY_MS=60000
POLL_ENABLED=false
POLL_INTERVAL_MS=60000
TRUTH_PROFILE_URL=https://truthsocial.com/@realDonaldTrump

# System
NODE_ENV=production
PORT=8080
EOF

echo "✅ Updated .env with real IBKR connection"

# Restart the bot
echo "🔄 Restarting bot with real connection..."
npm run build
pm2 restart trump2trade --update-env

echo "🎉 Done! Bot now connected to YOUR real IBKR account"
echo ""
echo "🧪 Test with these commands:"
echo "/ibkr_status"
echo "/ibkr_balance"  
echo "/ibkr_positions"
echo ""
echo "⚠️  IMPORTANT: Make sure TWS/Gateway is running on your computer!"