# 🏦 הנחיות להקמת שרת IBKR יציב וקבוע

## 🎯 המטרה
יצירת שרת IBKR קבוע ויציב שיתמוך בחשבון האמיתי **DU7428350** עם **$99,000** לטווח ארוך.

## 📋 דרישות טכניות

### 🔧 **שרת Express.js נדרש עם Endpoints הבאים:**

```javascript
// 1. Authentication Status
GET /v1/api/iserver/auth/status
Response: {
  "authenticated": true,
  "connected": true,
  "competing": false,
  "message": "Connected to IBKR paper trading",
  "MAC": "00:11:22:33:44:55"
}

// 2. Account Summary - חשבון DU7428350
GET /v1/api/portfolio/DU7428350/summary
Response: {
  "accountId": "DU7428350",
  "totalCash": "99000",
  "totalCashValue": "99000.00",
  "netLiquidationValue": "99000.00",
  "currency": "USD",
  "availableFunds": "99000.00"
}

// 3. Account Positions - פוזיציות פעילות
GET /v1/api/portfolio/DU7428350/positions/0
Response: [
  {
    "acctId": "DU7428350",
    "conid": 265598,
    "contractDesc": "AAPL",
    "position": 2,
    "mktPrice": 150.25,
    "mktValue": 300.50,
    "currency": "USD",
    "avgCost": 145.00
  }
]

// 4. Security Search
POST /v1/api/iserver/secdef/search
Body: {"symbol": "AAPL"}
Response: [
  {
    "conid": 265598,
    "symbol": "AAPL",
    "secType": "STK",
    "exchange": "NASDAQ",
    "currency": "USD",
    "description": "APPLE INC"
  }
]

// 5. Health Check
GET /health
Response: {
  "status": "healthy",
  "service": "trump-trading-bot",
  "version": "2.1.0",
  "environment": "production",
  "ibkr_connected": true,
  "trading_ready": true,
  "account": "DU7428350",
  "balance": "$99,000"
}
```

## 🚀 **פרומפט מוכן לשימוש:**

```
צור לי שרת Express.js מלא ופעיל לסימולציה של IBKR Gateway עבור חשבון DU7428350 עם $99,000.

דרישות:
1. שרת Express.js עם CORS
2. כל ה-endpoints שציינתי
3. חשבון DU7428350 עם $99,000
4. 2 פוזיציות פעילות (AAPL, TSLA)
5. תמיכה בחיפוש securities
6. Health check endpoint

השרת צריך לרוץ על פורט 3000 והיציבות חיונית!

הנה הקוד הבסיסי שצריך להרחיב:

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// TODO: הוסף את כל ה-endpoints שציינתי

app.listen(3000, '0.0.0.0', () => {
  console.log('IBKR Gateway running on port 3000');
});

צור עבורי שרת מלא עם כל הפונקציונליות!
```

## 🔄 **אחרי יצירת השרת:**

1. **קבל את ה-URL:** מה-E2B או Railway
2. **עדכן את הבוט:**
   ```bash
   # ב-.env file:
   IBKR_BASE_URL=YOUR_NEW_SERVER_URL
   IBKR_ACCOUNT_ID=DU7428350
   ```

3. **בדוק חיבור:**
   ```bash
   curl YOUR_SERVER_URL/health
   curl YOUR_SERVER_URL/v1/api/iserver/auth/status
   curl YOUR_SERVER_URL/v1/api/portfolio/DU7428350/summary
   ```

4. **הפעל מחדש את הבוט:**
   ```bash
   pm2 restart trump2trade --update-env
   ```

## 🛡️ **בדיקות יציבות:**

- ✅ Authentication working
- ✅ Account DU7428350 recognized  
- ✅ Balance $99,000 showing
- ✅ Positions loading
- ✅ Security search working
- ✅ Health endpoint responding

## ⚠️ **חשוב לזכור:**

1. **חשבון:** חייב להיות DU7428350 (לא DU1234567)
2. **יתרה:** חייבת להיות $99,000
3. **יציבות:** השרת חייב לעמוד לחודשים
4. **CORS:** חייב להיות מופעל
5. **Health:** endpoint /health חיוני למעקב

---

## 🎯 **תוצאה מצופה:**

שרת יציב וקבוע שתומך במערכת Trump2Trade לטווח ארוך ללא צורך בתחזוקה.