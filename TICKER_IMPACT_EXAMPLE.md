# 📊 Ticker Impact Analysis - הדגמה

## 🎯 המטרה
להוסיף ניתוח השפעת הידיעה לכל טיקר בנפרד - האם הידיעה חיובית או שלילית עבור הטיקר הזה.

## 📱 איך זה נראה בהודעה החדשה

### לפני (הפורמט הישן):
```
📊 Trading Opportunities: SPY | FXI | XLI 🟢8/10
```

### אחרי (הפורמט החדש):
```
📊 Trading Opportunities: 🟢8/10

🟢 SPY - 📈 BULLISH
   💬 Pro-business policies

🔴 FXI - 📉 BEARISH  
   💬 China tariff impact

🟢 XLI - 📈 BULLISH
   💬 US manufacturing boost
```

## 🤖 AI Response Format
```json
{
  "summary": "Trump's China trade rhetoric impacts multiple sectors",
  "tickers": [
    {"symbol": "SPY", "impact": "positive", "reason": "Pro-business policies"},
    {"symbol": "FXI", "impact": "negative", "reason": "China tariff impact"},
    {"symbol": "XLI", "impact": "positive", "reason": "US manufacturing boost"}
  ],
  "relevanceScore": 8
}
```

## 🔘 כפתורי מסחר חכמים
- **Positive Impact**: Call button ראשון (מומלץ)
- **Negative Impact**: Put button ראשון (מומלץ)

זה עוזר למשתמש לראות מיד מה המלצת ה-AI לכל טיקר!