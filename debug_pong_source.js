// Debug script to identify the source of pong spam
import 'dotenv/config';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

console.log('🔍 PONG SPAM DEBUG ANALYSIS');
console.log('════════════════════════════════════════');

console.log('📋 Bot Configuration:');
console.log(`├─ Bot Token: ${BOT_TOKEN ? `...${BOT_TOKEN.slice(-8)}` : 'MISSING'}`);
console.log(`├─ Chat ID: ${CHAT_ID}`);
console.log('');

async function debugPongSpam() {
  try {
    // 1. Check bot info
    console.log('1️⃣ Checking bot identity...');
    const botResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const botInfo = await botResponse.json();
    console.log(`├─ Bot Username: @${botInfo.result?.username || 'unknown'}`);
    console.log(`├─ Bot ID: ${botInfo.result?.id || 'unknown'}`);
    console.log(`└─ Bot Name: ${botInfo.result?.first_name || 'unknown'}`);
    console.log('');

    // 2. Check webhook info
    console.log('2️⃣ Checking webhook configuration...');
    const webhookResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const webhookInfo = await webhookResponse.json();
    console.log(`├─ Webhook URL: ${webhookInfo.result?.url || 'not set'}`);
    console.log(`├─ Pending Updates: ${webhookInfo.result?.pending_update_count || 0}`);
    console.log(`├─ Last Error: ${webhookInfo.result?.last_error_message || 'none'}`);
    console.log(`└─ Error Date: ${webhookInfo.result?.last_error_date ? new Date(webhookInfo.result.last_error_date * 1000) : 'none'}`);
    console.log('');

    // 3. Send test ping with unique identifier
    console.log('3️⃣ Sending test ping with unique ID...');
    const testId = Math.random().toString(36).substring(2, 8);
    const testMessage = `/ping_debug_${testId}`;
    
    console.log(`├─ Test command: ${testMessage}`);
    console.log('├─ Sending to Telegram API...');
    
    const sendResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: testMessage
      })
    });
    
    const sendResult = await sendResponse.json();
    console.log(`├─ Send Status: ${sendResponse.ok ? '✅ Sent' : '❌ Failed'}`);
    console.log(`└─ Message ID: ${sendResult.result?.message_id || 'unknown'}`);
    console.log('');

    // 4. Instructions
    console.log('4️⃣ NEXT STEPS:');
    console.log('├─ Check your Telegram for the test message');
    console.log('├─ Count how many responses you get');
    console.log('├─ If you get multiple responses, there are multiple bots');
    console.log('├─ If you get one response, the spam is from cached commands');
    console.log('└─ Report back with the results');
    console.log('');

    console.log('⏰ Waiting 10 seconds for response observation...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('✅ Debug analysis complete');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugPongSpam();