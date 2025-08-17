# Trump2Trade — Apify + Gemini + Telegram + IBKR (ready)

## TL;DR
- Railway: פרוס את השירות הזה, מלא משתנים לפי `.env.example` (כולל `APIFY_WEBHOOK_SECRET=moshe454`).
- Apify: צור Task/Actor שמחלץ את הפוסט האחרון מדף טראמפ ומגדיר Webhook:
  - URL: `https://<APP_URL>/webhook/apify`
  - Header: `x-apify-signature: moshe454`
  - Body JSON: `{"text":"{{text}}","url":"{{url}}","id":"{{id}}"}`
- המערכת תנתח בג'מיני ותשלח לטלגרם הודעה עם כפתורי מסחר.

## שלבים באפיפיי (UI)
1) התחבר ל-Apify → **Actors** → **Create new**.
2) אם יש לך כבר Actor שמגרד את דף טראמפ — אפשר להשתמש בו. אחרת:
   - בחר Template `CheerioCrawler`.
   - פתח את `main.js` של ה-Actor והדבק את הקוד מהתיקייה `apify_actor_truth/main.js` (בקובץ הזה תמצא דוגמה מוכנה).
3) צור **Task** ל-Actor הזה (כפתור "Create Task").
4) ב-Task → לשונית **Webhooks** → **Add webhook**:
   - **Event type**: `SUCCEEDED` ו/או `PERSIST_STATE` (עדיף SUCCEEDED).
   - **URL**: `https://<APP_URL>/webhook/apify`
   - **Headers**: `x-apify-signature: moshe454`
   - **Payload template** (JSON):
     ```json
     {
       "text": "{{text}}",
       "url": "{{url}}",
       "id": "{{id}}"
     }
     ```
5) בלשונית **Schedule**: קבע ריצה תכופה (למשל כל 10-20 שניות) או "Run on change" אם יש לך מנגנון diff בקוד.
6) הפעל Task בלייב → אתה אמור לקבל הודעה בטלגרם מייד כשיש פוסט.

## גיבוי Poller (לא חובה)
השאר `POLL_ENABLED=true` כדי לגבות את Apify במקרה של כשל זמני. הפולר משתמש ב-ETag וחוסך תעבורה.

## מבחן ידני (ללא אפיפיי)
```
POST https://<APP_URL>/dev/mock
{ "text": "Trump cancels tariffs on chips", "url": "https://truth.social/mock" }
```
