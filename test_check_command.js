// Test the /check command logic to see if App shows OK now
import 'dotenv/config';

console.log('🧪 Testing /check Command Logic\n');

// Import the function that /check uses
import('./dist/ops.js').then(async (ops) => {
  console.log('📋 Running System Check (same as /check command)...\n');
  
  try {
    await ops.runFullSystemCheck();
    console.log('\n✅ System check completed - check Telegram for results!');
  } catch (error) {
    console.error('❌ System check failed:', error.message);
  }
});

// Also test health snapshot directly
import('./dist/ops.js').then(async (ops) => {
  console.log('\n🩺 Testing Health Snapshot Logic...\n');
  
  try {
    const health = await ops.getHealthSnapshot();
    console.log(`App Health: ${health.appOk ? 'OK ✅' : 'FAIL ❌'}`);
    console.log(`IBKR Health: ${health.ibkrOk ? 'OK ✅' : 'FAIL ❌'}`);
    
    if (health.appOk) {
      console.log('\n🎉 SUCCESS: App should now show OK instead of FAIL!');
    } else {
      console.log('\n⚠️ Still showing FAIL - need more investigation');
    }
  } catch (error) {
    console.error('❌ Health snapshot failed:', error.message);
  }
});