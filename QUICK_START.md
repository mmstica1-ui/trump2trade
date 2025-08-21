# 🚀 Quick Start - הרצה ראשונית

## תנאים מוקדמים:
1. ✅ Bot Telegram מוכן (ראה SETUP_TELEGRAM.md)  
2. ✅ Gemini API key מוכן (ראה SETUP_GEMINI.md)
3. ✅ Apify Actor מוכן (ראה SETUP_APIFY.md)

## סדר הפעולות:

### 1. עדכן קובץ .env
```bash
cp .env.example .env
# ערוך .env עם הנתונים האמיתיים שלך
```

### 2. בנה והרץ
```bash
npm install
npm run build
npm install -g pm2
pm2 start ecosystem.config.js
```

### 3. בדוק שהשירות רץ
```bash
pm2 status
curl http://localhost:8080/healthz
# אמור להחזיר: {"ok":true}
```

### 4. בדוק Telegram
אמור להגיע הודעה: "🚀 Trump2Trade is live. Use /help"

### 5. בדיקת Mock
```bash
curl -X POST http://localhost:8080/dev/mock \
  -H "Content-Type: application/json" \
  -d '{"text": "Trump cancels China tariffs", "url": "https://truth.social/test"}'
```

**אמור להגיע הודעה בטלגרם עם:**
- ניתוח הפוסט מGemini
- כפתורי Buy Call/Put לטיקרים רלוונטיים
- כפתור Preview (שלא יבצע מסחר)

### 6. בדוק לוגים
```bash
pm2 logs trump2trade --lines 50
```

## ✅ סימנים שהכל עובד:
- ✅ השירות עובד על פורט 8080
- ✅ הגיעה הודעת הפעלה בטלגרם  
- ✅ Mock endpoint מחזיר הודעה עם כפתורים
- ✅ לוגים נראים טוב ללא שגיאות

## ⚠️ בעיות נפוצות:
- **שגיאת Telegram**: בדוק BOT_TOKEN ו-CHAT_ID
- **שגיאת Gemini**: בדוק GOOGLE_API_KEY
- **לא מגיעות הודעות**: בדוק שהבוט לא חסום ושלחת לו /start

## 🔄 עדכונים:
```bash
git pull
npm run build
pm2 restart trump2trade
```