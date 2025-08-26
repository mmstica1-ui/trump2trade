import pino from 'pino';
import { sendText } from './tg.js';

const log = pino({ level: 'debug' });

// Daily analytics data structure
interface DailyPostData {
  id: string;
  timestamp: Date;
  originalPost: string;
  tickers: string[];
  relevanceScore: number;
  processingTimeMs: number;
  sentiment: 'aggressive' | 'confident' | 'defensive' | 'neutral';
  topics: string[];
  wordCount: number;
}

interface DailyAnalytics {
  date: string;
  totalPosts: number;
  avgProcessingTime: number;
  tickerFrequency: Record<string, number>;
  sentimentBreakdown: Record<string, number>;
  topicBreakdown: Record<string, number>;
  avgRelevanceScore: number;
  avgWordCount: number;
  postTiming: {
    morning: number;    // 6-12
    afternoon: number;  // 12-18
    evening: number;    // 18-23
    night: number;      // 23-6
  };
  presidentialMood: string;
  moodConfidence: number;
  posts: DailyPostData[];
}

class DailyAnalyticsManager {
  private dailyData: Map<string, DailyAnalytics> = new Map();
  private readonly STORAGE_PATH = '/tmp/trump2trade_daily_analytics.json';

  constructor() {
    this.loadFromStorage();
    this.scheduleEndOfDayReport();
  }

  // Add a new post to today's analytics
  public addPost(data: {
    originalPost: string;
    tickers: string[];
    relevanceScore: number;
    processingTimeMs: number;
    url?: string;
  }): void {
    const today = this.getTodayKey();
    let analytics = this.dailyData.get(today);
    
    if (!analytics) {
      analytics = this.initializeDayAnalytics(today);
      this.dailyData.set(today, analytics);
    }

    const postData: DailyPostData = {
      id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      originalPost: data.originalPost,
      tickers: data.tickers,
      relevanceScore: data.relevanceScore,
      processingTimeMs: data.processingTimeMs,
      sentiment: this.analyzeSentiment(data.originalPost),
      topics: this.extractTopics(data.originalPost),
      wordCount: data.originalPost.split(/\s+/).length
    };

    analytics.posts.push(postData);
    analytics.totalPosts++;
    
    // Update aggregated data
    this.updateAggregatedData(analytics, postData);
    this.saveToStorage();
    
    log.info({ postId: postData.id, today }, 'Added post to daily analytics');
  }

  private initializeDayAnalytics(date: string): DailyAnalytics {
    return {
      date,
      totalPosts: 0,
      avgProcessingTime: 0,
      tickerFrequency: {},
      sentimentBreakdown: { aggressive: 0, confident: 0, defensive: 0, neutral: 0 },
      topicBreakdown: {},
      avgRelevanceScore: 0,
      avgWordCount: 0,
      postTiming: { morning: 0, afternoon: 0, evening: 0, night: 0 },
      presidentialMood: 'neutral',
      moodConfidence: 0,
      posts: []
    };
  }

  private updateAggregatedData(analytics: DailyAnalytics, postData: DailyPostData): void {
    // Update processing time average
    analytics.avgProcessingTime = analytics.posts.reduce((sum, p) => sum + p.processingTimeMs, 0) / analytics.posts.length;
    
    // Update ticker frequency
    postData.tickers.forEach(ticker => {
      analytics.tickerFrequency[ticker] = (analytics.tickerFrequency[ticker] || 0) + 1;
    });
    
    // Update sentiment breakdown
    analytics.sentimentBreakdown[postData.sentiment]++;
    
    // Update topic breakdown
    postData.topics.forEach(topic => {
      analytics.topicBreakdown[topic] = (analytics.topicBreakdown[topic] || 0) + 1;
    });
    
    // Update averages
    analytics.avgRelevanceScore = analytics.posts.reduce((sum, p) => sum + p.relevanceScore, 0) / analytics.posts.length;
    analytics.avgWordCount = analytics.posts.reduce((sum, p) => sum + p.wordCount, 0) / analytics.posts.length;
    
    // Update post timing
    const hour = postData.timestamp.getHours();
    if (hour >= 6 && hour < 12) analytics.postTiming.morning++;
    else if (hour >= 12 && hour < 18) analytics.postTiming.afternoon++;
    else if (hour >= 18 && hour < 23) analytics.postTiming.evening++;
    else analytics.postTiming.night++;
    
    // Analyze presidential mood
    const moodAnalysis = this.analyzePresidentialMood(analytics.posts);
    analytics.presidentialMood = moodAnalysis.mood;
    analytics.moodConfidence = moodAnalysis.confidence;
  }

  private analyzeSentiment(text: string): 'aggressive' | 'confident' | 'defensive' | 'neutral' {
    const aggressive = /(\!{2,}|TERRIBLE|DISASTER|DESTROY|CRUSH|OBLITERATE|WAR|FIGHT|ATTACK)/gi;
    const confident = /(WINNING|GREAT|BEST|AMAZING|INCREDIBLE|HUGE|TREMENDOUS|PERFECT)/gi;
    const defensive = /(fake news|witch hunt|unfair|rigged|they say|some people|defend)/gi;
    
    const aggressiveCount = (text.match(aggressive) || []).length;
    const confidenCount = (text.match(confident) || []).length;
    const defensiveCount = (text.match(defensive) || []).length;
    
    if (aggressiveCount > confidenCount && aggressiveCount > defensiveCount) return 'aggressive';
    if (confidenCount > defensiveCount) return 'confident';
    if (defensiveCount > 0) return 'defensive';
    return 'neutral';
  }

  private extractTopics(text: string): string[] {
    const topics: string[] = [];
    const topicKeywords = {
      'China Trade': /china|chinese|tariff|trade.?war|xi.?jinping/gi,
      'Federal Reserve': /fed|federal.?reserve|interest.?rate|jerome.?powell|inflation/gi,
      'Immigration': /immigration|border|wall|mexico|migrant|deportation/gi,
      'Technology': /tech|artificial.?intelligence|social.?media|big.?tech|silicon.?valley/gi,
      'Energy': /energy|oil|gas|pipeline|drill|climate|green.?new.?deal/gi,
      'Healthcare': /healthcare|obamacare|medicare|medicaid|drug.?prices/gi,
      'Defense': /military|defense|nato|ukraine|israel|iran/gi,
      'Economy': /economy|jobs|unemployment|gdp|recession|inflation/gi,
      'Elections': /election|vote|ballot|democracy|campaign|rigged/gi,
      'Media': /fake.?news|media|cnn|msnbc|fox|press|journalist/gi
    };

    Object.entries(topicKeywords).forEach(([topic, regex]) => {
      if (regex.test(text)) {
        topics.push(topic);
      }
    });

    return topics.length > 0 ? topics : ['General'];
  }

  private analyzePresidentialMood(posts: DailyPostData[]): { mood: string; confidence: number } {
    if (posts.length === 0) return { mood: 'neutral', confidence: 0 };

    const sentimentScores = posts.map(post => {
      switch (post.sentiment) {
        case 'aggressive': return -2;
        case 'defensive': return -1;
        case 'neutral': return 0;
        case 'confident': return 2;
        default: return 0;
      }
    });

    const avgScore: number = sentimentScores.reduce((sum: number, score: number) => sum + score, 0) / sentimentScores.length;
    const confidence = Math.min(100, (posts.length * 10) + (Math.abs(avgScore) * 20));

    let mood: string;
    if (avgScore >= 1.5) mood = '😤 FIRED UP & ATTACKING';
    else if (avgScore >= 0.5) mood = '💪 CONFIDENT & ASSERTIVE';
    else if (avgScore >= -0.5) mood = '🤔 MEASURED & STRATEGIC';
    else if (avgScore >= -1.5) mood = '🛡️ DEFENSIVE & REACTIVE';
    else mood = '⚡ COMBATIVE & AGGRESSIVE';

    return { mood, confidence: Math.round(confidence) };
  }

  public async generateDailyReport(date?: string): Promise<void> {
    const targetDate = date || this.getTodayKey();
    const analytics = this.dailyData.get(targetDate);
    
    if (!analytics || analytics.totalPosts === 0) {
      await sendText(`📊 Daily Report - ${targetDate}\n\n🔇 No Trump posts detected today\n\n✅ System monitoring continues...`);
      return;
    }

    const report = this.formatDailyReport(analytics);
    await sendText(report);
    log.info({ date: targetDate, totalPosts: analytics.totalPosts }, 'Daily report sent');
  }

  private formatDailyReport(analytics: DailyAnalytics): string {
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
    report += `${timeEmoji[mostActiveTime[0] as keyof typeof timeEmoji]} Most Active: ${mostActiveTime[0]} (${mostActiveTime[1]} posts)\n\n`;

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

  private scheduleEndOfDayReport(): void {
    // Schedule daily report at 11:59 PM Israel time
    const scheduleNextReport = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 0, 0);
      
      const msUntilReport = tomorrow.getTime() - now.getTime();
      
      setTimeout(async () => {
        await this.generateDailyReport();
        scheduleNextReport(); // Schedule next day
      }, msUntilReport);
      
      log.info({ 
        nextReport: tomorrow.toISOString(),
        msUntilReport: Math.round(msUntilReport / 1000 / 60)
      }, 'Next daily report scheduled');
    };

    scheduleNextReport();
  }

  private getTodayKey(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  private loadFromStorage(): void {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.STORAGE_PATH)) {
        const data = JSON.parse(fs.readFileSync(this.STORAGE_PATH, 'utf8'));
        this.dailyData = new Map(Object.entries(data));
        log.info({ daysLoaded: this.dailyData.size }, 'Loaded daily analytics from storage');
      }
    } catch (error) {
      log.warn({ error }, 'Failed to load daily analytics from storage');
    }
  }

  private saveToStorage(): void {
    try {
      const fs = require('fs');
      const dataObject = Object.fromEntries(this.dailyData);
      fs.writeFileSync(this.STORAGE_PATH, JSON.stringify(dataObject, null, 2));
    } catch (error) {
      log.warn({ error }, 'Failed to save daily analytics to storage');
    }
  }

  // Public method to get analytics for specific date
  public getAnalytics(date?: string): DailyAnalytics | null {
    const targetDate = date || this.getTodayKey();
    return this.dailyData.get(targetDate) || null;
  }

  // Manual trigger for daily report (for testing or on-demand)
  public async triggerDailyReport(date?: string): Promise<void> {
    await this.generateDailyReport(date);
  }
}

// Singleton instance
let analyticsManager: DailyAnalyticsManager | null = null;

export function initializeDailyAnalytics(): DailyAnalyticsManager {
  if (!analyticsManager) {
    analyticsManager = new DailyAnalyticsManager();
  }
  return analyticsManager;
}

export function getDailyAnalytics(): DailyAnalyticsManager {
  if (!analyticsManager) {
    throw new Error('Daily analytics not initialized. Call initializeDailyAnalytics() first.');
  }
  return analyticsManager;
}

export { DailyAnalyticsManager, DailyAnalytics, DailyPostData };