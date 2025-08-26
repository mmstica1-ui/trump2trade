#!/usr/bin/env node

/**
 * Trump2Trade Analytics Dashboard Demo
 * Shows performance tracking and learning capabilities
 */

// Simulated historical data
const historicalAlerts = [
    {
        id: 'alert_001',
        date: '2024-08-20',
        post: 'China trade deal is dead!',
        predictions: [
            { symbol: 'FXI', predicted: -5.2, actual: -6.1, confidence: 94 },
            { symbol: 'DXY', predicted: +1.8, actual: +2.1, confidence: 87 }
        ],
        userActions: ['sold_fxi', 'bought_dxy'],
        avgAccuracy: 91.5,
        userProfit: +847
    },
    {
        id: 'alert_002', 
        date: '2024-08-18',
        post: 'America First! Manufacturing boom coming!',
        predictions: [
            { symbol: 'XLI', predicted: +3.1, actual: +2.8, confidence: 82 },
            { symbol: 'CAT', predicted: +4.2, actual: +1.9, confidence: 76 }
        ],
        userActions: ['bought_xli'],
        avgAccuracy: 74.3,
        userProfit: +312
    },
    {
        id: 'alert_003',
        date: '2024-08-15', 
        post: 'Federal Reserve is destroying America!',
        predictions: [
            { symbol: 'TLT', predicted: +2.5, actual: -0.8, confidence: 69 },
            { symbol: 'GLD', predicted: +1.8, actual: +3.2, confidence: 78 }
        ],
        userActions: ['ignored'],
        avgAccuracy: 45.2,
        userProfit: 0
    }
];

function generateAnalyticsDashboard() {
    console.log('📊 TRUMP2TRADE ANALYTICS DASHBOARD');
    console.log('=' .repeat(60));
    console.log();

    // Overall performance metrics
    const totalAlerts = historicalAlerts.length;
    const avgAccuracy = historicalAlerts.reduce((sum, alert) => sum + alert.avgAccuracy, 0) / totalAlerts;
    const totalProfit = historicalAlerts.reduce((sum, alert) => sum + alert.userProfit, 0);
    const winRate = historicalAlerts.filter(alert => alert.userProfit > 0).length / totalAlerts * 100;

    console.log('🎯 PERFORMANCE OVERVIEW (Last 30 Days)');
    console.log('─'.repeat(40));
    console.log(`📈 Total Alerts Sent: ${totalAlerts}`);
    console.log(`🎯 Average Accuracy: ${avgAccuracy.toFixed(1)}%`);
    console.log(`💰 Total P&L: $${totalProfit.toLocaleString()}`);
    console.log(`🏆 Win Rate: ${winRate.toFixed(1)}%`);
    console.log(`📊 Best Alert: alert_001 (91.5% accuracy, $847 profit)`);
    console.log();

    // Accuracy by confidence level
    console.log('🎯 ACCURACY BY CONFIDENCE LEVEL');
    console.log('─'.repeat(40));
    
    const confidenceRanges = {
        'High (80%+)': historicalAlerts.flatMap(a => a.predictions.filter(p => p.confidence >= 80)),
        'Medium (60-79%)': historicalAlerts.flatMap(a => a.predictions.filter(p => p.confidence >= 60 && p.confidence < 80)),
        'Low (<60%)': historicalAlerts.flatMap(a => a.predictions.filter(p => p.confidence < 60))
    };

    Object.entries(confidenceRanges).forEach(([range, predictions]) => {
        if (predictions.length > 0) {
            const accuracy = predictions.reduce((sum, p) => {
                const error = Math.abs(p.predicted - p.actual);
                const maxMove = Math.max(Math.abs(p.predicted), Math.abs(p.actual), 1);
                return sum + (1 - (error / maxMove)) * 100;
            }, 0) / predictions.length;
            
            console.log(`${range}: ${accuracy.toFixed(1)}% (${predictions.length} predictions)`);
        }
    });
    console.log();

    // Top performing tickers
    console.log('🏆 TOP PERFORMING TICKERS');
    console.log('─'.repeat(40));
    
    const tickerStats = {};
    historicalAlerts.forEach(alert => {
        alert.predictions.forEach(pred => {
            if (!tickerStats[pred.symbol]) {
                tickerStats[pred.symbol] = { 
                    predictions: [], 
                    avgAccuracy: 0, 
                    totalPredictions: 0 
                };
            }
            tickerStats[pred.symbol].predictions.push(pred);
            tickerStats[pred.symbol].totalPredictions++;
        });
    });

    // Calculate accuracy for each ticker
    Object.keys(tickerStats).forEach(symbol => {
        const predictions = tickerStats[symbol].predictions;
        const accuracy = predictions.reduce((sum, p) => {
            const error = Math.abs(p.predicted - p.actual);
            const maxMove = Math.max(Math.abs(p.predicted), Math.abs(p.actual), 1);
            return sum + (1 - (error / maxMove)) * 100;
        }, 0) / predictions.length;
        
        tickerStats[symbol].avgAccuracy = accuracy;
    });

    // Sort by accuracy and display top 5
    const sortedTickers = Object.entries(tickerStats)
        .sort(([,a], [,b]) => b.avgAccuracy - a.avgAccuracy)
        .slice(0, 5);

    sortedTickers.forEach(([symbol, stats], index) => {
        console.log(`${index + 1}. ${symbol}: ${stats.avgAccuracy.toFixed(1)}% accuracy (${stats.totalPredictions} predictions)`);
    });
    console.log();

    // Recent alerts analysis
    console.log('📋 RECENT ALERTS BREAKDOWN');
    console.log('─'.repeat(40));
    
    historicalAlerts.forEach((alert, index) => {
        console.log(`Alert #${alert.id} (${alert.date})`);
        console.log(`   Post: "${alert.post.substring(0, 50)}..."`);
        console.log(`   Accuracy: ${alert.avgAccuracy.toFixed(1)}%`);
        console.log(`   User Action: ${alert.userActions.join(', ')}`);
        console.log(`   P&L: $${alert.userProfit > 0 ? '+' : ''}${alert.userProfit}`);
        console.log();
    });

    // Improvement suggestions
    console.log('💡 SYSTEM IMPROVEMENT SUGGESTIONS');
    console.log('─'.repeat(40));
    
    if (avgAccuracy < 80) {
        console.log('🔍 Consider enhancing AI model - accuracy below 80%');
    }
    if (winRate < 70) {
        console.log('⚠️  Review risk management - win rate below 70%');
    }
    
    const lowConfidencePredictions = historicalAlerts
        .flatMap(a => a.predictions)
        .filter(p => p.confidence < 70).length;
        
    if (lowConfidencePredictions > 5) {
        console.log('🎯 Focus on higher confidence trades (70%+ confidence)');
    }
    
    console.log('✅ Continue monitoring China-related trades (highest accuracy)');
    console.log('📈 Consider adding more currency pairs (DXY performing well)');
    console.log();

    // Learning insights
    console.log('🧠 MACHINE LEARNING INSIGHTS');
    console.log('─'.repeat(40));
    console.log('📊 Trade War posts show 92% accuracy vs 78% for Fed posts');
    console.log('⏰ Morning alerts (6-9 AM) perform 15% better than afternoon');
    console.log('🎯 China ETFs most predictable (FXI, ASHR, MCHI)'); 
    console.log('💰 User profits highest when acting within 15 minutes');
    console.log('🔥 High urgency alerts justified - 23% better performance');
}

// Generate the dashboard
generateAnalyticsDashboard();