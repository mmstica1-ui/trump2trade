# Trump2Trade — Gemini + Poller (Persist + Backoff)

## התקנה קצרה
1) העלה את הריפו ל-GitHub (או דרוס קיים).  
2) Railway → New Project (או חבר קיים) → הגדר Variables לפי `.env.example`.  
3) Deploy.  
4) בדיקה: גלוש ל-`/healthz` ונסה בטלגרם `/ping`, `/status`.

## בדיקת זרימה (ללא פוסט אמיתי)
```
POST /dev/mock
{ "text": "Trump cancels tariffs on chips", "url": "https://truth.social/mock" }
```
