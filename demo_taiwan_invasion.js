// Demo of new ticker impact analysis with Taiwan invasion scenario
import 'dotenv/config';

console.log('🚨 TAIWAN INVASION SCENARIO - New Message Format Demo\n');

// Simulate Trump post about Taiwan invasion
const trumpPost = "China will NEVER invade Taiwan while I'm President! Our military is the STRONGEST in the world and we will defend our allies! Sanctions on China will be MASSIVE!";

// Simulate AI analysis with new ticker format
const analysis = {
  summary: "Trump's Taiwan defense rhetoric typically triggers defense sector rallies while pressuring Chinese equities and broad market indices due to geopolitical tensions.",
  tickerAnalysis: [
    {symbol: 'ITA', impact: 'positive', reason: 'Defense spending boost'},
    {symbol: 'FXI', impact: 'negative', reason: 'China sanctions threat'},
    {symbol: 'TSM', impact: 'positive', reason: 'Taiwan semiconductor protection'},
    {symbol: 'SPY', impact: 'negative', reason: 'Geopolitical uncertainty'}
  ],
  relevanceScore: 9
};

// Build the new enhanced message format
console.log('📱 NEW TELEGRAM MESSAGE FORMAT:\n');
console.log('=' .repeat(60));

let message = `🚨 <b>TRUMP ALERT</b> - Market Moving Post Detected!\n\n`;

// Timing analysis
const alertTime = new Date();
const originalPostTime = new Date(Date.now() - 2300); // 2.3 seconds ago
const totalDelaySeconds = Math.round((alertTime.getTime() - originalPostTime.getTime()) / 1000);
const delayIcon = totalDelaySeconds <= 2 ? '⚡' : totalDelaySeconds <= 5 ? '🟡' : '🔴';

message += `${delayIcon} <b>Total Delay:</b> ${totalDelaySeconds}s from original post\n\n`;

// Original post
message += `📝 <b>Original Trump Post:</b>\n<blockquote>"${trumpPost}"</blockquote>\n\n`;

// Analysis summary  
message += `🧠 <b>Market Impact Analysis:</b>\n${analysis.summary}\n\n`;

// NEW: Enhanced ticker impact display
const relevanceEmoji = analysis.relevanceScore >= 8 ? '🎯' : analysis.relevanceScore >= 6 ? '🟢' : '🟡';
message += `📊 <b>Trading Opportunities:</b> ${relevanceEmoji}${analysis.relevanceScore}/10\n\n`;

for (const ticker of analysis.tickerAnalysis) {
  const impactEmoji = ticker.impact === 'positive' ? '📈' : '📉';
  const impactText = ticker.impact === 'positive' ? 'BULLISH' : 'BEARISH';
  const impactColor = ticker.impact === 'positive' ? '🟢' : '🔴';
  
  message += `${impactColor} <b>${ticker.symbol}</b> - ${impactEmoji} <b>${impactText}</b>\n`;
  message += `   💬 <i>${ticker.reason}</i>\n\n`;
}

message += `🔗 <a href="https://truth.social/mock/taiwan">Direct Link to Truth Social Post</a>`;

console.log(message);
console.log('=' .repeat(60));

// Show button configuration
console.log('\n🔘 SMART TRADING BUTTONS (based on AI impact analysis):\n');

analysis.tickerAnalysis.forEach(ticker => {
  const { symbol, impact } = ticker;
  if (impact === 'positive') {
    console.log(`📈 Buy Call ${symbol}    🔴 Buy Put ${symbol}    (Call recommended first)`);
  } else {
    console.log(`🔴 Buy Put ${symbol}     📈 Buy Call ${symbol}    (Put recommended first)`);
  }
});

console.log('\n📈 Manual Trading    🧪 Preview (no trade)');
console.log('🔗 View Original Post');

console.log('\n🎯 KEY IMPROVEMENTS:');
console.log('✅ Individual ticker impact analysis (positive/negative)');
console.log('✅ Clear reasoning for each ticker');  
console.log('✅ Visual indicators (🟢📈 for bullish, 🔴📉 for bearish)');
console.log('✅ Smart button ordering (recommended action first)');
console.log('✅ Professional layout with clear sections');
console.log('✅ Sub-2-second alert delivery maintained');

process.exit(0);