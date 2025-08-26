# 🎯 Scrape Creators Truth Social API Setup

**מקור הנתונים הראשי** - API אמיתי לפוסטי טראמפ מ-Truth Social.

## 🎯 למה Scrape Creators?

- ✅ **API אמיתי לTruth Social** - בניגוד לSynoptic שהיה מזג אויר
- ✅ **אין בעיות 403** - API מקצועי עם proxies מתחלפים
- ✅ **JSON נקי** - אין צורך לפרסר HTML
- ✅ **אין rate limits** - שימוש כרצונך
- ✅ **Pay-as-you-go** - משלם רק על מה שמשתמש

## 🔧 התקנה

### 1. הירשם לScrape Creators

1. לך ל: `https://app.scrapecreators.com/`
2. הירשם לחשבון חדש
3. קבל 100 credits בחינם לניסיון
4. העתק את ה-API Key

### 2. הגדר משתני סביבה

```bash
# הוסף ל-.env
SCRAPECREATORS_API_KEY=your-scrape-creators-api-key-here
```

### 3. בדוק חיבור

```bash
# בנה והפעל
npm run build
npm start

# חפש בלוגים
pm2 logs trump2trade | grep -i scrape

# אמור לראות:
# "Starting Scrape Creators Truth Social poller"
# "Received posts from Scrape Creators API"
```

## 🔍 Debug

### בדיקת API:
```bash
# בדוק שה-API עובד (החלף YOUR_API_KEY)
curl -H "x-api-key: YOUR_API_KEY" \
  "https://api.scrapecreators.com/v1/truth-social/user/posts?username=realDonaldTrump&limit=1"
```

### הודעות שגיאה נפוצות:

| שגיאה | פתרון |
|-------|--------|
| "SCRAPECREATORS_API_KEY not provided" | בדוק שהגדרת את המשתנה בRailway |
| "401 Unauthorized" | בדוק שה-API key נכון |
| "403 Forbidden" | בדוק את יתרת הCredits |
| "No posts received" | זה תקין אם אין פוסטים חדשים |

## ⚙️ הגדרות

```bash
# בקובץ .env:
SCRAPECREATORS_API_KEY=your-key

# הגדרות polling (ב-src/scrapecreators.ts):
POLL_INTERVAL_MS=30000    # כל 30 שניות
DEDUP_TTL_MS=86400000    # deduplication למשך 24 שעות
```

## 💰 תמחור

- **1 API request = 1 credit**
- **חבילות זמינות:**
  - 100 credits חינם לניסיון
  - Pay-as-you-go packages משם
  - אין מינימום חודשי
  - אין rate limits

## 🔄 זרימת נתונים

```
Truth Social → Scrape Creators API → Trump2Trade → Gemini → Telegram
```

### דוגמת תגובה:
```json
{
  "posts": [
    {
      "id": "post_123",
      "content": "Tariffs on China will be removed!",
      "url": "https://truthsocial.com/@realDonaldTrump/posts/123",
      "created_at": "2024-01-01T12:00:00Z",
      "user": {
        "username": "realDonaldTrump"
      }
    }
  ]
}
```

## ⚠️ חשוב!

1. **Credits** - עקוב אחרי השימוש, כל poll = 1 credit
2. **Polling Interval** - 30 שניות מספיק למרבית המקרים
3. **Backup** - השאר גם Apify פעיל כגיבוי
4. **Monitoring** - עקוב אחרי הלוגים שהכל עובד

---

**🎯 Scrape Creators - הפתרון האמיתי לTruth Social API!**