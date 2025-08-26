#!/usr/bin/env node

/**
 * Demo of Daily Analytics Report
 * Shows how the daily summary will look
 */

// Mock data for demonstration
const mockDailyAnalytics = {
  date: '2024-08-26',
  totalPosts: 7,
  avgProcessingTime: 2847,
  tickerFrequency: {
    'FXI': 4,
    'SPY': 3,
    'ASHR': 3,
    'XLI': 2,
    'DXY': 2,
    'TLT': 1,
    'QQQ': 1
  },
  sentimentBreakdown: {
    aggressive: 3,
    confident: 2,
    defensive: 1,
    neutral: 1
  },
  topicBreakdown: {
    'China Trade': 4,
    'Federal Reserve': 2,
    'Economy': 2,
    'Technology': 1,
    'Defense': 1
  },
  avgRelevanceScore: 7.8,
  avgWordCount: 156,
  postTiming: {
    morning: 2,     // 6-12
    afternoon: 3,   // 12-18
    evening: 2,     // 18-23
    night: 0        // 23-6
  },
  presidentialMood: '😤 FIRED UP & ATTACKING',
  moodConfidence: 87,
  posts: [
    {
      id: 'post_1',
      timestamp: new Date('2024-08-26T07:15:30Z'),
      originalPost: 'China is playing games with America! Massive tariffs are coming their way. American companies will benefit HUGE!',
      tickers: ['FXI', 'ASHR', 'SPY'],
      relevanceScore: 9,
      processingTimeMs: 3200,
      sentiment: 'aggressive',
      topics: ['China Trade'],
      wordCount: 142
    },
    {
      id: 'post_2', 
      timestamp: new Date('2024-08-26T14:22:15Z'),
      originalPost: 'The Federal Reserve is destroying our economy with their terrible interest rate policies. We need REAL leadership!',
      tickers: ['TLT', 'SPY', 'XLF'],
      relevanceScore: 8,
      processingTimeMs: 2890,
      sentiment: 'aggressive',
      topics: ['Federal Reserve', 'Economy'],
      wordCount: 178
    },
    {
      id: 'post_3',
      timestamp: new Date('2024-08-26T16:45:22Z'),
      originalPost: 'Manufacturing is BOOMING under my policies! American workers are winning like never before. The best is yet to come!',
      tickers: ['XLI', 'SPY'],
      relevanceScore: 7,
      processingTimeMs: 2654,
      sentiment: 'confident',
      topics: ['Economy'],
      wordCount: 145
    }
  ]
};

function formatDailyReport(analytics) {
    const date = new Date(analytics.date).toLocaleDateString('he-IL');
    const topTickers = Object.entries(analytics.tickerFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    const topTopics = Object.entries(analytics.topicBreakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    const mostActiveTime = Object.entries(analytics.postTiming)
      .sort(([,a], [,b]) => b - a)[0];

    const timeEmoji = {
      morning: '🌅',
      afternoon: '☀️', 
      evening: '🌆',
      night: '🌙'
    };

    let report = `📊 **TRUMP2TRADE DAILY REPORT**\n`;
    report += `📅 ${date} • ${analytics.totalPosts} Posts\n`;
    report += `${'='.repeat(40)}\n\n`;

    // Presidential Mood Analysis
    report += `🎯 **PRESIDENTIAL MOOD ANALYSIS**\n`;
    report += `${analytics.presidentialMood} (${analytics.moodConfidence}% confidence)\n\n`;

    // Core Stats
    report += `📈 **CORE STATISTICS**\n`;
    report += `📮 Total Posts: ${analytics.totalPosts}\n`;
    report += `⚡ Avg Processing: ${Math.round(analytics.avgProcessingTime)}ms\n`;
    report += `📊 Avg Relevance: ${analytics.avgRelevanceScore.toFixed(1)}/10\n`;
    report += `📝 Avg Word Count: ${Math.round(analytics.avgWordCount)} words\n`;
    report += `${timeEmoji[mostActiveTime[0]]} Most Active: ${mostActiveTime[0]} (${mostActiveTime[1]} posts)\n\n`;

    // Top Tickers
    if (topTickers.length > 0) {
      report += `🎯 **TOP AFFECTED TICKERS**\n`;
      topTickers.forEach(([ticker, count], index) => {
        const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
        report += `${medal} ${ticker}: ${count} mentions\n`;
      });
      report += `\n`;
    }

    // Sentiment Breakdown
    report += `💭 **SENTIMENT BREAKDOWN**\n`;
    const totalSentiments = Object.values(analytics.sentimentBreakdown).reduce((sum, count) => sum + count, 0);
    Object.entries(analytics.sentimentBreakdown).forEach(([sentiment, count]) => {
      if (count > 0) {
        const percentage = Math.round((count / totalSentiments) * 100);
        const emoji = {
          aggressive: '🔥',
          confident: '💪',
          defensive: '🛡️',
          neutral: '😐'
        }[sentiment];
        report += `${emoji} ${sentiment}: ${count} (${percentage}%)\n`;
      }
    });
    report += `\n`;

    // Top Topics
    if (topTopics.length > 0) {
      report += `📋 **TOP TOPICS DISCUSSED**\n`;
      topTopics.forEach(([topic, count]) => {
        report += `• ${topic}: ${count} posts\n`;
      });
      report += `\n`;
    }

    // Timing Analysis
    report += `⏰ **POSTING TIMELINE**\n`;
    report += `🌅 Morning (6-12): ${analytics.postTiming.morning} posts\n`;
    report += `☀️ Afternoon (12-18): ${analytics.postTiming.afternoon} posts\n`;
    report += `🌆 Evening (18-23): ${analytics.postTiming.evening} posts\n`;
    report += `🌙 Night (23-6): ${analytics.postTiming.night} posts\n\n`;

    // Market Impact Assessment
    report += `💰 **MARKET IMPACT ASSESSMENT**\n`;
    if (analytics.avgRelevanceScore >= 8) {
      report += `🚨 HIGH IMPACT DAY - Multiple significant announcements\n`;
    } else if (analytics.avgRelevanceScore >= 6) {
      report += `⚠️ MODERATE IMPACT - Some market-relevant content\n`;
    } else {
      report += `📝 LOW IMPACT - Mostly political/personal content\n`;
    }

    report += `\n📊 Ready for tomorrow's posts! Use /health to check system status.`;

    return report;
}

// Sample Posts Analysis
function showPostsBreakdown(posts) {
    console.log('\n📋 DETAILED POST ANALYSIS');
    console.log('─'.repeat(60));
    
    posts.forEach((post, index) => {
        const time = post.timestamp.toLocaleTimeString('he-IL');
        const sentimentEmoji = {
            aggressive: '🔥',
            confident: '💪', 
            defensive: '🛡️',
            neutral: '😐'
        }[post.sentiment];
        
        console.log(`\n${index + 1}. ${time} - ${sentimentEmoji} ${post.sentiment.toUpperCase()}`);
        console.log(`   📝 "${post.originalPost.substring(0, 80)}..."`);
        console.log(`   🎯 Relevance: ${post.relevanceScore}/10`);
        console.log(`   📊 Tickers: ${post.tickers.join(', ')}`);
        console.log(`   ⏱️ Processing: ${post.processingTimeMs}ms`);
        console.log(`   📋 Topics: ${post.topics.join(', ')}`);
    });
}

// Key Insights Analysis
function showKeyInsights(analytics) {
    console.log('\n💡 KEY INSIGHTS & TRENDS');
    console.log('─'.repeat(60));
    
    // Most mentioned ticker analysis
    const topTicker = Object.entries(analytics.tickerFrequency)
        .sort(([,a], [,b]) => b - a)[0];
    console.log(`🎯 Most Impacted: ${topTicker[0]} (${topTicker[1]} mentions)`);
    
    // Sentiment dominance
    const dominantSentiment = Object.entries(analytics.sentimentBreakdown)
        .sort(([,a], [,b]) => b - a)[0];
    console.log(`💭 Dominant Mood: ${dominantSentiment[0]} (${dominantSentiment[1]} posts)`);
    
    // Processing performance
    const avgProcessingSeconds = (analytics.avgProcessingTime / 1000).toFixed(1);
    console.log(`⚡ System Performance: ${avgProcessingSeconds}s average response time`);
    
    // Market relevance
    if (analytics.avgRelevanceScore >= 8) {
        console.log(`🚨 High Alert Day: Strong market-moving content (${analytics.avgRelevanceScore.toFixed(1)}/10)`);
    } else if (analytics.avgRelevanceScore >= 6) {
        console.log(`📊 Moderate Activity: Some trading opportunities (${analytics.avgRelevanceScore.toFixed(1)}/10)`);
    } else {
        console.log(`📝 Quiet Day: Limited market impact (${analytics.avgRelevanceScore.toFixed(1)}/10)`);
    }
    
    // Timing patterns
    const peakTime = Object.entries(analytics.postTiming)
        .sort(([,a], [,b]) => b - a)[0][0];
    console.log(`⏰ Peak Activity: ${peakTime} hours`);
}

// Demo execution
console.log('📊 TRUMP2TRADE DAILY ANALYTICS DEMO');
console.log('=' .repeat(60));

console.log('\n🎯 This is how your daily report will look:');
console.log('─'.repeat(60));

const report = formatDailyReport(mockDailyAnalytics);
console.log(report);

// Show detailed breakdown
showPostsBreakdown(mockDailyAnalytics.posts);
showKeyInsights(mockDailyAnalytics);

console.log('\n🚀 SYSTEM FEATURES:');
console.log('✅ Automatic daily reports at 11:59 PM Israel time');
console.log('✅ /daily command for immediate report');
console.log('✅ /analytics YYYY-MM-DD for historical data'); 
console.log('✅ Presidential mood analysis with confidence levels');
console.log('✅ Ticker frequency tracking and ranking');
console.log('✅ Sentiment analysis of all posts');
console.log('✅ Topic extraction and trending analysis');
console.log('✅ Performance metrics and timing patterns');
console.log('✅ Market impact assessment and insights');

console.log('\n🎯 The system will learn and improve over time!');