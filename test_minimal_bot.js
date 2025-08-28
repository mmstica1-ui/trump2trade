import { Bot } from 'grammy';

const token = '7597128133:AAGtGl22gep4b3tfokrEPVOPgOcmdjSTLes';
const chatId = '540751833';

console.log('🧪 Testing minimal bot...');

const bot = new Bot(token);

// Add error handler
bot.catch((err) => {
  console.error('🚨 Bot error caught:', err);
});

// Simple ping command
bot.command('ping', (ctx) => {
  console.log('✅ PING received from:', ctx.from?.username);
  ctx.reply('🏓 pong - minimal bot working!');
});

// Simple help command using HTML (not Markdown)
bot.command('help', (ctx) => {
  console.log('✅ HELP received from:', ctx.from?.username);
  const helpMessage = `🤖 <b>Minimal Test Bot</b>

<b>Commands:</b>
/ping - Test connectivity
/help - This help message

✅ Bot is working correctly!`;
  
  ctx.reply(helpMessage, { parse_mode: 'HTML' });
});

// Start bot
console.log('🚀 Starting minimal bot...');
bot.start()
  .then((info) => {
    console.log(`✅ Minimal bot started successfully!`);
    console.log('Bot info:', JSON.stringify(info, null, 2));
    
    // Send test message
    bot.api.sendMessage(chatId, '🧪 Minimal bot started - testing commands...', { parse_mode: 'HTML' });
  })
  .catch((error) => {
    console.error('❌ Minimal bot failed to start:', error);
    console.error('Full error details:', JSON.stringify(error, null, 2));
  });

// Keep alive for 30 seconds then exit
setTimeout(() => {
  console.log('🛑 Test completed - stopping minimal bot');
  bot.stop();
}, 30000);