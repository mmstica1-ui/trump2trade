# הגדרת IBKR Gateway לTrump2Trade (אופציונלי)

## ⚠️ חשוב: התחל במצב בטוח!
המערכת מוגדרת כברירת מחדל עם `DISABLE_TRADES=true` - **אל תשנה עד שהכל עובד מושלם**

## לעתיד: הגדרת IBKR Gateway

### 1. התקנת IBeam (Docker)
```bash
docker run -d --name ibeam \
  -p 5000:5000 \
  -v ~/ibeam:/srv/app \
  voyz/ibeam:latest
```

### 2. הגדרות נדרשות ב-.env (כשתהיה מוכן):
```bash
IBKR_BASE_URL=https://localhost:5000/v1/api
IBKR_ACCOUNT_ID=DU1234567  # חשבון נייר
IBKR_ORDER_TIF=DAY
IBKR_ORDER_DEFAULT_QTY=1
IBKR_OUTSIDE_RTH=false

# ⚠️ אל תשנה עד שהכל עובד!
DISABLE_TRADES=true
```

### 3. בדיקת חיבור (כשתהיה מוכן)
```bash
curl https://localhost:5000/v1/api/iserver/auth/status
```

## בינתיים:
השאר `DISABLE_TRADES=true` והמערכת תעבוד במצב "Preview" - תקבל את כל ההתרעות והניתוחים אבל ללא מסחר אמיתי.