// Test if garbage collection is available
import 'dotenv/config';

console.log('🧹 Testing Garbage Collection Availability\n');

// Test GC directly
console.log('1️⃣ Checking global.gc availability...');
if (global.gc) {
    console.log('✅ global.gc is available!');
    
    console.log('2️⃣ Getting memory before GC...');
    const beforeGC = process.memoryUsage();
    console.log(`Before GC: ${Math.round(beforeGC.heapUsed / 1024 / 1024)}MB used`);
    
    console.log('3️⃣ Running garbage collection...');
    global.gc();
    
    console.log('4️⃣ Getting memory after GC...');
    const afterGC = process.memoryUsage();
    console.log(`After GC: ${Math.round(afterGC.heapUsed / 1024 / 1024)}MB used`);
    
    const saved = beforeGC.heapUsed - afterGC.heapUsed;
    console.log(`💾 Memory freed: ${Math.round(saved / 1024 / 1024)}MB`);
    
} else {
    console.log('❌ global.gc is NOT available!');
    console.log('   This means --expose-gc flag is not working');
    console.log('   PM2 is not starting with proper node_args');
}

// Test via system endpoint
console.log('\n5️⃣ Testing system memory status...');
try {
    const response = await fetch('https://8080-irhizl816o5wh84wzp5re.e2b.dev/health');
    const health = await response.json();
    
    console.log(`📊 Current memory: ${health.memory.percentage}%`);
    console.log(`📈 Memory used: ${Math.round(health.memory.used / 1024 / 1024)}MB`);
    console.log(`📊 Memory total: ${Math.round(health.memory.total / 1024 / 1024)}MB`);
    
    if (health.memory.percentage > 90) {
        console.log('🆘 CRITICAL: Memory still above 90% - GC urgently needed!');
    } else {
        console.log('✅ Memory usage acceptable');
    }
    
} catch (error) {
    console.log('❌ Could not check system health:', error.message);
}

console.log('\n🎯 Next steps:');
if (global.gc) {
    console.log('✅ GC is working - memory should be managed properly');
} else {
    console.log('❌ Need to fix PM2 node_args configuration');
}