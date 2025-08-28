// Test button click simulation
const { chooseTrade } = require('./dist/ibkr.js');

async function testButtonClick() {
  console.log('🧪 Testing NVDA Call 1% button click...');
  
  try {
    const result = await chooseTrade({
      a: 'buy_call',
      t: 'NVDA',
      pct: '1'
    });
    
    console.log('✅ Button click result:', result);
    
    // Test Put option too
    console.log('\n🧪 Testing NVDA Put 2% button click...');
    const result2 = await chooseTrade({
      a: 'buy_put', 
      t: 'NVDA',
      pct: '2'
    });
    
    console.log('✅ Put button result:', result2);
    
  } catch (error) {
    console.error('❌ Button test failed:', error.message);
    console.error('Full error:', error);
  }
}

testButtonClick();