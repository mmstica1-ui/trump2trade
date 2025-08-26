// Send Taiwan invasion demo to Telegram
import 'dotenv/config';

const WEBHOOK_URL = "https://8080-irhizl816o5wh84wzp5re.e2b.dev";

// Taiwan invasion mock data with new ticker analysis format
const mockData = {
  postText: "China will NEVER invade Taiwan while I'm President! Our military is the STRONGEST in the world and we will defend our allies! Sanctions on China will be MASSIVE!",
  url: "https://truth.social/mock/taiwan",
  relevanceScore: 9,
  summary: "Trump's Taiwan defense rhetoric typically triggers defense sector rallies while pressuring Chinese equities and broad market indices due to geopolitical tensions.",
  tickerAnalysis: [
    {symbol: 'ITA', impact: 'positive', reason: 'Defense spending boost'},
    {symbol: 'FXI', impact: 'negative', reason: 'China sanctions threat'},
    {symbol: 'TSM', impact: 'positive', reason: 'Taiwan semiconductor protection'},
    {symbol: 'SPY', impact: 'negative', reason: 'Geopolitical uncertainty'}
  ]
};

console.log('🚨 Sending Taiwan Invasion Demo to Telegram...\n');
console.log('📝 Mock Data:', JSON.stringify(mockData, null, 2));

try {
  const response = await fetch(`${WEBHOOK_URL}/dev/mock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mockData)
  });

  const responseText = await response.text();
  
  if (response.ok) {
    console.log('✅ Successfully sent to Telegram!');
    console.log('📤 Response:', responseText);
  } else {
    console.log('❌ Failed to send:', response.status, responseText);
  }
} catch (error) {
  console.error('💥 Error sending to Telegram:', error.message);
}