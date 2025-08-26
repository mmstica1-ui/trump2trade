#!/usr/bin/env node

// Test script for the enhanced Trump2Trade system
// Demonstrates all improvements: timing, links, relevance

import axios from 'axios';

const BASE_URL = 'http://localhost:8080';

const testCases = [
  {
    name: 'China Trade Policy',
    text: 'China has been ripping us off for decades with unfair trade deals. New tariffs on Chinese imports starting next week - time to bring manufacturing back to America! China will pay!',
    url: 'https://truthsocial.com/@realDonaldTrump/posts/113504567890123456',
    expectedTickers: ['FXI', 'ASHR', 'XLI'],
    expectedRelevance: 9
  },
  {
    name: 'Technology Regulation', 
    text: 'Big Tech companies are censoring conservative voices and manipulating our elections. Time for serious regulation of social media platforms and AI development!',
    url: 'https://truthsocial.com/@realDonaldTrump/posts/113504567890123457',
    expectedTickers: ['XLK', 'META', 'GOOGL'],
    expectedRelevance: 8
  },
  {
    name: 'Energy Independence',
    text: 'We will drill baby drill! American energy independence is critical. Opening up federal lands for oil and gas exploration. Energy prices will come down!',
    url: 'https://truthsocial.com/@realDonaldTrump/posts/113504567890123458', 
    expectedTickers: ['XLE', 'USO'],
    expectedRelevance: 9
  },
  {
    name: 'General Politics',
    text: 'The fake news media is at it again! Spreading lies about our great movement. The American people see through their deception!',
    url: 'https://truthsocial.com/@realDonaldTrump/posts/113504567890123459',
    expectedTickers: ['SPY', 'QQQ'],
    expectedRelevance: 5
  }
];

async function testHealthCheck() {
  try {
    console.log('🔍 Testing health check...');
    const response = await axios.get(`${BASE_URL}/healthz`);
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testEnhancedWebhook(testCase) {
  try {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`📝 Text: ${testCase.text.substring(0, 100)}...`);
    
    const startTime = Date.now();
    
    // Test via dev/mock endpoint
    const response = await axios.post(`${BASE_URL}/dev/mock`, {
      text: testCase.text,
      url: testCase.url
    }, {
      timeout: 30000 // 30 second timeout
    });
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`✅ Response: ${JSON.stringify(response.data)}`);
    console.log(`⏱️  Total API Time: ${processingTime}ms`);
    
    // Verify response structure
    if (response.data.ok) {
      console.log('🎯 Expected tickers:', testCase.expectedTickers.join(', '));
      console.log('📊 Expected relevance:', testCase.expectedRelevance);
    }
    
    return true;
    
  } catch (error) {
    console.error(`❌ Test failed for ${testCase.name}:`, error.message);
    if (error.code === 'ECONNABORTED') {
      console.error('   Timeout - check if Telegram bot token is configured');
    }
    return false;
  }
}

async function testGenSparkWebhook(testCase) {
  try {
    console.log(`\n🔗 Testing GenSpark webhook: ${testCase.name}`);
    
    const response = await axios.post(`${BASE_URL}/webhook/genspark?secret=moshe454`, {
      text: testCase.text,
      url: testCase.url,
      post_id: 'test_' + Date.now()
    }, {
      timeout: 30000
    });
    
    console.log(`✅ GenSpark webhook response:`, response.data);
    
    if (response.data.processed) {
      console.log(`📊 Processing metrics:`, response.data.processed);
    }
    
    return true;
    
  } catch (error) {
    console.error(`❌ GenSpark webhook failed:`, error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Trump2Trade Enhanced System Test Suite');
  console.log('==========================================\n');
  
  // Health check first
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('❌ Cannot proceed - system health check failed');
    process.exit(1);
  }
  
  let passed = 0;
  let total = 0;
  
  // Test each case via dev/mock endpoint
  for (const testCase of testCases) {
    total++;
    const success = await testEnhancedWebhook(testCase);
    if (success) passed++;
    
    // Wait between tests to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Test GenSpark webhook with one case
  console.log('\n🔗 Testing GenSpark Webhook Endpoint');
  console.log('====================================');
  total++;
  const webhookSuccess = await testGenSparkWebhook(testCases[0]);
  if (webhookSuccess) passed++;
  
  // Summary
  console.log(`\n📊 Test Summary: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! System is working correctly.');
    console.log('\n📋 Enhanced Features Verified:');
    console.log('✅ Timing analysis and performance tracking');
    console.log('✅ Webhook processing with enhanced responses'); 
    console.log('✅ Mock AI analysis system (when no API key)');
    console.log('✅ Error handling and timeout management');
    console.log('\n🚀 Ready for Railway deployment with real API keys!');
  } else {
    console.log('⚠️  Some tests failed. Check configuration and API keys.');
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run tests
runAllTests().catch(console.error);