# 🔧 הגדרת שרת IBKR לחשבון האמיתי

## 📋 פקודות להרצה בשרת IBKR שלך

### שלב 1: הגדרת Environment Variables
```bash
# הכנס את הפקודות האלה בשרת IBKR שלך:

export TWS_USERNAME="ilyuwc476"
export TWS_PASSWORD="trump123!"
export IBKR_ACCOUNT_ID="DU7428350"
export TRADING_MODE="paper"
export IBKR_GATEWAY_MODE="PAPER"
```

### שלב 2: הפעלה מחדש של השירות
```bash
# הפעל את השרת מחדש עם המשתנים החדשים
# (התאם לפי איך השרת שלך מוגדר)

# אם זה Docker:
docker restart ibkr-server

# או אם זה PM2:
pm2 restart all

# או אם זה Python שירות:
pkill -f "python.*ibkr" && nohup python main.py &
```

### שלב 3: בדיקה
```bash
# בדוק שהשרת רץ עם המשתנים הנכונים:
curl -X POST "https://8080-ibu98pd4j6524ljwfdvht.e2b.dev/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ilyuwc476", 
    "password": "trump123!",
    "trading_mode": "paper"
  }'
```

## 🎯 תוצאה צפויה:
```json
{
  "success": true,
  "api_token": "eyJ0eXAiOiJKV1QiLCJ...",
  "trading_mode": "paper",
  "account_id": "DU7428350",
  "connection_status": "active"
}
```

## 📞 במידה ואין לך גישה לשרת:
אם השרת רץ על פלטפורמה חיצונית, תן לי לדעת איך הוא מוגדר ואכין לך הנחיות מותאמות.