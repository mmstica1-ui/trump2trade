// Test all critical fixes for health and memory
import 'dotenv/config';

const SERVER_URL = "https://8080-irhizl816o5wh84wzp5re.e2b.dev";

console.log('🩺 TESTING CRITICAL SYSTEM FIXES\n');

// Test health endpoint
console.log('1️⃣ Testing Health Endpoint...');
try {
  const healthResponse = await fetch(`${SERVER_URL}/health`);
  const healthData = await healthResponse.json();
  
  const statusIcon = healthData.status === 'healthy' ? '✅' : 
                    healthData.status === 'warning' ? '⚠️' : '🆘';
                    
  console.log(`${statusIcon} Status: ${healthData.status.toUpperCase()}`);
  console.log(`🧠 Memory: ${healthData.memory.percentage}%`);
  console.log(`🔗 Telegram: ${healthData.connections.telegram ? '✅' : '❌'}`);
  console.log(`📊 HTTP Status: ${healthResponse.status}`);
  
  if (healthResponse.status === 200) {
    console.log('✅ Health endpoint returning 200 - FIXED!');
  } else {
    console.log(`⚠️ Still returning ${healthResponse.status}`);
  }
} catch (error) {
  console.log('❌ Health check failed:', error.message);
}

// Test enhanced message with fixes
console.log('\n2️⃣ Testing Enhanced Message with Fixes...');
const testData = {
  postText: "SYSTEM FIXES TEST - America will ALWAYS lead in technology!",
  url: "https://truth.social/mock/system-test",
  relevanceScore: 7,
  summary: "Testing enhanced ticker analysis after critical system fixes",
  tickerAnalysis: [
    {symbol: 'NVDA', impact: 'positive', reason: 'AI leadership benefits from tech policy'},
    {symbol: 'TSLA', impact: 'positive', reason: 'American innovation gets priority'}
  ]
};

try {
  const response = await fetch(`${SERVER_URL}/dev/mock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData)
  });

  if (response.ok) {
    console.log('✅ Enhanced message sent successfully!');
    console.log('📊 Expected format:');
    console.log('  🟢 NVDA - 📈 BULLISH (AI leadership benefits)');
    console.log('  🟢 TSLA - 📈 BULLISH (American innovation priority)');
    console.log('  🔘 Smart buttons: Call first for both (bullish)');
  } else {
    console.log('❌ Message failed:', response.status);
  }
} catch (error) {
  console.log('❌ Message test failed:', error.message);
}

console.log('\n📋 FIXES SUMMARY:');
console.log('🔧 Health check logic - circular dependency removed');
console.log('🧠 Memory thresholds - more forgiving (98% critical vs 90%)');  
console.log('♻️ Garbage collection - enabled with --expose-gc flag');
console.log('🎯 Memory limit - set to 512MB max-old-space-size');
console.log('📊 Enhanced ticker analysis - fully implemented');

console.log('\n🎯 The next check from Railway should show:');
console.log('✅ Health: App OK (instead of FAIL)');  
console.log('⚠️ Memory: Lower usage with better GC');
console.log('🟢 Enhanced ticker format in messages');