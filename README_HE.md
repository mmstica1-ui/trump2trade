
# Trump2Trade — מדריך התקנה מהיר (ללא קוד)

מטרת המסמך: להרים את הבוט בלי לעבוד עם `npm`/פקודות. הכול דרך ממשקים גרפיים (GitHub, Railway, Apify, Telegram).

---

## מה צריך מראש
- חשבון **GitHub** (לאחסן את הקוד).
- חשבון **Railway** (לארח את השרת).
- חשבון **Apify** (מביא פוסטים מטראמפ).
- **בוט טלגרם** שהקמת דרך BotFather.
- ה־**Chat ID** שלך: `540751833` (מוכן).
- ה־**Bot Token** שלך (אל תפרסם בפומבי; תכניס רק ל-Railway).

> חשוב: נתחיל במצב **Preview בלבד** (ללא מסחר אמיתי), ואז נעבור ל־Paper ב-IBKR.

---

## שלב 1 — העלאת הקוד ל-GitHub
1. הורד את ה-ZIP שקיבלת: `trump2trade.zip` וחלץ.
2. היכנס ל-GitHub → למעלה **New → New repository**.
3. תן שם: `trump2trade` → Create repository.
4. גרור את כל הקבצים מהתיקייה שחילצת לחלון ה-GitHub (Upload files) → Commit changes.

> בסוף השלב יש לך ריפו עם הקבצים (כולל README ו־קוד).

---

## שלב 2 — פריסה ל-Railway (בלי פקודות)
1. היכנס ל-[railway.app](https://railway.app) והתחבר.
2. לחץ **New Project → Deploy from Repo** ובחר את הריפו `trump2trade` שלך.
3. אחרי החיבור, עבור ל–**Variables** והוסף את המשתנים הבאים (שם=ערך):

**חובה**
- `TELEGRAM_BOT_TOKEN` = ה-Token מבוטפאת'ר (הדבק בדיוק).
- `TELEGRAM_CHAT_ID` = `540751833`
- `OPENAI_API_KEY` = מפתח OpenAI (או ספק תואם OpenAI).
- `APIFY_WEBHOOK_SECRET` = מילה/מחרוזת סודית משלך, למשל `moshe-secret-123`

**מומלץ להתחלה (בטיחות):**
- `DISABLE_TRADES` = `true`  ← מונע שליחת הוראות ל-IBKR עד ההגדרה.

**לאחר מכן (IBKR, לשלב ה-Paper):**
- `IBKR_BASE_URL` = `https://<host>:5000/v1/api`  (מהשרת שבו רץ ה-Gateway)
- `IBKR_ACCOUNT_ID` = `UXXXXXXX` (מס' חשבון paper)
- `IBKR_ORDER_TIF` = `DAY`
- `IBKR_ORDER_DEFAULT_QTY` = `1`
- `IBKR_OUTSIDE_RTH` = `false`

4. עבור ל–**Deployments** והמתן שהאפליקציה תעלה. יופיע URL ציבורי, למשל:
   `https://your-app-name.up.railway.app`

5. בדיקה מהירה: פתח דפדפן לכתובת:
   `https://your-app-name.up.railway.app/healthz`  
   אמור לחזור: `{ "ok": true }`

---

## שלב 3 — חיבור Apify (מקור הפוסטים)
1. היכנס ל-Apify וחפש Truth Social Scraper (Actor מוכן).
2. הגדר **Schedule**: כל דקה.
3. הוסף **Webhook** לכתובת:
   ```
   POST https://your-app-name.up.railway.app/webhook/apify?secret=<APIFY_WEBHOOK_SECRET>
   ```
   החלף את `your-app-name` בכתובת שלך ואת `<APIFY_WEBHOOK_SECRET>` בערך שהגדרת ב-Railway.

> עכשיו, כל פוסט חדש של טראמפ יגיע אוטומטית לשרת שלך.

---

## שלב 4 — בדיקת זרימה (ללא IBKR)
1. ב–Railway פתח **Logs** כדי לראות מה קורה.
2. שלח בקשת בדיקה (Mock) — דרך פוסטמן/Insomnia או תוסף דפדפן:
   - `POST https://your-app-name.up.railway.app/dev/mock`
   - גוף JSON:
     ```json
     { "text": "Trump cancels tariffs on chips", "url": "https://truth.social/mock" }
     ```
3. אמורה להגיע הודעת טלגרם לבוט שלך: תקציר + כפתורי Buy/Sell.
4. במצב `DISABLE_TRADES=true` לחיצה על כפתור תחזיר הודעת Preview/No trade.

---

## שלב 5 — מעבר ל-IBKR (Paper)
1. הרץ **IBKR Client Portal Gateway** מאובטח (מומלץ עם **IBeam** בדוקר, על VPS קטן).
2. התחבר פעם אחת לחשבון Paper.
3. וודא שה-API עונה: `/v1/api/iserver/auth/status` = authenticated.
4. ב-Railway: כבה `DISABLE_TRADES`, הוסף את `IBKR_*` (כנ״ל), ועשה Redeploy.
5. בדיקה: לחץ כפתור בטלגרם → תראה ב-Logs שהוזמנה אופציה בתוקף הקרוב וב־~0.5% OTM.

---

## שלב 6 — ניטור וסטטיסטיקה
- פקודת `/ping` בטלגרם → `pong`.
- הבוט שולח פעם ביום סטטוס (Uptime+Errors).
- מומלץ להוסיף כלי ניטור (Uptime Kuma/Pingdom) ל-`/healthz`.

---

## אבטחה וטיפים
- אל תשתף **Bot Token**/מפתחות מחוץ ל-Railway Variables.
- הפעל תמיד קודם ב-**Paper** שבוע → רק אז מעבר ל-Live.
- אפשר להגדיר *Confirm* לפני כל שליחת הוראה (שדרוג קל בקוד).
- אפשר להרחיב מקורות (נאומים, X) באותו מנגנון Webhook.

בהצלחה! אם נתקעת באחד השלבים – כתוב לי בדיוק איפה, ואני מתקן/מכוון אותך במקום.
