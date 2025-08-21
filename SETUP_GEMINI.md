# הגדרת Gemini API לTrump2Trade

## צעדים:

### 1. קבלת API Key
1. לך ל: https://aistudio.google.com/
2. התחבר עם חשבון Google
3. לחץ "Get API Key"
4. צור API Key חדש
5. **העתק את המפתח**

### 2. עדכון קובץ .env
```bash
GOOGLE_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_MODEL=gemini-1.5-flash
```

### 3. בדיקה
הרץ בדיקה על endpoint המבחן:
```bash
curl -X POST http://localhost:8080/dev/mock \
  -H "Content-Type: application/json" \
  -d '{"text": "Trump announces new tariffs on China", "url": "https://truth.social/test"}'
```

אמור להגיע הודעה בטלגרם עם ניתוח הפוסט וכפתורי מסחר.