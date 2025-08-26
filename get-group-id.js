#!/usr/bin/env node

// כלי לקבלת Group Chat ID
import { Bot } from 'grammy';

const token = '7597128133:AAGtGl22gep4b3tfokrEPVOPgOcmdjSTLes';
const bot = new Bot(token);

console.log('🤖 מחכה להודעות בקבוצה...');
console.log('📝 שלח הודעה כלשהי בקבוצה עם הבוט, ואני אראה לך את ה-Chat ID');

bot.on('message', (ctx) => {
  const chat = ctx.chat;
  
  console.log('\n🎯 פרטי הצ\'אט שזוהה:');
  console.log(`📊 Chat ID: ${chat.id}`);
  console.log(`📝 Chat Type: ${chat.type}`);
  console.log(`👥 Chat Title: ${chat.title || 'N/A'}`);
  
  if (chat.type === 'group' || chat.type === 'supergroup') {
    console.log('\n✅ זו קבוצה! השתמש ב-Chat ID הזה:');
    console.log(`🔑 TELEGRAM_CHAT_ID=${chat.id}`);
    
    // שלח אישור לקבוצה
    ctx.reply(`✅ בוט Trump2Trade מחובר לקבוצה!\n📊 Chat ID: ${chat.id}\nעכשיו אני יכול לשלוח התראות כאן! 🚀`);
  } else if (chat.type === 'private') {
    console.log('⚠️ זה צ\'אט פרטי, לא קבוצה');
    ctx.reply('זה צ\'אט פרטי. אני צריך להיות בקבוצה כדי לקבל את ה-Group Chat ID.');
  }
});

bot.on('my_chat_member', (ctx) => {
  const chat = ctx.chat;
  console.log(`\n🔄 עדכון חברות בצ\'אט: ${chat.title || chat.id}`);
  console.log(`📊 Chat ID: ${chat.id}`);
  console.log(`👤 New Status: ${ctx.update.my_chat_member.new_chat_member.status}`);
});

// הפעלת הבוט
bot.start();

console.log('⏰ הבוט פועל... שלח הודעה בקבוצה כדי לקבל את ה-Chat ID');
console.log('🛑 לחץ Ctrl+C כדי לעצור');