import axios from 'axios';

const token = '7597128133:AAGtGl22gep4b3tfokrEPVOPgOcmdjSTLes';
const chatId = '540751833';

async function testBot() {
  console.log('🧪 Testing bot /ping command...');
  
  try {
    // Send ping command
    const response = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: '/ping'
    });
    
    console.log('✅ Test message sent:', response.data.result.message_id);
    
    // Wait a bit and check for responses
    setTimeout(async () => {
      try {
        const updates = await axios.get(`https://api.telegram.org/bot${token}/getUpdates?limit=5`);
        console.log('📨 Recent updates:', JSON.stringify(updates.data.result, null, 2));
      } catch (error) {
        console.error('❌ Error getting updates:', error.message);
      }
    }, 3000);
    
  } catch (error) {
    console.error('❌ Error sending test message:', error.message);
  }
}

testBot();