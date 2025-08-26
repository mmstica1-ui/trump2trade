# 🦅 Trump2Trade

מערכת ניתוח אוטומטית של פוסטים של טראמפ והמרה להמלצות מסחר באופציות.

## 🚀 Quick Start

**קרא קודם:** [QUICK_START.md](./QUICK_START.md)

### תנאים מוקדמים:
1. [Telegram Bot](./SETUP_TELEGRAM.md) - בוט וchat ID
2. [Gemini API](./SETUP_GEMINI.md) - מפתח API מGoogle
3. **Synoptic API** - מפתח API לWebSocket (מקור נתונים ראשי)
4. [Apify Actor](./SETUP_APIFY.md) - גירוד Truth Social (גיבוי)

### הרצה מהירה:
```bash
# ערוך .env עם הפרטים שלך
cp .env.example .env
vim .env

# התקן ורץ
npm install
npm run build
npm install -g pm2
pm2 start ecosystem.config.js

# בדוק שעובד
curl http://localhost:8080/healthz
```

### בדיקת מערכת:
```bash
# שלח פוסט מזויף לבדיקה
curl -X POST http://localhost:8080/dev/mock \
  -H "Content-Type: application/json" \
  -d '{"text": "Trump announces new China tariffs", "url": "https://truth.social/test"}'
```

**אמור להגיע הודעה בטלגרם עם ניתוח וכפתורי מסחר!**

## 🛠️ מדריכי התקנה מפורטים:

- [📱 Telegram Setup](./SETUP_TELEGRAM.md)
- [🧠 Gemini API Setup](./SETUP_GEMINI.md)  
- [🌐 **Synoptic WebSocket Setup**](./SETUP_SYNOPTIC.md) ⭐ **ראשי**
- [🕷️ Apify Actor Setup](./SETUP_APIFY.md) (גיבוי)
- [📈 IBKR Gateway Setup](./SETUP_IBKR.md) (אופציונלי)

## 🔒 בטיחות

המערכת מתחילה במצב בטוח:
- `DISABLE_TRADES=true` - אין מסחר אמיתי
- כל העסקאות במצב "Preview"
- נדרש IBKR Gateway נפרד למסחר אמיתי

## 📊 תכונות

- ✅ **WebSocket בזמן אמת** מ-Synoptic API
- ✅ ניטור אוטומטי של פוסטים בTruth Social
- ✅ ניתוח עם Gemini AI
- ✅ המלצות טיקרים מסונכרנות
- ✅ ממשק Telegram עם כפתורי מסחר
- ✅ תמיכה במסחר אופציות דרך IBKR
- ✅ מצב בטוח עם preview
- ✅ מערכת גיבוי פולינג + Apify
- ✅ ניטור בריאות המערכת
- ✅ חיבור מחדש אוטומטי ל-WebSocket

## 🔄 תהליך העבודה

### מקור ראשי - Synoptic WebSocket:
1. **Synoptic WebSocket** מזרים פוסטים בזמן אמת
2. **Deduplication** מונע עיבוד כפול
3. **Gemini** מנתח הפוסט ומזהה השפעות שוק
4. **Telegram** שולח התרעה עם כפתורי מסחר
5. **IBKR** (אופציונלי) מבצע עסקאות אמיתיות

### גיבוי - Apify Webhook:
- **Apify Actor** גורד Truth Social כגיבוי
- **Webhook** שולח פוסטים חדשים לשירות שלנו

## 🐞 Debug

```bash
pm2 logs trump2trade
pm2 status
curl http://localhost:8080/healthz
```

## ⚙️ משתני סביבה חשובים

```bash
# בטיחות
DISABLE_TRADES=true          # מצב בטוח

# Synoptic WebSocket (ראשי)
SYNOPTIC_API_KEY=your-api-key    # מפתח Synoptic
SYNOPTIC_WS=wss://api.synoptic.com/v1/ws/on-stream-post

# גיבוי
POLL_ENABLED=true           # גיבוי לApify  
APIFY_WEBHOOK_SECRET=moshe454   # חתימת webhook
GENSPARK_WEBHOOK_SECRET=moshe454 # webhook נוסף
```

---

**⚠️ הערה**: התחל במצב בטוח ובדוק שהכל עובד לפני שמפעיל מסחר אמיתי!