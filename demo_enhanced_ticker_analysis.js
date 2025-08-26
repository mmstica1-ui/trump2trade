// Demo of ENHANCED ticker impact analysis - Israel-Iran conflict scenario
import 'dotenv/config';

const SERVER_URL = "https://8080-irhizl816o5wh84wzp5re.e2b.dev";

console.log('🚨 ENHANCED TICKER ANALYSIS DEMO - Israel-Iran Conflict\n');

// Enhanced demo with detailed ticker analysis
const israelIranData = {
  postText: "Israel must DEFEND itself against Iran! Military aid to Israel will be INCREASED and Iran sanctions will be MASSIVE! Peace through STRENGTH!",
  url: "https://truth.social/mock/israel-iran-conflict",
  relevanceScore: 9,
  summary: "Trump's Israel-Iran rhetoric typically boosts defense contractors and pressures oil markets while creating uncertainty in regional equity funds.",
  tickerAnalysis: [
    {symbol: 'LMT', impact: 'positive', reason: 'Defense contractor benefits from military aid increases'},
    {symbol: 'RTX', impact: 'positive', reason: 'Raytheon gains from missile defense systems demand'},
    {symbol: 'XLE', impact: 'positive', reason: 'Oil prices rise due to Middle East tensions'},
    {symbol: 'EFA', impact: 'negative', reason: 'European markets affected by regional instability'},
    {symbol: 'SPY', impact: 'negative', reason: 'Broad market uncertainty from geopolitical conflict'}
  ]
};

console.log('📊 Enhanced Ticker Analysis:');
israelIranData.tickerAnalysis.forEach(ticker => {
  const emoji = ticker.impact === 'positive' ? '🟢📈' : '🔴📉';
  const impact = ticker.impact === 'positive' ? 'BULLISH' : 'BEARISH';
  console.log(`${emoji} ${ticker.symbol} - ${impact}: ${ticker.reason}`);
});

try {
  console.log('\n📤 Sending enhanced demo to Telegram...');
  const response = await fetch(`${SERVER_URL}/dev/mock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(israelIranData)
  });

  const result = await response.text();
  
  if (response.ok) {
    console.log('✅ Enhanced ticker analysis demo sent successfully!');
    console.log('\n🎯 New Features Demonstrated:');
    console.log('  📊 Individual ticker impact analysis (positive/negative)');
    console.log('  💬 Clear reasoning for each ticker recommendation');
    console.log('  🎨 Visual indicators (🟢📈 bullish, 🔴📉 bearish)');
    console.log('  🧠 Smart button ordering (recommended action first)');
    console.log('  🏆 Professional layout with enhanced sections');
    
    console.log('\n🔄 Smart Button Ordering:');
    console.log('  🟢 LMT: Buy Call first (bullish recommendation)');
    console.log('  🟢 RTX: Buy Call first (bullish recommendation)');  
    console.log('  🟢 XLE: Buy Call first (bullish recommendation)');
    console.log('  🔴 EFA: Buy Put first (bearish recommendation)');
    console.log('  🔴 SPY: Buy Put first (bearish recommendation)');
  } else {
    console.log('❌ Failed to send demo:', response.status, result);
  }
} catch (error) {
  console.error('💥 Demo failed:', error.message);
}

// Test memory usage
console.log('\n🧠 Testing memory improvements...');
try {
  const healthResponse = await fetch(`${SERVER_URL}/health`);
  const healthData = await healthResponse.json();
  
  const memoryStatus = healthData.memory.percentage < 85 ? '✅ GOOD' : 
                      healthData.memory.percentage < 95 ? '⚠️ HIGH' : '🆘 CRITICAL';
  
  console.log(`Memory Usage: ${healthData.memory.percentage}% - ${memoryStatus}`);
  console.log(`System Status: ${healthData.status.toUpperCase()}`);
} catch (error) {
  console.log('❌ Memory check failed:', error.message);
}