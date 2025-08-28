// Test the fixed button functionality
const { chooseTrade } = require('./dist/ibkr-simple.js');

async function testFinalButton() {
  console.log('🎯 FINAL TEST: Testing NVDA C1% button...');
  
  try {
    const result = await chooseTrade({
      a: 'buy_call',
      t: 'NVDA', 
      pct: '1'
    });
    
    console.log('✅ SUCCESS! Button result:');
    console.log(result);
    
    console.log('\n🎯 Testing NVDA P2.5% button...');
    const result2 = await chooseTrade({
      a: 'buy_put',
      t: 'NVDA',
      pct: '2.5'
    });
    
    console.log('✅ SUCCESS! Put result:');
    console.log(result2);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFinalButton();