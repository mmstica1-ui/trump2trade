#!/bin/bash

# 🎯 תיקון פשוט - הגדרת חשבון אמיתי DU7428350

echo "🔧 מגדיר את החשבון האמיתי שלך..."

# הגדרת משתני סביבה באופן קבוע
echo 'export TWS_USERNAME="ilyuwc476"' >> ~/.bashrc
echo 'export TWS_PASSWORD="trump123!"' >> ~/.bashrc  
echo 'export IBKR_ACCOUNT_ID="DU7428350"' >> ~/.bashrc
echo 'export TRADING_MODE="paper"' >> ~/.bashrc

# הגדרה מיידית
export TWS_USERNAME="ilyuwc476"
export TWS_PASSWORD="trump123!"
export IBKR_ACCOUNT_ID="DU7428350"
export TRADING_MODE="paper"

echo "✅ משתני סביבה הוגדרו"

# הפעלה מחדש של השירות
echo "🔄 מפעיל מחדש את השירותים..."

# עצירה
pm2 delete all 2>/dev/null || true
pkill -f python 2>/dev/null || true
docker stop $(docker ps -q) 2>/dev/null || true

sleep 3

# הפעלה מחדש
if [ -f "docker-compose.yml" ]; then
    docker-compose up -d
elif [ -f "main.py" ]; then
    nohup python main.py &
elif [ -f "app.py" ]; then  
    nohup python app.py &
fi

sleep 5

echo "🔍 בודק חיבור..."
curl -s "https://8080-ibu98pd4j6524ljwfdvht.e2b.dev/v1/api/iserver/accounts" | grep -q "DU7428350" && echo "✅ החשבון האמיתי מחובר!" || echo "❌ עדיין צריך תיקון"