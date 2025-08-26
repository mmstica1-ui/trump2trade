#!/usr/bin/env node

/**
 * Test Gemini API Connection
 * Checks if Gemini API is working correctly
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🧪 TESTING GEMINI API CONNECTION');
console.log('=' .repeat(50));

async function testGeminiConnection() {
    try {
        // Check API key
        const apiKey = process.env.GOOGLE_API_KEY;
        console.log('🔑 API Key Status:');
        
        if (!apiKey) {
            console.log('   ❌ GOOGLE_API_KEY not found in environment');
            return false;
        }
        
        if (apiKey === 'your-google-api-key-here') {
            console.log('   ❌ GOOGLE_API_KEY is placeholder value');
            return false;
        }
        
        console.log(`   ✅ API Key present (${apiKey.length} characters)`);
        console.log(`   🔤 Key starts with: ${apiKey.substring(0, 10)}...`);
        
        // Initialize Gemini
        console.log('\n🤖 Initializing Gemini AI...');
        const genAI = new GoogleGenerativeAI(apiKey);
        
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-1.5-flash',
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 50
            }
        });
        
        console.log('   ✅ Gemini model initialized');
        
        // Test API call
        console.log('\n📡 Testing API call...');
        const testPrompt = 'Say "Hello" in JSON format: {"message": "Hello"}';
        
        const startTime = Date.now();
        const result = await model.generateContent(testPrompt);
        const endTime = Date.now();
        
        const response = result.response.text();
        console.log(`   ✅ API call successful (${endTime - startTime}ms)`);
        console.log(`   📝 Response: ${response}`);
        
        // Test with our actual analysis function
        console.log('\n🧠 Testing Trump post analysis...');
        
        const testPost = "China is playing games with America! Tariffs are coming!";
        const analysisStartTime = Date.now();
        
        // Import our analysis function
        const { analyzePost } = await import('./dist/llm.js');
        const analysis = await analyzePost(testPost);
        
        const analysisEndTime = Date.now();
        
        console.log(`   ✅ Analysis completed (${analysisEndTime - analysisStartTime}ms)`);
        console.log(`   📊 Summary: ${analysis.summary}`);
        console.log(`   🎯 Tickers: ${analysis.tickers.join(', ')}`);
        console.log(`   📈 Relevance: ${analysis.relevanceScore}/10`);
        
        // Update monitoring if possible
        try {
            const { getMonitor } = await import('./dist/monitoring.js');
            const monitor = getMonitor();
            monitor.setConnectionStatus('gemini', true);
            console.log('\n📊 Updated monitoring status to connected');
        } catch (error) {
            console.log(`\n⚠️ Could not update monitoring: ${error.message}`);
        }
        
        console.log('\n🎉 GEMINI CONNECTION TEST PASSED!');
        return true;
        
    } catch (error) {
        console.log(`\n❌ GEMINI CONNECTION FAILED:`);
        console.log(`   Error: ${error.message}`);
        
        if (error.message.includes('API_KEY_INVALID')) {
            console.log('   💡 Suggestion: Check if API key is valid in Google AI Studio');
        } else if (error.message.includes('quota')) {
            console.log('   💡 Suggestion: Check API quota limits in Google Cloud Console');
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
            console.log('   💡 Suggestion: Network connectivity issue, try again');
        }
        
        // Update monitoring if possible
        try {
            const { getMonitor } = await import('./dist/monitoring.js');
            const monitor = getMonitor();
            monitor.setConnectionStatus('gemini', false);
            console.log('\n📊 Updated monitoring status to disconnected');
        } catch (monitorError) {
            console.log(`\n⚠️ Could not update monitoring: ${monitorError.message}`);
        }
        
        return false;
    }
}

// Run the test
testGeminiConnection().then(success => {
    console.log(`\n🏁 Test completed: ${success ? 'SUCCESS' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
});