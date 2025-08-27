// Simple bot test to verify Grammy works
import { Bot } from 'grammy';

const token = '7597128133:AAGtGl22gep4b3tfokrEPVOPgOcmdjSTLes';
const bot = new Bot(token);

async function testBot() {
  console.log('Testing bot...');
  
  try {
    // First, delete any webhook
    console.log('Deleting webhook...');
    await bot.api.deleteWebhook();
    console.log('✅ Webhook deleted');
  } catch (e) {
    console.log('⚠️ Webhook delete failed (probably none existed):', e.message);
  }
  
  try {
    // Test getMe
    console.log('Testing getMe...');
    const me = await bot.api.getMe();
    console.log('✅ Bot info:', me);
  } catch (e) {
    console.log('❌ getMe failed:', e.message);
    return;
  }
  
  // Add a simple command
  bot.command('ping', (ctx) => ctx.reply('pong'));
  
  try {
    console.log('Starting bot...');
    await bot.start();
    console.log('✅ Bot started successfully');
    
    // Test sending a message
    const chatId = '540751833';
    await bot.api.sendMessage(chatId, '🧪 Bot test successful!');
    console.log('✅ Test message sent');
    
  } catch (e) {
    console.log('❌ Bot start failed:', e.message);
  }
  
  // Stop after 10 seconds
  setTimeout(() => {
    console.log('Stopping bot...');
    bot.stop();
    process.exit(0);
  }, 10000);
}

testBot().catch(console.error);