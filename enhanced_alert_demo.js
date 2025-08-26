#!/usr/bin/env node

/**
 * Enhanced Trump2Trade Alert Format Demo
 * Shows improved alert structure with better UX
 */

// Demo של פורמט התראה משופר
function createEnhancedAlert() {
    const demoPost = {
        content: "China is playing with fire! Massive tariffs coming their way. American companies will win BIG!",
        timestamp: new Date(),
        confidence: 94,
        urgency: "HIGH",
        marketStatus: "PRE_MARKET"
    };

    const enhancedAnalysis = {
        primaryImpact: [
            {
                symbol: "FXI",
                name: "China Large-Cap ETF", 
                impact: "negative",
                confidence: 95,
                expectedMove: "-4% to -7%",
                reasoning: "Direct exposure to Chinese market during trade tensions",
                sector: "China ETF"
            },
            {
                symbol: "ASHR", 
                name: "China A-Shares ETF",
                impact: "negative", 
                confidence: 88,
                expectedMove: "-3% to -6%",
                reasoning: "A-shares highly sensitive to US-China relations",
                sector: "China ETF"
            }
        ],
        secondaryImpact: [
            {
                symbol: "DXY",
                name: "US Dollar Index",
                impact: "positive",
                confidence: 82,
                expectedMove: "+1% to +2%", 
                reasoning: "USD strengthens during trade war rhetoric",
                sector: "Currency"
            },
            {
                symbol: "SPY",
                name: "S&P 500 ETF",
                impact: "negative",
                confidence: 71,
                expectedMove: "-0.5% to -1.5%",
                reasoning: "General market uncertainty from trade tensions", 
                sector: "US Market"
            }
        ],
        marketContext: {
            similarEvents: "Similar tweets in 2019 caused FXI to drop 6.2% within 24h",
            economicCalendar: "No major economic events today",
            technicalLevels: "FXI approaching key support at $24.50"
        }
    };

    return formatEnhancedAlert(demoPost, enhancedAnalysis);
}

function formatEnhancedAlert(post, analysis) {
    const urgencyEmoji = {
        "LOW": "🟡",
        "MEDIUM": "🟠", 
        "HIGH": "🔴",
        "CRITICAL": "🚨"
    }[post.urgency] || "🔵";

    const confidenceBar = "█".repeat(Math.floor(post.confidence / 10)) + "░".repeat(10 - Math.floor(post.confidence / 10));
    
    let alert = `${urgencyEmoji} TRUMP ALERT - ${post.urgency} IMPACT ${urgencyEmoji}\n\n`;
    
    // Post content with confidence
    alert += `💬 "${post.content.length > 100 ? post.content.substring(0, 100) + "..." : post.content}"\n\n`;
    
    alert += `📊 Confidence: ${post.confidence}% ${confidenceBar}\n`;
    alert += `⏰ Time: ${post.timestamp.toLocaleTimeString('he-IL')} Israel | 🕐 Market: ${post.marketStatus}\n\n`;

    // Primary impact (most important)
    alert += `🎯 PRIMARY TRADES:\n`;
    analysis.primaryImpact.forEach((ticker, index) => {
        const impactEmoji = ticker.impact === 'positive' ? '🟢📈' : '🔴📉';
        const actionButton = ticker.impact === 'positive' ? 'BUY' : 'SELL';
        
        alert += `${index + 1}. ${impactEmoji} ${ticker.symbol} - ${ticker.name}\n`;
        alert += `   💯 Confidence: ${ticker.confidence}% | 📊 Move: ${ticker.expectedMove}\n`;
        alert += `   💡 ${ticker.reasoning}\n\n`;
    });

    // Secondary impact (lower priority)
    if (analysis.secondaryImpact.length > 0) {
        alert += `📈 SECONDARY OPPORTUNITIES:\n`;
        analysis.secondaryImpact.forEach((ticker, index) => {
            const impactEmoji = ticker.impact === 'positive' ? '🟢📈' : '🔴📉';
            alert += `${index + 1}. ${impactEmoji} ${ticker.symbol} (${ticker.confidence}%) - ${ticker.expectedMove}\n`;
        });
        alert += `\n`;
    }

    // Market context
    if (analysis.marketContext.similarEvents) {
        alert += `📚 Context: ${analysis.marketContext.similarEvents}\n\n`;
    }

    // Action urgency
    const timeToAct = post.marketStatus === "PRE_MARKET" ? "MARKET OPEN" : "15 MIN";
    alert += `🔥 Urgency: ACT BEFORE ${timeToAct}\n`;
    alert += `💰 Risk Level: Monitor position sizing\n\n`;

    // Smart button ordering based on confidence and impact
    const sortedTickers = [...analysis.primaryImpact, ...analysis.secondaryImpact]
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 4); // Top 4 most confident trades

    alert += `Quick Actions:\n`;
    sortedTickers.forEach(ticker => {
        const action = ticker.impact === 'positive' ? 'BUY' : 'SELL';
        const emoji = ticker.impact === 'positive' ? '🟢' : '🔴';
        alert += `[${emoji} ${action} ${ticker.symbol}] `;
    });
    
    alert += `\n[📊 Full Analysis] [⚙️ Settings]`;

    return alert;
}

// Create and display the enhanced demo
console.log('🚀 ENHANCED TRUMP2TRADE ALERT FORMAT DEMO');
console.log('=' .repeat(60));
console.log();

const enhancedAlert = createEnhancedAlert();
console.log(enhancedAlert);

console.log();
console.log('=' .repeat(60));
console.log('💡 KEY IMPROVEMENTS:');
console.log('✅ Clear confidence levels for each trade');
console.log('✅ Expected move ranges for better risk management');  
console.log('✅ Primary vs Secondary impact categorization');
console.log('✅ Historical context for better decision making');
console.log('✅ Smart button ordering by confidence');
console.log('✅ Clear urgency and timing information');
console.log('✅ More professional and actionable format');