#!/usr/bin/env node

/**
 * Real-time Memory Monitor for Trump2Trade
 * Monitors both local and production memory usage
 */

console.log('🔍 TRUMP2TRADE MEMORY MONITOR');
console.log('=' .repeat(60));

async function checkMemoryStatus() {
    console.log(`⏰ Check Time: ${new Date().toLocaleString('he-IL')}`);
    console.log('─'.repeat(40));

    // 1. Local PM2 Memory Check
    try {
        const { execSync } = require('child_process');
        const pm2List = execSync('pm2 jlist').toString();
        const processes = JSON.parse(pm2List);
        const trumpProcess = processes.find(p => p.name === 'trump2trade');
        
        if (trumpProcess) {
            const memMB = Math.round(trumpProcess.monit.memory / 1024 / 1024);
            const cpuPercent = trumpProcess.monit.cpu;
            const status = trumpProcess.pm2_env.status;
            const restarts = trumpProcess.pm2_env.restart_time;
            
            console.log('🖥️  LOCAL PM2 STATUS:');
            console.log(`   Status: ${status === 'online' ? '🟢 ONLINE' : '🔴 OFFLINE'}`);
            console.log(`   Memory: ${memMB}MB`);
            console.log(`   CPU: ${cpuPercent}%`);
            console.log(`   Restarts: ${restarts}`);
        } else {
            console.log('🖥️  LOCAL: ❌ Trump2Trade process not found');
        }
    } catch (error) {
        console.log('🖥️  LOCAL: ❌ Error checking PM2 status');
    }

    console.log();

    // 2. Production Health Check
    try {
        const response = await fetch('https://8080-irhizl816o5wh84wzp5re.e2b.dev/health');
        
        if (response.ok) {
            const health = await response.json();
            const memPercent = health.memory.percentage;
            const memUsedMB = Math.round(health.memory.used / 1024 / 1024);
            const memTotalMB = Math.round(health.memory.total / 1024 / 1024);
            
            // Status colors based on memory usage
            let statusColor = '🟢';
            if (memPercent >= 99) statusColor = '🚨';
            else if (memPercent >= 97) statusColor = '🔴';
            else if (memPercent >= 90) statusColor = '🟡';
            
            console.log('🌐 PRODUCTION STATUS:');
            console.log(`   Health: ${health.status === 'healthy' ? '🟢 HEALTHY' : '⚠️ WARNING'}`);
            console.log(`   Memory: ${statusColor} ${memPercent}% (${memUsedMB}MB/${memTotalMB}MB)`);
            console.log(`   Connections:`);
            console.log(`      Telegram: ${health.connections.telegram ? '✅' : '❌'}`);
            console.log(`      Synoptic: ${health.connections.synoptic ? '✅' : '❌'}`);
            console.log(`      Gemini: ${health.connections.gemini ? '✅' : '❌'}`);
            console.log(`   Alerts (24h): ${health.alertsSent24h}`);
            
            // Memory status interpretation
            console.log();
            console.log('📊 MEMORY STATUS INTERPRETATION:');
            if (memPercent < 90) {
                console.log('   ✅ Excellent - Memory usage is optimal');
            } else if (memPercent < 95) {
                console.log('   🟡 Good - Memory usage is normal for Node.js');
            } else if (memPercent < 97) {
                console.log('   🟠 Watch - Memory usage getting higher, but still OK');
            } else if (memPercent < 99) {
                console.log('   🔴 Warning - Memory usage high, monitoring closely');
            } else {
                console.log('   🚨 Critical - Memory usage critical, restart needed');
            }
            
        } else {
            console.log('🌐 PRODUCTION: ❌ Health endpoint not responding');
        }
    } catch (error) {
        console.log('🌐 PRODUCTION: ❌ Error connecting to production server');
        console.log(`   Error: ${error.message}`);
    }

    console.log();
    
    // 3. Memory Optimization Recommendations
    const currentTime = new Date().getHours();
    console.log('💡 RECOMMENDATIONS:');
    
    if (currentTime >= 6 && currentTime <= 10) {
        console.log('   🌅 Morning: Prime time for Trump posts - monitor closely');
    } else if (currentTime >= 14 && currentTime <= 18) {
        console.log('   🌞 Afternoon: Moderate Trump activity expected');
    } else {
        console.log('   🌙 Low activity period - good time for maintenance');
    }
    
    console.log('   🔧 Current Settings: 200MB heap, restart at 250MB');
    console.log('   ⚠️ Alert Thresholds: Warning=97%, Critical=99%');
    console.log('   🧹 GC: Enabled with --optimize-for-size');
}

// Single check mode
if (process.argv.includes('--once')) {
    checkMemoryStatus().then(() => {
        console.log('\n✅ Single memory check completed');
        process.exit(0);
    }).catch(console.error);
} else {
    // Continuous monitoring mode
    console.log('🔄 Starting continuous monitoring (every 2 minutes)');
    console.log('Press Ctrl+C to stop\n');
    
    // Initial check
    checkMemoryStatus();
    
    // Check every 2 minutes
    const interval = setInterval(checkMemoryStatus, 2 * 60 * 1000);
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\n🛑 Monitoring stopped');
        clearInterval(interval);
        process.exit(0);
    });
}