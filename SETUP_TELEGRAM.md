# הגדרת Telegram Bot לTrump2Trade

## צעדים:

### 1. יצירת Bot
1. פתח Telegram ושלח הודעה ל: `@BotFather`
2. שלח: `/newbot`
3. תן שם לבוט (למשל: "Trump2Trade Bot")
4. תן username (חייב להסתיים ב-bot, למשל: `trump2trade_bot`)
5. **העתק את הTOKEN** שתקבל

### 2. קבלת Chat ID שלך
1. שלח הודעה ל: `@userinfobot`
2. **העתק את המספר** שתקבל (זה ה-Chat ID שלך)

### 3. עדכון קובץ .env
```bash
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz123456789
TELEGRAM_CHAT_ID=123456789
```

### 4. בדיקה
אחרי שהאפליקציה רצה, שלח לבוט שלך:
- `/help` - אמור לקבל רשימת פקודות
- `/ping` - אמור לקבל "pong"
- `/status` - אמור לקבל סטטוס המערכת (רק אם אתה האדמין)