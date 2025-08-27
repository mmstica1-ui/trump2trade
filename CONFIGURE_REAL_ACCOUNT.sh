#!/bin/bash

# 🎯 סקריפט הגדרת חשבון IBKR אמיתי - DU7428350
# להרצה בשרת IBKR Gateway

echo "🚀 מתחיל הגדרה של חשבון IBKR אמיתי..."
echo "📊 Account ID: DU7428350"
echo "👤 Username: ilyuwc476"
echo "🔒 Trading Mode: PAPER"

# הגדרת משתני סביבה
export TWS_USERNAME="ilyuwc476"
export TWS_PASSWORD="trump123!"
export IBKR_ACCOUNT_ID="DU7428350"
export TRADING_MODE="paper"
export IBKR_GATEWAY_MODE="PAPER"

echo "✅ Environment variables configured"

# יצירת קובץ environment
cat > .env << EOF
TWS_USERNAME=ilyuwc476
TWS_PASSWORD=trump123!
IBKR_ACCOUNT_ID=DU7428350
TRADING_MODE=paper
IBKR_GATEWAY_MODE=PAPER
IBKR_BASE_URL=https://8080-ibu98pd4j6524ljwfdvht.e2b.dev
EOF

echo "📄 Created .env file"

# עצירה וחידוש של כל התהליכים
echo "🔄 Restarting all services..."

# עצירת תהליכים קיימים
if command -v pm2 &> /dev/null; then
    echo "🔄 Stopping PM2 processes..."
    pm2 delete all 2>/dev/null || true
    pm2 kill 2>/dev/null || true
fi

if command -v docker &> /dev/null; then
    echo "🐳 Stopping Docker containers..."
    docker stop $(docker ps -q --filter "name=ibkr") 2>/dev/null || true
    docker stop $(docker ps -q --filter "name=gateway") 2>/dev/null || true
    docker stop $(docker ps -q --filter "name=tws") 2>/dev/null || true
fi

# עצירת תהליכי Python
pkill -f "python.*ibkr" 2>/dev/null || true
pkill -f "python.*gateway" 2>/dev/null || true
pkill -f "python.*tws" 2>/dev/null || true

echo "⏱️  Waiting for services to stop..."
sleep 5

# הפעלה מחדש עם הפרמטרים החדשים
echo "🚀 Starting services with new configuration..."

# אם יש Docker
if command -v docker &> /dev/null && [ -f "docker-compose.yml" ]; then
    echo "🐳 Starting with Docker Compose..."
    docker-compose down 2>/dev/null || true
    docker-compose up -d
    
elif command -v docker &> /dev/null && [ -f "Dockerfile" ]; then
    echo "🐳 Starting with Docker..."
    docker build -t ibkr-gateway .
    docker run -d --name ibkr-gateway \
        -e TWS_USERNAME=ilyuwc476 \
        -e TWS_PASSWORD=trump123! \
        -e IBKR_ACCOUNT_ID=DU7428350 \
        -e TRADING_MODE=paper \
        -p 8080:8080 \
        ibkr-gateway

# אם יש PM2
elif command -v pm2 &> /dev/null && [ -f "ecosystem.config.js" ]; then
    echo "🔄 Starting with PM2..."
    pm2 start ecosystem.config.js

# אם יש Python
elif [ -f "main.py" ]; then
    echo "🐍 Starting Python gateway..."
    nohup python main.py > ibkr.log 2>&1 &
    
elif [ -f "app.py" ]; then
    echo "🐍 Starting Python app..."
    nohup python app.py > ibkr.log 2>&1 &

else
    echo "❌ No suitable startup method found!"
    echo "Please start your IBKR Gateway manually with these environment variables:"
    echo "TWS_USERNAME=ilyuwc476"
    echo "TWS_PASSWORD=trump123!"
    echo "IBKR_ACCOUNT_ID=DU7428350"
    echo "TRADING_MODE=paper"
fi

echo "⏱️  Waiting for services to start..."
sleep 10

# בדיקת החיבור
echo "🔍 Testing connection..."

# Test 1: Health check
echo "📡 1. Health check..."
curl -s "https://8080-ibu98pd4j6524ljwfdvht.e2b.dev/" && echo "" || echo "❌ Service not responding"

# Test 2: Auth status
echo "🔐 2. Auth status..."
AUTH_STATUS=$(curl -s "https://8080-ibu98pd4j6524ljwfdvht.e2b.dev/v1/api/iserver/auth/status")
echo "$AUTH_STATUS" | jq . 2>/dev/null || echo "$AUTH_STATUS"

# Test 3: Accounts
echo "👤 3. Checking accounts..."
ACCOUNTS=$(curl -s "https://8080-ibu98pd4j6524ljwfdvht.e2b.dev/v1/api/iserver/accounts")
echo "$ACCOUNTS" | jq . 2>/dev/null || echo "$ACCOUNTS"

# בדיקה אם החשבון הנכון מופיע
if echo "$ACCOUNTS" | grep -q "DU7428350"; then
    echo "✅ SUCCESS! החשבון האמיתי DU7428350 מחובר!"
    echo "🎯 כעת הבוט יוכל לגשת לנתונים האמיתיים שלך"
else
    echo "❌ עדיין מופיע החשבון הישן. נסה להפעיל מחדש:"
    echo "sudo systemctl restart your-ibkr-service"
    echo "או"
    echo "pm2 restart all"
fi

echo ""
echo "🏁 הגדרה הושלמה!"
echo "📞 כעת תוכל לבדוק בבוט Telegram עם הפקודה: /balance"