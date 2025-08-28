// Test all bot commands systematically
const axios = require('axios');

const BOT_TOKEN = '7597128133:AAGtGl22gep4b3tfokrEPVOPgOcmdjSTLes';
const CHAT_ID = '540751833';
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendCommand(command) {
  try {
    console.log(`\n🧪 Testing command: ${command}`);
    
    const response = await axios.post(`${BASE_URL}/sendMessage`, {
      chat_id: CHAT_ID,
      text: command
    });
    
    console.log(`✅ Command sent successfully: ${command}`);
    
    // Wait a bit before next command
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to send ${command}:`, error.response?.data || error.message);
    return null;
  }
}

async function testAllCommands() {
  console.log('🎯 Starting comprehensive command testing...\n');
  
  const commands = [
    // Basic commands
    '/help',
    '/ping', 
    '/status',
    '/check',
    
    // Control commands  
    '/safe_mode off',
    '/system on',
    
    // IBKR commands
    '/connect_real_ibkr',
    '/ibkr_balance',
    '/ibkr_positions', 
    '/real_balance',
    '/real_positions',
    
    // Monitoring commands
    '/health',
    '/monitor',
    '/daily',
    '/analytics'
  ];
  
  console.log(`📋 Testing ${commands.length} commands total:\n`);
  
  for (const command of commands) {
    await sendCommand(command);
  }
  
  console.log('\n✅ All commands tested! Check your Telegram for responses.');
  console.log('⏰ Wait a few seconds for all responses to arrive.');
}

testAllCommands();