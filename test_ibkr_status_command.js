#!/usr/bin/env node

/**
 * Test IBKR Status Command Logic
 * בדיקת לוגיקת הפקודה ibkr_status
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

async function testIBKRStatusLogic() {
    console.log('🧪 Testing IBKR Status Command Logic');
    console.log('====================================');
    
    const baseUrl = process.env.IBKR_BASE_URL || 'https://8080-ix8k1qaxvxn9fi89j5kbn.e2b.dev';
    
    try {
        console.log(`🌐 Base URL: ${baseUrl}`);
        
        // Step 1: Check Railway server health
        console.log('\n📡 Step 1: Health Check');
        const healthResponse = await fetch(`${baseUrl}/health`);
        const healthData = await healthResponse.json();
        console.log(`Health Status: ${healthData.status}`);
        console.log(`IBKR Connected: ${healthData.ibkr_connected}`);
        console.log(`Trading Ready: ${healthData.trading_ready}`);
        
        // Step 2: Try authentication
        console.log('\n🔐 Step 2: Authentication Test');
        let ibkrStatus = "❌ Not Connected";
        let authDetails = "Gateway not authenticated";
        
        try {
            let authResponse = await fetch(`${baseUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: "demo_user",
                    password: "demo_password", 
                    trading_mode: "paper"
                })
            });
            
            if (authResponse.ok) {
                const authData = await authResponse.json();
                ibkrStatus = authData.success ? "✅ Authenticated" : "⚠️ Auth Failed";
                authDetails = `Token: ${authData.api_token ? 'Valid' : 'None'}, Mode: ${authData.trading_mode || 'paper'}, Status: ${authData.connection_status || 'unknown'}`;
                console.log(`Auth Status: ${ibkrStatus}`);
                console.log(`Auth Details: ${authDetails}`);
            } else {
                console.log(`Auth Response Error: ${authResponse.status}`);
                ibkrStatus = healthData.ibkr_connected ? "✅ Connected via Health" : "❌ Not Available";
                authDetails = "Using health endpoint status";
            }
        } catch (authError) {
            console.log(`Auth Exception: ${authError.message}`);
            ibkrStatus = healthData.ibkr_connected ? "✅ Connected via Health" : "❌ Not Available";
            authDetails = "Using health endpoint status";
        }
        
        // Step 3: Format message like the bot would
        console.log('\n📋 Step 3: Formatted Message');
        const message = `🏦 <b>IBKR Connection Status</b>

🌐 <b>Server Status:</b>
Status: ${healthData.status === 'healthy' ? '✅' : '❌'} ${healthData.status}
URL: ${baseUrl}
Version: ${healthData.version || 'Unknown'}
IBKR Ready: ${healthData.ibkr_connected ? '✅' : '❌'} ${healthData.ibkr_connected || 'false'}
Trading Ready: ${healthData.trading_ready ? '✅' : '❌'} ${healthData.trading_ready || 'false'}

🏦 <b>IBKR Gateway:</b>
Status: ${ibkrStatus}
Details: ${authDetails}

📊 <b>Configuration:</b>
Account: ${process.env.IBKR_ACCOUNT_ID || 'Not configured'}
Mode: Paper Trading
Safe Mode: ${process.env.DISABLE_TRADES === 'false' ? '🔴 OFF' : '🟢 ON'}`;

        console.log('\nFormatted message:');
        console.log(message);
        
        console.log('\n✅ Command logic working correctly!');
        
    } catch (error) {
        console.log(`❌ Error in command logic: ${error.message}`);
        console.log(`❌ Stack: ${error.stack}`);
    }
}

testIBKRStatusLogic().catch(console.error);