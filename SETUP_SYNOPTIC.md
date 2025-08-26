# 🌐 Synoptic WebSocket API Setup

**מקור הנתונים הראשי** - WebSocket בזמן אמת לפוסטי טראמפ.

## 🎯 למה Synoptic?

- ✅ **זמן אמת** - WebSocket streaming ללא polling
- ✅ **אמין יותר** - עוקף את בעיות 403 של Apify
- ✅ **מהיר יותר** - תגובה מיידית לפוסטים חדשים
- ✅ **יציב** - reconnection אוטומטי עם exponential backoff

## 🔧 התקנה

### 1. השג API Key

1. הירשם ל-Synoptic API: `https://synoptic.com/api`
2. צור פרויקט חדש
3. הפעל גישה ל-Truth Social WebSocket
4. העתק את ה-API Key

### 2. הגדר משתני סביבה

```bash
# הוסף ל-.env
SYNOPTIC_API_KEY=your-synoptic-api-key-here
SYNOPTIC_WS=wss://api.synoptic.com/v1/ws/on-stream-post
```

### 3. בדוק חיבור

```bash
# הפעל את השרת
npm run build
npm start

# חפש בלוגים
pm2 logs trump2trade | grep -i synoptic

# אמור לראות:
# "Connected to Synoptic WebSocket"
# "Sent subscription message to Synoptic"
```

## 🔍 Debug

### בעיות חיבור:
```bash
# בדוק שה-API key נכון
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.synoptic.com/v1/status

# בדוק את הלוגים
pm2 logs trump2trade --nostream | grep -i synoptic
```

### הודעות שגיאה נפוצות:

| שגיאה | פתרון |
|-------|--------|
| "No secret key provided" | בדוק שהגדרת `SYNOPTIC_API_KEY` |
| "Connection closed 1005" | בדוק חיבור אינטרנט, הכל תקין אם יש reconnection |
| "Maximum reconnection attempts" | בדוק את ה-API key וה-WebSocket URL |

## ⚙️ הגדרות מתקדמות

```bash
# בקובץ .env ניתן להתאים:
SYNOPTIC_WS=wss://api.synoptic.com/v1/ws/on-stream-post  # WebSocket URL
SYNOPTIC_API_KEY=your-key                                # API Key

# הגדרות reconnection (ב-src/synoptic.ts):
MAX_RECONNECT_ATTEMPTS=10    # מספר ניסיונות חיבור מחדש
RECONNECT_DELAY_BASE=1000    # השהייה בסיסית (ms)
DEDUP_TTL_MS=86400000       # זמן deduplication (24 שעות)
```

## 🔄 זרימת נתונים

```
Truth Social → Synoptic API → WebSocket → Trump2Trade → Gemini → Telegram
```

### מבנה הודעה:
```json
{
  "type": "post",
  "data": {
    "text": "Tariffs on China will be removed!",
    "url": "https://truthsocial.com/@realDonaldTrump/posts/123",
    "id": "post_123",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

## 🚨 חשוב!

1. **API Limits** - בדוק את המגבלות של Synoptic
2. **Backup** - השאר גם Apify פעיל כגיבוי
3. **Monitoring** - עקוב אחרי הלוגים לוודא שהכל עובד
4. **Cost** - Synoptic עשוי להיות בתשלום, בדוק את המחירון

---

**🔥 Synoptic הוא המקור הראשי החדש - מהיר, אמין ובזמן אמת!**