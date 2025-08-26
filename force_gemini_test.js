// Force Gemini test to update connection status
import 'dotenv/config';

console.log('🤖 Force Testing Gemini Connection...\n');

// Direct test of Gemini analysis
import('./dist/llm.js').then(async (llm) => {
  console.log('📊 Running direct Gemini analysis test...');
  
  try {
    const result = await llm.analyzePost('Test post for connection status');
    console.log('✅ Gemini analysis successful:', result.summary);
    console.log('📈 Tickers:', result.tickers);
    console.log('📊 Relevance:', result.relevanceScore);
    
    console.log('\n⏳ Waiting for status to propagate...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check health endpoint again
    const healthResponse = await fetch('https://8080-irhizl816o5wh84wzp5re.e2b.dev/health');
    const healthData = await healthResponse.json();
    
    console.log('\n📊 Updated Connection Status:');
    console.log(`Gemini: ${healthData.connections.gemini ? '✅ Connected' : '❌ Still disconnected'}`);
    
    if (healthData.connections.gemini) {
      console.log('🎉 SUCCESS: Gemini status updated to connected!');
    } else {
      console.log('⚠️ Gemini still shows disconnected - checking logs...');
    }
    
  } catch (error) {
    console.error('❌ Gemini analysis failed:', error.message);
  }
});

console.log('\nℹ️ This test directly calls analyzePost to trigger status update');