#!/usr/bin/env node

/**
 * Test IBKR Commands Integration
 * בדיקת כל פקודות ה-IBKR עם השרת החדש
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const IBKR_BASE_URL = process.env.IBKR_BASE_URL || 'https://8080-ix8k1qaxvxn9fi89j5kbn.e2b.dev';
const ACCOUNT_ID = process.env.IBKR_ACCOUNT_ID || 'DU1234567';

async function testIBKRIntegration() {
    console.log('🧪 Testing IBKR Integration with New Server');
    console.log(`📡 Server URL: ${IBKR_BASE_URL}`);
    console.log(`🏦 Account ID: ${ACCOUNT_ID}\n`);
    
    const tests = [
        {
            name: 'Health Check',
            url: `${IBKR_BASE_URL}/health`,
            method: 'GET'
        },
        {
            name: 'Authentication',
            url: `${IBKR_BASE_URL}/auth/login`,
            method: 'POST',
            body: JSON.stringify({
                username: "demo_user",
                password: "demo_password", 
                trading_mode: "paper"
            }),
            headers: { 'Content-Type': 'application/json' }
        },
        {
            name: 'Account Info',
            url: `${IBKR_BASE_URL}/iserver/accounts`,
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        },
        {
            name: 'Positions',
            url: `${IBKR_BASE_URL}/iserver/account/${ACCOUNT_ID}/positions/0`,
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        },
        {
            name: 'Balance Summary',
            url: `${IBKR_BASE_URL}/iserver/account/${ACCOUNT_ID}/summary`,
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        }
    ];
    
    for (const test of tests) {
        try {
            console.log(`🔍 Testing ${test.name}...`);
            
            const options = {
                method: test.method,
                headers: test.headers || {}
            };
            
            if (test.body) {
                options.body = test.body;
            }
            
            const response = await fetch(test.url, options);
            const data = await response.text();
            
            if (response.ok) {
                console.log(`✅ ${test.name}: SUCCESS`);
                
                // Try to parse JSON and show relevant info
                try {
                    const json = JSON.parse(data);
                    if (test.name === 'Health Check') {
                        console.log(`   Status: ${json.status}, IBKR: ${json.ibkr_connected}, Trading: ${json.trading_ready}`);
                    } else if (test.name === 'Authentication') {
                        console.log(`   Success: ${json.success}, Token: ${json.api_token ? 'Valid' : 'None'}`);
                    } else if (test.name === 'Account Info') {
                        console.log(`   Accounts: ${Array.isArray(json) ? json.length : 'Unknown format'}`);
                    } else {
                        console.log(`   Response: ${JSON.stringify(json).substring(0, 100)}...`);
                    }
                } catch (e) {
                    console.log(`   Response: ${data.substring(0, 100)}...`);
                }
            } else {
                console.log(`❌ ${test.name}: FAILED (${response.status} ${response.statusText})`);
                console.log(`   Response: ${data.substring(0, 200)}...`);
            }
            console.log('');
        } catch (error) {
            console.log(`💥 ${test.name}: ERROR - ${error.message}\n`);
        }
    }
    
    console.log('🎯 Test Summary:');
    console.log('If Health Check and Authentication show SUCCESS, the integration is working!');
    console.log('Some endpoints may require authentication token - this is normal behavior.');
    console.log('\n🚀 Next steps:');
    console.log('1. Commit these fixes to git');
    console.log('2. Test via Telegram bot commands');
    console.log('3. Verify real trading capabilities');
}

// Run the test
testIBKRIntegration().catch(console.error);