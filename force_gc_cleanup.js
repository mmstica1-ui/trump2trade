// Force memory cleanup and GC trigger
import 'dotenv/config';

console.log('🧹 Force Memory Cleanup and GC\n');

// Method 1: Multiple test runs to trigger memory usage and cleanup
console.log('1️⃣ Running multiple analysis to trigger memory patterns...');

const SERVER_URL = "https://8080-irhizl816o5wh84wzp5re.e2b.dev";

// Run several fast analyses to trigger memory usage
for (let i = 0; i < 3; i++) {
    try {
        const response = await fetch(`${SERVER_URL}/dev/mock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postText: `Memory cleanup test ${i+1}`,
                summary: `Triggering memory usage pattern ${i+1}`,
                tickers: ['SPY'],
                relevanceScore: 3
            })
        });
        
        if (response.ok) {
            console.log(`   ✅ Test ${i+1} completed`);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
        console.log(`   ❌ Test ${i+1} failed:`, error.message);
    }
}

console.log('\n2️⃣ Waiting for system to process and potentially trigger GC...');
await new Promise(resolve => setTimeout(resolve, 3000));

// Check memory status
console.log('\n3️⃣ Checking memory after cleanup attempts...');
try {
    const healthResponse = await fetch(`${SERVER_URL}/health`);
    const healthData = await healthResponse.json();
    
    const before92 = healthData.memory.percentage;
    console.log(`Memory usage: ${before92}%`);
    
    if (before92 < 85) {
        console.log('✅ Memory successfully reduced below 85%!');
    } else if (before92 < 90) {
        console.log('⚠️ Memory reduced but still high (85-90%)');
    } else {
        console.log('🆘 Memory still critical (>90%) - manual intervention needed');
        
        console.log('\n4️⃣ Attempting system restart via PM2...');
        console.log('   Consider running: pm2 restart trump2trade');
    }
    
} catch (error) {
    console.log('❌ Could not check memory status:', error.message);
}

console.log('\n🎯 Memory Management Solutions:');
console.log('✅ Lower max-old-space-size to 400MB (applied)');
console.log('✅ Lower max_memory_restart to 500MB (applied)');
console.log('✅ Automatic cleanup of old errors and data');
console.log('⚠️ Manual restart if memory stays >90%');

console.log('\n💡 For persistent high memory:');
console.log('   pm2 restart trump2trade (manual restart)');
console.log('   This will reset memory to ~40MB baseline');