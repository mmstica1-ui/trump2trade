#!/bin/bash

# 🔧 סקריפט תיקון שרת IBKR לחשבון האמיתי
# הרץ את הפקודות האלה בשרת IBKR שלך

echo "🔧 מגדיר שרת IBKR לחשבון DU7428350..."

# הגדרת משתני סביבה
export TWS_USERNAME="ilyuwc476"
export TWS_PASSWORD="trump123!"  
export IBKR_ACCOUNT_ID="DU7428350"
export TRADING_MODE="paper"
export IBKR_GATEWAY_MODE="PAPER"

echo "✅ משתני סביבה הוגדרו"

# אם השרת רץ עם Docker:
if command -v docker &> /dev/null; then
    echo "🐳 מפעיל מחדש Docker containers..."
    docker restart $(docker ps -q --filter "name=ibkr")
fi

# אם השרת רץ עם PM2:
if command -v pm2 &> /dev/null; then
    echo "🔄 מפעיל מחדש PM2 processes..."
    pm2 restart all
fi

# אם השרת רץ כ-Python script:
if pgrep -f "python.*ibkr" &> /dev/null; then
    echo "🐍 מפעיל מחדש Python server..."
    pkill -f "python.*ibkr"
    nohup python main.py > ibkr.log 2>&1 &
fi

echo "🎯 בודק חיבור..."

# בדיקת חיבור
sleep 3
curl -X POST "https://8080-ibu98pd4j6524ljwfdvht.e2b.dev/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ilyuwc476", 
    "password": "trump123!",
    "trading_mode": "paper"
  }' && echo -e "\n✅ השרת מוגדר נכון!"