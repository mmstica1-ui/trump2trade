import axios from 'axios';

const token = '7597128133:AAGtGl22gep4b3tfokrEPVOPgOcmdjSTLes';

async function clearUpdates() {
  console.log('🧹 Clearing Telegram updates queue...');
  
  try {
    // First get current updates
    const updatesResponse = await axios.get(`https://api.telegram.org/bot${token}/getUpdates?limit=100`);
    const updates = updatesResponse.data.result;
    
    console.log(`📨 Found ${updates.length} pending updates`);
    
    if (updates.length > 0) {
      // Get the last update ID
      const lastUpdateId = updates[updates.length - 1].update_id;
      console.log(`🔄 Last update ID: ${lastUpdateId}`);
      
      // Acknowledge all updates by setting offset to lastUpdateId + 1
      const clearResponse = await axios.get(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&limit=1`);
      
      console.log('✅ Updates queue cleared successfully!');
      console.log(`📝 Cleared updates up to ID: ${lastUpdateId}`);
    } else {
      console.log('✅ No pending updates to clear');
    }
    
  } catch (error) {
    console.error('❌ Error clearing updates:', error.message);
  }
}

clearUpdates();