// Test the fixed bot behavior
import 'dotenv/config';

const SERVER_URL = "https://8080-irhizl816o5wh84wzp5re.e2b.dev";

console.log('🧪 Testing Fixed Bot Behavior...\n');

// Test the Taiwan scenario again to see if fixes work
const taiwanData = {
  postText: "Testing fixed bot - China will NEVER invade Taiwan!",
  url: "https://truth.social/mock/taiwan-test",
  relevanceScore: 8,
  summary: "Testing the fixed message format without duplicates or strange symbols.",
  tickerAnalysis: [
    {symbol: 'ITA', impact: 'positive', reason: 'Defense spending boost'},
    {symbol: 'FXI', impact: 'negative', reason: 'China sanctions threat'}
  ]
};

try {
  console.log('📤 Sending test message to verify fixes...');
  const response = await fetch(`${SERVER_URL}/dev/mock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(taiwanData)
  });

  const result = await response.text();
  
  if (response.ok) {
    console.log('✅ Test message sent successfully!');
    console.log('📋 Expected improvements:');
    console.log('  ✅ No duplicate help messages');
    console.log('  ✅ Proper health status reporting');  
    console.log('  ✅ No strange ?? symbols');
    console.log('  ✅ Enhanced mock endpoint with ticker analysis support');
  } else {
    console.log('❌ Failed to send test:', response.status, result);
  }
} catch (error) {
  console.error('💥 Test failed:', error.message);
}

// Test health endpoint
console.log('\n🔍 Testing health endpoint...');
try {
  const healthResponse = await fetch(`${SERVER_URL}/health`);
  const healthData = await healthResponse.json();
  
  console.log('📊 Health Status:', healthData.status.toUpperCase());
  console.log('🧠 Memory Usage:', healthData.memory.percentage + '%');
  console.log('🔗 Telegram Connected:', healthData.connections.telegram ? 'YES' : 'NO');
  
} catch (error) {
  console.log('❌ Health check failed:', error.message);
}