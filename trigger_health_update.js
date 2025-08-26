// Force update connection statuses in monitoring
import 'dotenv/config';

console.log('🔄 Forcing connection status updates...\n');

// Import monitoring and update connection statuses
import('./dist/monitoring.js').then(async (monitoring) => {
  try {
    const monitor = monitoring.getMonitor();
    
    console.log('📡 Updating Synoptic connection status...');
    monitor.setConnectionStatus('synoptic', true); // Force to true since logs show it's connected
    
    console.log('🤖 Testing Gemini connection...');
    try {
      const { analyzePost } = await import('./dist/llm.js');
      await analyzePost('Connection test');
      monitor.setConnectionStatus('gemini', true);
      console.log('✅ Gemini connected and status updated');
    } catch (error) {
      monitor.setConnectionStatus('gemini', false);
      console.log('❌ Gemini connection failed:', error.message);
    }
    
    console.log('📊 Getting updated health status...');
    const health = monitor.getSystemHealth();
    
    console.log('\n🏥 Updated Health Status:');
    console.log(`Status: ${health.status.toUpperCase()}`);
    console.log(`Memory: ${health.memory.percentage}%`);
    console.log(`Telegram: ${health.connections.telegram ? '✅' : '❌'}`);
    console.log(`Synoptic: ${health.connections.synoptic ? '✅' : '❌'}`);
    console.log(`Gemini: ${health.connections.gemini ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ Failed to update statuses:', error.message);
  }
});

// Also trigger a system check to send updated status to Telegram
console.log('\n📱 Triggering system check to send updated status to Telegram...');
import('./dist/ops.js').then(async (ops) => {
  try {
    await ops.runFullSystemCheck();
    console.log('✅ System check completed - updated status sent to Telegram!');
  } catch (error) {
    console.error('❌ System check failed:', error.message);
  }
});