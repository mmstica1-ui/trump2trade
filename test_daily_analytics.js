#!/usr/bin/env node

/**
 * Test Daily Analytics System
 * Adds mock posts and generates a test report
 */

import { initializeDailyAnalytics } from './dist/daily-analytics.js';

console.log('🧪 TESTING DAILY ANALYTICS SYSTEM');
console.log('=' .repeat(50));

async function testAnalyticsSystem() {
    try {
        // Initialize the system
        console.log('1. Initializing daily analytics...');
        const analytics = initializeDailyAnalytics();
        
        // Add some mock posts to test the system
        console.log('2. Adding mock Trump posts...');
        
        analytics.addPost({
            originalPost: 'China is destroying our economy with unfair trade! Massive tariffs coming soon!',
            tickers: ['FXI', 'ASHR', 'SPY'],
            relevanceScore: 9,
            processingTimeMs: 2340,
            url: 'https://truthsocial.com/@realDonaldTrump/posts/test1'
        });
        
        analytics.addPost({
            originalPost: 'The Federal Reserve is making TERRIBLE decisions! Interest rates must come down NOW!',
            tickers: ['TLT', 'XLF', 'SPY'],
            relevanceScore: 8,
            processingTimeMs: 3120,
            url: 'https://truthsocial.com/@realDonaldTrump/posts/test2'
        });
        
        analytics.addPost({
            originalPost: 'Big Tech is censoring conservatives! Time to break up these monopolies!',
            tickers: ['META', 'GOOGL', 'QQQ'],
            relevanceScore: 7,
            processingTimeMs: 2890,
            url: 'https://truthsocial.com/@realDonaldTrump/posts/test3'
        });
        
        console.log('   ✅ Added 3 test posts');
        
        // Generate a test report
        console.log('3. Generating test daily report...');
        const today = new Date().toISOString().split('T')[0];
        const todayData = analytics.getAnalytics(today);
        
        if (todayData) {
            console.log(`   📊 Today's data: ${todayData.totalPosts} posts`);
            console.log(`   🎯 Avg relevance: ${todayData.avgRelevanceScore.toFixed(1)}/10`);
            console.log(`   ⚡ Avg processing: ${Math.round(todayData.avgProcessingTime)}ms`);
            console.log(`   💭 Presidential mood: ${todayData.presidentialMood}`);
            console.log(`   🥇 Top ticker: ${Object.entries(todayData.tickerFrequency).sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'}`);
            
            // Test the report generation
            console.log('4. Testing report generation...');
            await analytics.triggerDailyReport();
            
        } else {
            console.log('   ❌ No data found for today');
        }
        
        console.log('\n✅ DAILY ANALYTICS TEST COMPLETED SUCCESSFULLY!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testAnalyticsSystem().catch(console.error);