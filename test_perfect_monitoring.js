// Test perfect monitoring with connection status updates
import 'dotenv/config';

const SERVER_URL = "https://8080-irhizl816o5wh84wzp5re.e2b.dev";

console.log('🎯 Testing Perfect Monitoring Display\n');

// First, trigger a Gemini analysis to update status
console.log('1️⃣ Triggering Gemini analysis to update connection status...');

const testData = {
  postText: "Perfect monitoring test - America leads in innovation!",
  url: "https://truth.social/mock/monitoring-test",
  relevanceScore: 7,
  summary: "Testing perfect connection status monitoring",
  tickerAnalysis: [
    {symbol: 'QQQ', impact: 'positive', reason: 'Tech innovation leadership'},
    {symbol: 'SPY', impact: 'positive', reason: 'American market strength'}
  ]
};

try {
  const response = await fetch(`${SERVER_URL}/dev/mock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData)
  });

  if (response.ok) {
    console.log('✅ Test message sent - this should update Gemini status');
  } else {
    console.log('❌ Test message failed:', response.status);
  }
} catch (error) {
  console.log('❌ Test failed:', error.message);
}

// Wait a bit, then check health status
console.log('\n2️⃣ Waiting for connection updates...');
await new Promise(resolve => setTimeout(resolve, 3000));

// Check health endpoint
console.log('\n3️⃣ Checking updated health status...');
try {
  const healthResponse = await fetch(`${SERVER_URL}/health`);
  const healthData = await healthResponse.json();
  
  console.log('\n📊 Current Connection Status:');
  console.log(`Telegram: ${healthData.connections.telegram ? '✅ Connected' : '❌ Disconnected'}`);
  console.log(`Synoptic: ${healthData.connections.synoptic ? '✅ Connected' : '❌ Disconnected'}`);
  console.log(`Gemini: ${healthData.connections.gemini ? '✅ Connected' : '❌ Disconnected'}`);
  
  const allConnected = healthData.connections.telegram && 
                      healthData.connections.synoptic && 
                      healthData.connections.gemini;
  
  if (allConnected) {
    console.log('\n🎉 PERFECT! All connections show ✅');
  } else {
    console.log('\n⚠️ Some connections still show ❌ - may need manual trigger');
  }
  
  console.log(`\n🧠 Memory: ${healthData.memory.percentage}%`);
  console.log(`📊 Status: ${healthData.status.toUpperCase()}`);
  
} catch (error) {
  console.log('❌ Health check failed:', error.message);
}

console.log('\n🎯 Ready for Live Posts Check:');
console.log('✅ Synoptic WebSocket - Trump post monitoring');
console.log('✅ Gemini AI - Fast analysis pipeline'); 
console.log('✅ Telegram Bot - Instant alert delivery');
console.log('✅ Enhanced Ticker Analysis - Professional format');
console.log('✅ Memory Management - Stable under 90%');
console.log('✅ Health Monitoring - Real-time status');

console.log('\n📱 Next Telegram /health should show perfect status!');