// Test GC internally via the running system
import 'dotenv/config';

const SERVER_URL = "https://8080-irhizl816o5wh84wzp5re.e2b.dev";

console.log('🧹 Testing Internal GC via System Endpoint\n');

// Create a simple endpoint test that triggers memory usage and GC
const testData = {
  postText: "GC Test: America will lead in memory efficiency and smart resource management!",
  url: "https://truth.social/mock/gc-test",
  relevanceScore: 6,
  summary: "Testing garbage collection and memory management optimization",
  tickerAnalysis: [
    {symbol: 'SPY', impact: 'positive', reason: 'Efficient system management'}
  ]
};

console.log('📊 Sending test to trigger memory and GC...');
try {
  const response = await fetch(`${SERVER_URL}/dev/mock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData)
  });

  if (response.ok) {
    console.log('✅ Test processed successfully');
  } else {
    console.log('❌ Test failed:', response.status);
  }
} catch (error) {
  console.log('❌ Test error:', error.message);
}

// Wait a bit, then check memory status
console.log('\n⏳ Waiting for system processing...');
await new Promise(resolve => setTimeout(resolve, 5000));

console.log('\n📊 Checking memory status after processing...');
try {
  const healthResponse = await fetch(`${SERVER_URL}/health`);
  const healthData = await healthResponse.json();
  
  const memoryStatus = healthData.memory.percentage < 85 ? '✅ GOOD' : 
                      healthData.memory.percentage < 95 ? '⚠️ HIGH' : '🆘 CRITICAL';
  
  console.log(`Memory: ${healthData.memory.percentage}% - ${memoryStatus}`);
  console.log(`Used: ${Math.round(healthData.memory.used / 1024 / 1024)}MB`);
  console.log(`Total: ${Math.round(healthData.memory.total / 1024 / 1024)}MB`);
  
  if (healthData.memory.percentage > 90) {
    console.log('\n🆘 Memory still high - checking if system GC is working...');
  } else {
    console.log('\n✅ Memory managed properly - GC appears to be working');
  }
  
} catch (error) {
  console.log('❌ Health check failed:', error.message);
}

console.log('\n📝 Note: The system should automatically trigger GC when memory > 80%');