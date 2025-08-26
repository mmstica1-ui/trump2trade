# 🦅 Trump2Trade

מערכת ניתוח אוטומטית של פוסטים של טראמפ והמרה להמלצות מסחר באופציות.

## 🚀 Quick Start

**קרא קודם:** [QUICK_START.md](./QUICK_START.md)

### תנאים מוקדמים:
1. [Telegram Bot](./SETUP_TELEGRAM.md) - בוט וchat ID
2. [Gemini API](./SETUP_GEMINI.md) - מפתח API מGoogle
3. **Scrape Creators API** - מפתח API לTruth Social (מקור נתונים ראשי)
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
- [🎯 **Scrape Creators API Setup**](./SETUP_SCRAPECREATORS.md) ⭐ **ראשי**
- [🕷️ Apify Actor Setup](./SETUP_APIFY.md) (גיבוי)
- [📈 IBKR Gateway Setup](./SETUP_IBKR.md) (אופציונלי)

## 🔒 בטיחות

המערכת מתחילה במצב בטוח:
- `DISABLE_TRADES=true` - אין מסחר אמיתי
- כל העסקאות במצב "Preview"
- נדרש IBKR Gateway נפרד למסחר אמיתי

## 📊 תכונות

- ✅ **API אמיתי לTruth Social** מ-Scrape Creators
- ✅ ניטור אוטומטי של פוסטים בזמן קצר (30 שניות)
- ✅ ניתוח עם Gemini AI
- ✅ המלצות טיקרים מסונכרנות
- ✅ ממשק Telegram עם כפתורי מסחר
- ✅ תמיכה במסחר אופציות דרך IBKR
- ✅ מצב בטוח עם preview
- ✅ מערכת גיבוי פולינג + Apify
- ✅ ניטור בריאות המערכת
- ✅ Deduplication אוטומטי

## 🔄 תהליך העבודה

### מקור ראשי - Scrape Creators API:
1. **Scrape Creators Polling** מביא פוסטים כל 30 שניות
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

# Scrape Creators API (ראשי)
SCRAPECREATORS_API_KEY=your-api-key    # מפתח Scrape Creators

# גיבוי
POLL_ENABLED=true           # גיבוי לApify  
APIFY_WEBHOOK_SECRET=moshe454   # חתימת webhook
GENSPARK_WEBHOOK_SECRET=moshe454 # webhook נוסף
```

---

**⚠️ הערה**: התחל במצב בטוח ובדוק שהכל עובד לפני שמפעיל מסחר אמיתי!