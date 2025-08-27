#!/usr/bin/env node

/**
 * Send Test Message to Check IBKR Commands
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTestMessage() {
    const testMessage = `🧪 **IBKR Status Check** 🧪

השרת עובד מעולה! ✅
- Health: healthy
- IBKR Connected: true  
- Trading Ready: true
- Authentication: working

📋 **בדוק את הפקודות האלה:**
/ibkr_status - סטטוס IBKR
/ibkr_account - פרטי חשבון
/ibkr_positions - פוזיציות
/ibkr_balance - יתרה

אם הפקודות לא עובדות, אנא צרף screenshot של השגיאה! 📸`;

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: testMessage,
                parse_mode: 'Markdown'
            })
        });

        const result = await response.json();
        
        if (result.ok) {
            console.log(`✅ Message sent! ID: ${result.result.message_id}`);
        } else {
            console.log(`❌ Failed: ${result.description}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
}

sendTestMessage();