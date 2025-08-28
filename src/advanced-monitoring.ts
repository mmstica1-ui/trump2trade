// Advanced Monitoring System - Enhanced Bot Reliability
import { sendText } from './tg.js';
import axios from 'axios';

export class AdvancedMonitoring {
  private intervalId: NodeJS.Timeout | null = null;
  private alertIntervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  
  // Monitoring intervals
  private readonly HEALTH_CHECK_INTERVAL = 30 * 1000; // Every 30 seconds
  private readonly ALERT_INTERVAL = 5 * 60 * 1000; // Alert every 5 minutes if issues persist
  private readonly CRITICAL_ALERT_INTERVAL = 60 * 1000; // Critical alerts every minute
  
  // Status tracking
  private lastSuccessfulCommand = Date.now();
  private lastWebhookResponse = Date.now();
  private lastTelegramMessage = Date.now();
  private consecutiveFailures = 0;
  private criticalIssues: string[] = [];
  private lastHealthAlert = 0;
  
  // Trump post specific tracking
  private lastTrumpPost = Date.now();
  private lastTrumpPostUrl = '';
  private missedPosts: Array<{timestamp: number; reason: string; details: any}> = [];
  
  // Health thresholds
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly COMMAND_TIMEOUT = 2 * 60 * 1000; // 2 minutes without command response
  private readonly WEBHOOK_TIMEOUT = 5 * 60 * 1000; // 5 minutes without webhook activity
  private readonly MESSAGE_TIMEOUT = 10 * 60 * 1000; // 10 minutes without successful message

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔍 Advanced Monitoring System started - Enhanced reliability checks every 30 seconds');
    
    // Main health check loop
    this.intervalId = setInterval(() => {
      this.performComprehensiveHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
    
    // Alert system loop
    this.alertIntervalId = setInterval(() => {
      this.checkForPersistentIssues();
    }, this.ALERT_INTERVAL);
    
    // Immediate first check
    this.performComprehensiveHealthCheck();
    
    // Send startup notification
    this.sendStartupNotification();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.alertIntervalId) {
      clearInterval(this.alertIntervalId);
      this.alertIntervalId = null;
    }
    this.isRunning = false;
    console.log('🔍 Advanced Monitoring System stopped');
  }

  // Update status when successful operations occur
  updateCommandSuccess() {
    this.lastSuccessfulCommand = Date.now();
    this.consecutiveFailures = 0;
    this.criticalIssues = this.criticalIssues.filter(issue => !issue.includes('Command'));
  }

  updateWebhookSuccess() {
    this.lastWebhookResponse = Date.now();
    this.consecutiveFailures = 0;
    this.criticalIssues = this.criticalIssues.filter(issue => !issue.includes('Webhook'));
  }

  updateMessageSuccess() {
    this.lastTelegramMessage = Date.now();
    this.consecutiveFailures = 0;
    this.criticalIssues = this.criticalIssues.filter(issue => !issue.includes('Telegram'));
  }

  // Special tracking for Trump posts to ensure none are missed
  updateTrumpPostProcessed(postUrl: string) {
    this.lastTrumpPost = Date.now();
    this.lastTrumpPostUrl = postUrl;
    console.log(`📊 Trump post processed: ${postUrl} at ${new Date().toLocaleString('he-IL')}`);
  }

  // Track missed posts (for alerting)
  reportMissedPost(reason: string) {
    this.missedPosts.push({
      timestamp: Date.now(),
      reason,
      details: this.getMonitoringStatus()
    });
    
    // Keep only last 10 missed posts
    if (this.missedPosts.length > 10) {
      this.missedPosts = this.missedPosts.slice(-10);
    }
    
    console.error(`🚨 MISSED POST: ${reason}`);
    this.sendMissedPostAlert(reason);
  }

  private async performComprehensiveHealthCheck() {
    try {
      const now = Date.now();
      const issues: string[] = [];
      const warnings: string[] = [];

      // 1. Check bot responsiveness
      const commandAge = now - this.lastSuccessfulCommand;
      if (commandAge > this.COMMAND_TIMEOUT) {
        issues.push(`Command Response Timeout (${Math.round(commandAge/1000)}s)`);
        if (!this.criticalIssues.includes('Command Timeout')) {
          this.criticalIssues.push('Command Timeout');
        }
      }

      // 2. Check webhook activity
      const webhookAge = now - this.lastWebhookResponse;
      if (webhookAge > this.WEBHOOK_TIMEOUT) {
        issues.push(`Webhook Silent (${Math.round(webhookAge/1000)}s)`);
        if (!this.criticalIssues.includes('Webhook Silent')) {
          this.criticalIssues.push('Webhook Silent');
        }
      }

      // 3. Check Telegram message delivery
      const messageAge = now - this.lastTelegramMessage;
      if (messageAge > this.MESSAGE_TIMEOUT) {
        issues.push(`Telegram Not Sending (${Math.round(messageAge/1000)}s)`);
        if (!this.criticalIssues.includes('Telegram Not Sending')) {
          this.criticalIssues.push('Telegram Not Sending');
        }
      }

      // 4. Test bot ping response
      const pingTest = await this.testBotPing();
      if (!pingTest.success) {
        issues.push('Bot Ping Failed');
        this.consecutiveFailures++;
        if (!this.criticalIssues.includes('Bot Ping Failed')) {
          this.criticalIssues.push('Bot Ping Failed');
        }
      } else {
        this.updateCommandSuccess();
      }

      // 5. Check Telegram webhook status
      const webhookStatus = await this.checkTelegramWebhook();
      if (!webhookStatus.healthy) {
        issues.push(`Webhook Error: ${webhookStatus.error}`);
        if (!this.criticalIssues.includes('Webhook Error')) {
          this.criticalIssues.push('Webhook Error');
        }
      }

      // 6. Check IBKR server health
      const ibkrStatus = await this.checkIBKRServer();
      if (!ibkrStatus.healthy) {
        warnings.push(`IBKR Server Issue: ${ibkrStatus.error}`);
      }

      // 7. Check server endpoint health
      const serverStatus = await this.checkServerEndpoints();
      if (!serverStatus.healthy) {
        issues.push(`Server Endpoint Error: ${serverStatus.error}`);
      }

      // Handle issues
      if (issues.length > 0) {
        console.log(`🚨 Health Check Issues: ${issues.join(', ')}`);
        
        // Try auto-fix for critical issues
        if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
          await this.attemptAutoFix();
        }
        
        // Send immediate alert for critical issues
        if (issues.some(issue => 
          issue.includes('Bot Ping Failed') || 
          issue.includes('Webhook Error') ||
          issue.includes('Telegram Not Sending')
        )) {
          await this.sendCriticalAlert(issues);
        }
      } else {
        this.consecutiveFailures = 0;
        console.log('✅ All health checks passed');
      }

      if (warnings.length > 0) {
        console.log(`⚠️  Health Check Warnings: ${warnings.join(', ')}`);
      }

    } catch (error) {
      console.error('❌ Health check system error:', error);
      this.consecutiveFailures++;
    }
  }

  private async testBotPing(): Promise<{success: boolean, responseTime?: number}> {
    const start = Date.now();
    try {
      const baseUrl = process.env.APP_URL || 'https://8080-irhizl816o5wh84wzp5re.e2b.dev';
      const response = await axios.post(`${baseUrl}/webhook/telegram`, {
        update_id: Date.now(),
        message: {
          message_id: Date.now(),
          chat: { id: parseInt(process.env.TELEGRAM_CHAT_ID || '540751833') },
          from: { username: 'health_monitor' },
          text: '/ping'
        }
      }, { timeout: 10000 });

      const responseTime = Date.now() - start;
      
      if (response.status === 200) {
        this.updateWebhookSuccess();
        return { success: true, responseTime };
      } else {
        return { success: false };
      }
    } catch (error) {
      return { success: false };
    }
  }

  private async checkTelegramWebhook(): Promise<{healthy: boolean, error?: string}> {
    try {
      const response = await axios.get(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`,
        { timeout: 10000 }
      );

      if (response.data.ok) {
        const webhook = response.data.result;
        
        // Check for errors
        if (webhook.last_error_date) {
          const errorAge = Date.now()/1000 - webhook.last_error_date;
          if (errorAge < 300) { // Error within last 5 minutes
            return {
              healthy: false,
              error: webhook.last_error_message || 'Unknown webhook error'
            };
          }
        }
        
        // Check if webhook is set correctly
        if (!webhook.url || !webhook.url.includes('webhook/telegram')) {
          return {
            healthy: false,
            error: 'Webhook URL not set correctly'
          };
        }
        
        return { healthy: true };
      } else {
        return { healthy: false, error: 'Failed to get webhook info' };
      }
    } catch (error) {
      return { 
        healthy: false, 
        error: `Telegram API error: ${(error as Error).message}` 
      };
    }
  }

  private async checkIBKRServer(): Promise<{healthy: boolean, error?: string}> {
    try {
      const response = await axios.get(
        `${process.env.IBKR_BASE_URL}/health`,
        { timeout: 5000 }
      );

      if (response.status === 200 && response.data.status) {
        return { healthy: true };
      } else {
        return { healthy: false, error: 'IBKR server unhealthy' };
      }
    } catch (error) {
      return { 
        healthy: false, 
        error: `IBKR server error: ${(error as Error).message}` 
      };
    }
  }

  private async checkServerEndpoints(): Promise<{healthy: boolean, error?: string}> {
    try {
      const baseUrl = process.env.APP_URL || 'https://8080-irhizl816o5wh84wzp5re.e2b.dev';
      const response = await axios.get(
        `${baseUrl}/health`,
        { timeout: 5000 }
      );

      if (response.status === 200) {
        return { healthy: true };
      } else {
        return { healthy: false, error: 'Server endpoint unhealthy' };
      }
    } catch (error) {
      return { 
        healthy: false, 
        error: `Server endpoint error: ${(error as Error).message}` 
      };
    }
  }

  private async attemptAutoFix() {
    console.log('🔧 Attempting auto-fix for critical issues...');
    
    try {
      // Reset webhook
      const baseUrl = process.env.APP_URL || 'https://8080-irhizl816o5wh84wzp5re.e2b.dev';
      await axios.post(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`,
        `url=${baseUrl}/webhook/telegram`,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      console.log('✅ Webhook reset completed');
      
      // Clear any pending updates
      await axios.get(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getUpdates?offset=-1`
      );
      console.log('✅ Pending updates cleared');
      
      // Reset failure counter after successful auto-fix
      this.consecutiveFailures = 0;
      
      return true;
    } catch (error) {
      console.error('❌ Auto-fix failed:', error);
      return false;
    }
  }

  private async checkForPersistentIssues() {
    const now = Date.now();
    
    // Send alerts for persistent critical issues
    if (this.criticalIssues.length > 0) {
      if (now - this.lastHealthAlert > this.CRITICAL_ALERT_INTERVAL) {
        await this.sendPersistentIssueAlert();
        this.lastHealthAlert = now;
      }
    }
  }

  private async sendCriticalAlert(issues: string[]) {
    try {
      const message = `🚨 <b>CRITICAL ALERT - Bot Issues Detected</b>\n\n` +
        `⏰ <b>Time:</b> ${new Date().toLocaleString('he-IL')}\n\n` +
        `❌ <b>Issues Found:</b>\n${issues.map(issue => `• ${issue}`).join('\n')}\n\n` +
        `🔧 <b>Auto-Fix:</b> ${this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES ? 'Attempting...' : 'Monitoring'}\n\n` +
        `📊 <b>Consecutive Failures:</b> ${this.consecutiveFailures}/${this.MAX_CONSECUTIVE_FAILURES}\n\n` +
        `🎯 <b>Action Required:</b> Check bot immediately!`;

      await sendText(message);
      console.log('🚨 Critical alert sent to Telegram');
    } catch (error) {
      console.error('❌ Failed to send critical alert:', error);
    }
  }

  private async sendPersistentIssueAlert() {
    try {
      const message = `⚠️ <b>PERSISTENT ISSUES - Attention Required</b>\n\n` +
        `🔴 <b>Ongoing Issues:</b>\n${this.criticalIssues.map(issue => `• ${issue}`).join('\n')}\n\n` +
        `⏱️ <b>Duration:</b> Multiple monitoring cycles\n` +
        `🔧 <b>Auto-Fix Attempts:</b> ${this.consecutiveFailures} failures\n\n` +
        `📞 <b>Manual Intervention Needed</b>\n` +
        `Check system logs and restart if necessary.`;

      await sendText(message);
      console.log('⚠️ Persistent issue alert sent');
    } catch (error) {
      console.error('❌ Failed to send persistent issue alert:', error);
    }
  }

  private async sendStartupNotification() {
    try {
      const message = `🟢 <b>Advanced Monitoring System Online</b>\n\n` +
        `📊 <b>Monitoring Schedule:</b>\n` +
        `• Health Checks: Every 30 seconds\n` +
        `• Bot Ping Tests: Every cycle\n` +
        `• Webhook Status: Continuous\n` +
        `• Auto-Fix: After 3 failures\n\n` +
        `🎯 <b>What's Monitored:</b>\n` +
        `• Command responses\n` +
        `• Webhook activity\n` +
        `• Telegram delivery\n` +
        `• Server endpoints\n` +
        `• IBKR connectivity\n` +
        `• Trump post capture\n\n` +
        `✅ <b>System ready - Zero tolerance for downtime</b>`;

      await sendText(message);
      console.log('✅ Monitoring startup notification sent');
    } catch (error) {
      console.error('❌ Failed to send startup notification:', error);
    }
  }

  private async sendMissedPostAlert(reason: string) {
    try {
      const message = `🚨 <b>CRITICAL: TRUMP POST MISSED</b>\n\n` +
        `❌ <b>Reason:</b> ${reason}\n` +
        `⏰ <b>Time:</b> ${new Date().toLocaleString('he-IL')}\n\n` +
        `📊 <b>System Status:</b>\n` +
        `• Last Command: ${Math.round((Date.now() - this.lastSuccessfulCommand)/1000)}s ago\n` +
        `• Last Webhook: ${Math.round((Date.now() - this.lastWebhookResponse)/1000)}s ago\n` +
        `• Last Message: ${Math.round((Date.now() - this.lastTelegramMessage)/1000)}s ago\n` +
        `• Consecutive Failures: ${this.consecutiveFailures}\n\n` +
        `🔧 <b>IMMEDIATE ACTION REQUIRED</b>\n` +
        `Check all systems and restart if necessary!`;

      await sendText(message);
      console.log('🚨 Missed post alert sent to Telegram');
    } catch (error) {
      console.error('❌ Failed to send missed post alert:', error);
    }
  }

  // Public method to get current status
  getMonitoringStatus() {
    const now = Date.now();
    return {
      isRunning: this.isRunning,
      lastSuccessfulCommand: this.lastSuccessfulCommand,
      lastWebhookResponse: this.lastWebhookResponse,
      lastTelegramMessage: this.lastTelegramMessage,
      lastTrumpPost: this.lastTrumpPost,
      lastTrumpPostUrl: this.lastTrumpPostUrl,
      consecutiveFailures: this.consecutiveFailures,
      criticalIssues: this.criticalIssues,
      missedPosts: this.missedPosts,
      timeSinceLastCommand: now - this.lastSuccessfulCommand,
      timeSinceLastWebhook: now - this.lastWebhookResponse,
      timeSinceLastMessage: now - this.lastTelegramMessage,
      timeSinceLastTrumpPost: now - this.lastTrumpPost
    };
  }
}

// Global instance
export const advancedMonitor = new AdvancedMonitoring();