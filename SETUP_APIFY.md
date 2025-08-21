# מדריך הקמת Apify Actor + Webhook לTrump2Trade

## שלב 1: יצירת Apify Actor

1. **התחבר ל-Apify Console**: https://console.apify.com/
2. **צור Actor חדש**:
   - לך ל-"Actors" → "Create new"
   - בחר "Blank Actor" או "Web Scraper"
   - שם: "Trump Truth Social Scraper"

## שלב 2: הקוד ל-Actor (main.js)

הדבק את הקוד הזה ב-main.js של ה-Actor:

```javascript
import { Actor } from 'apify';
import { CheerioCrawler } from 'crawlee';

await Actor.init();

const crawler = new CheerioCrawler({
    requestHandler: async ({ request, $ }) => {
        console.log(`Processing ${request.url}...`);
        
        // חיפוש הפוסט האחרון
        let postText = '';
        let postId = '';
        let postUrl = request.url;
        
        // שיטה 1: חיפוש בHTML
        const statusMatch = $('script').text().match(/"content":"([^"]{20,500})"/);
        if (statusMatch) {
            postText = statusMatch[1].replace(/\\n/g, ' ').replace(/\\u[0-9a-f]{4}/g, ' ');
        }
        
        // שיטה 2: meta tags
        if (!postText) {
            postText = $('meta[property="og:description"]').attr('content') || 'New Trump post detected';
        }
        
        // חיפוש ID
        const idMatch = request.url.match(/post[s]?\\/([0-9]+)/) || $('script').text().match(/"statusId":"([0-9]+)"/);
        if (idMatch) {
            postId = idMatch[1];
        }
        
        // שמירה ל-Dataset
        await Actor.pushData({
            text: postText,
            url: postUrl,
            id: postId,
            timestamp: new Date().toISOString()
        });
    },
});

// URL לגירוד
await crawler.run(['https://truthsocial.com/@realDonaldTrump']);

await Actor.exit();
```

## שלב 3: הגדרת Task + Webhook

1. **צור Task**:
   - מ-Actor שיצרת, לחץ "Create Task"
   - שם: "Trump Monitor"

2. **הגדר Webhook** (זה הכי חשוב!):
   - בTask → לשונית "Webhooks"
   - לחץ "Add webhook"
   - **Event type**: `SUCCEEDED`
   - **URL**: `https://your-app-url.com/webhook/apify`
   - **Headers**: 
     ```
     x-apify-signature: moshe454
     ```
   - **Payload template**:
     ```json
     {
       "text": "{{text}}",
       "url": "{{url}}",
       "id": "{{id}}"
     }
     ```

## שלב 4: Schedule התרצה

1. **בTask → לשונית "Schedule"**:
   - בחר "Scheduled runs"
   - תדירות: כל 2-5 דקות (לא יותר מדי כדי לא לחסום)
   - או: "Run on data change" אם יש לך logic להשוואה

## שלב 5: בדיקה ראשונית

1. **הרץ Task ידנית**: לחץ "Run" ובדוק שהוא מצליח לגרד
2. **בדוק Webhook**: אמור להגיע request ל-`/webhook/apify` שלך
3. **בדוק לוגים**: ב-Task logs תוכל לראות אם הWebhook נשלח בהצלחה

## בעיות נפוצות ופתרונות:

- **שגיאת 401 בWebhook**: בדוק ש-`x-apify-signature: moshe454` מדויק
- **שגיאת JSON**: וודא ש-payload template תקין
- **לא מוצא טקסט**: Truth Social משנה structure - תצטרך להתאים את הקוד
- **חסימת IP**: השתמש ב-proxies ב-Apify או הפחת תדירות

## הערות:
- התחל עם תדירות נמוכה (5-10 דקות) ואז הקטן
- Truth Social עלול לחסום - הפולר הפנימי הוא גיבוי
- בדוק תמיד שהWebhook מגיע לאפליקציה שלך