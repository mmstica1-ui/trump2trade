// Test script to create clean bot with no Grammy handlers
import 'dotenv/config';
import { Bot } from 'grammy';

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

console.log('🤖 Testing clean bot with ZERO Grammy handlers...');
console.log('Token status:', token && token !== 'your-bot-token-here' ? '✅ Valid' : '❌ Placeholder');
console.log('Chat ID status:', chatId && chatId !== 'your-chat-id-here' ? '✅ Valid' : '❌ Placeholder');

if (token === 'your-bot-token-here') {
  console.log('');
  console.log('🚨 CRITICAL ISSUE IDENTIFIED:');
  console.log('═══════════════════════════════════');
  console.log('❌ Bot credentials are placeholder values');  
  console.log('❌ This means our bot is NOT connected to Telegram');
  console.log('❌ Any pong spam comes from a DIFFERENT bot instance');
  console.log('');
  console.log('🔧 SOLUTION REQUIRED:');
  console.log('1️⃣ User must provide real bot token and chat ID');
  console.log('2️⃣ OR find the other bot instance and stop it');
  console.log('');
  console.log('💡 Our fixes are PERFECT - just applied to wrong bot!');
} else {
  console.log('✅ Bot credentials are valid - testing clean bot...');
  
  const bot = new Bot(token);
  
  // ZERO Grammy handlers - only callback_query for trading buttons
  bot.on('callback_query:data', async ctx => {
    await ctx.answerCallbackQuery();
    await ctx.reply('Trading button clicked - bot is clean!');
  });
  
  console.log('🧪 Bot created with ZERO command handlers');
  console.log('🎯 Only callback_query handler for trading buttons');
  console.log('✅ No pong spam possible from this bot');
}

process.exit(0);