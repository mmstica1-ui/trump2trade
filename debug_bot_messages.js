#!/usr/bin/env node

/**
 * Debug Bot Message Reception
 * בדיקת קבלת הודעות הבוט
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || (await import('fs')).readFileSync('.env.production', 'utf8').match(/TELEGRAM_BOT_TOKEN=(.+)/)?.[1];

async function debugBotMessages() {
    console.log('🔍 Debugging Bot Message Reception');
    console.log('==================================');
    
    try {
        // Get latest updates
        console.log('📨 Getting latest updates...');
        const updates = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=5&offset=-5`);
        const updatesData = await updates.json();
        
        if (updatesData.ok && updatesData.result.length > 0) {
            console.log(`📥 Found ${updatesData.result.length} recent messages:`);
            
            updatesData.result.forEach((update, i) => {
                const msg = update.message;
                if (msg) {
                    console.log(`${i+1}. Message ID: ${msg.message_id}`);
                    console.log(`   From: ${msg.from?.first_name} (@${msg.from?.username})`);
                    console.log(`   Chat ID: ${msg.chat?.id}`);
                    console.log(`   Text: "${msg.text}"`);
                    console.log(`   Date: ${new Date(msg.date * 1000).toLocaleString()}`);
                    console.log('');
                }
            });
        } else {
            console.log('📭 No recent messages found');
        }
        
        // Send a test command simulation
        console.log('🧪 Simulating /ibkr_status command...');
        const testMessage = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: process.env.TELEGRAM_CHAT_ID || '540751833',
                text: `/ibkr_status`,
            })
        });
        
        const testResult = await testMessage.json();
        if (testResult.ok) {
            console.log(`✅ Test command sent, message ID: ${testResult.result.message_id}`);
            
            // Wait a bit and check for bot response
            console.log('⏳ Waiting for bot response...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const newUpdates = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${testResult.result.message_id}`);
            const newData = await newUpdates.json();
            
            if (newData.ok) {
                console.log(`📨 Bot processed ${newData.result.length} messages after test`);
                
                // Look for bot responses
                const botResponses = newData.result.filter(update => 
                    update.message?.from?.id === parseInt(BOT_TOKEN.split(':')[0])
                );
                
                if (botResponses.length > 0) {
                    console.log('🤖 Found bot responses:');
                    botResponses.forEach(response => {
                        console.log(`   Response: "${response.message.text?.substring(0, 100)}..."`);
                    });
                } else {
                    console.log('❌ No bot responses found - bot not processing commands');
                }
            }
        } else {
            console.log(`❌ Failed to send test: ${testResult.description}`);
        }
        
    } catch (error) {
        console.log(`💥 Error: ${error.message}`);
    }
}

debugBotMessages();