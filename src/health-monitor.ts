// Health Monitor - Auto-healing background system
import { ibkrAuth } from './ibkr-auth-fix.js';
import { sendText } from './tg.js';

export class HealthMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private checkInterval = 2 * 60 * 1000; // Check every 2 minutes
  private lastHealthReport = 0;

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔧 Health Monitor started - Auto-fixing system issues');
    
    this.intervalId = setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);
    
    // Immediate first check
    this.performHealthCheck();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🔧 Health Monitor stopped');
  }

  private async performHealthCheck() {
    try {
      const issues: string[] = [];
      const fixes: string[] = [];

      // 1. Check IBKR Authentication
      const ibkrHealthy = await this.checkIBKRHealth();
      if (!ibkrHealthy.healthy) {
        issues.push('IBKR Authentication');
        const fixed = await this.fixIBKRAuth();
        if (fixed) {
          fixes.push('IBKR Authentication restored');
        }
      }

      // 2. Check Account Data
      const accountHealthy = await this.checkAccountHealth();
      if (!accountHealthy.healthy) {
        issues.push('Account Data Access');
        const fixed = await this.fixAccountAccess();
        if (fixed) {
          fixes.push('Account data access restored');
        }
      }

      // 3. Check Server Response Time
      const serverHealthy = await this.checkServerResponse();
      if (!serverHealthy.healthy) {
        issues.push('Server Response Slow');
      }

      // 4. Report if needed (every 30 minutes or if issues found)
      const shouldReport = issues.length > 0 || (Date.now() - this.lastHealthReport > 30 * 60 * 1000);
      
      if (shouldReport) {
        await this.sendHealthReport(issues, fixes);
        this.lastHealthReport = Date.now();
      }

      if (fixes.length > 0) {
        console.log(`🔧 Auto-fixed: ${fixes.join(', ')}`);
      }

    } catch (error) {
      console.error('Health Monitor error:', error);
    }
  }

  private async checkIBKRHealth(): Promise<{healthy: boolean, details: any}> {
    try {
      const status = await fetch(`${process.env.IBKR_BASE_URL}/v1/api/iserver/auth/status`);
      const data = await status.json();
      
      return {
        healthy: data.authenticated === true && data.connected === true,
        details: data
      };
    } catch (error) {
      return { healthy: false, details: { error: (error as Error).message || 'Unknown error' } };
    }
  }

  private async checkAccountHealth(): Promise<{healthy: boolean, details: any}> {
    try {
      const accountData = await ibkrAuth.getAccountData();
      const expectedAccount = process.env.IBKR_ACCOUNT_ID || 'DU7428350';
      
      return {
        healthy: accountData.accounts && accountData.accounts.includes(expectedAccount),
        details: accountData
      };
    } catch (error) {
      return { healthy: false, details: { error: (error as Error).message || 'Unknown error' } };
    }
  }

  private async checkServerResponse(): Promise<{healthy: boolean, responseTime: number}> {
    const start = Date.now();
    try {
      await fetch(`${process.env.IBKR_BASE_URL}/v1/api/iserver/auth/status`);
      const responseTime = Date.now() - start;
      
      return {
        healthy: responseTime < 5000, // Less than 5 seconds
        responseTime
      };
    } catch (error) {
      return { healthy: false, responseTime: Date.now() - start };
    }
  }

  private async fixIBKRAuth(): Promise<boolean> {
    try {
      console.log('🔧 Attempting to fix IBKR authentication...');
      await ibkrAuth.ensureAuthenticated();
      return true;
    } catch (error) {
      console.error('❌ Failed to fix IBKR auth:', error);
      return false;
    }
  }

  private async fixAccountAccess(): Promise<boolean> {
    try {
      console.log('🔧 Attempting to fix account access...');
      // Force re-authentication
      await ibkrAuth.ensureAuthenticated();
      
      // Verify access
      const accountData = await ibkrAuth.getAccountData();
      return accountData.accounts && accountData.accounts.length > 0;
    } catch (error) {
      console.error('❌ Failed to fix account access:', error);
      return false;
    }
  }

  private async sendHealthReport(issues: string[], fixes: string[]) {
    try {
      let message = '🏥 <b>System Health Report</b>\n\n';
      
      if (issues.length === 0) {
        message += '✅ <b>All Systems Operational</b>\n';
        message += '├─ IBKR Authentication: OK\n';
        message += '├─ Account Access: OK\n';
        message += '├─ Server Response: OK\n';
        message += '└─ Auto-Monitor: Active\n\n';
        message += '🤖 <b>Background monitoring active</b>\n';
        message += 'System checking every 2 minutes for issues.';
      } else {
        message += '⚠️ <b>Issues Detected & Auto-Fixed:</b>\n\n';
        
        if (fixes.length > 0) {
          message += '🔧 <b>Auto-Fixed:</b>\n';
          fixes.forEach(fix => {
            message += `✅ ${fix}\n`;
          });
          message += '\n';
        }
        
        if (issues.length > fixes.length) {
          message += '❌ <b>Still Need Attention:</b>\n';
          const unfixed = issues.filter((_, i) => !fixes[i]);
          unfixed.forEach(issue => {
            message += `• ${issue}\n`;
          });
        }
        
        message += '\n🤖 <b>Auto-Monitor Active</b>\n';
        message += 'Continuously fixing system issues automatically.';
      }
      
      await sendText(message);
      
    } catch (error) {
      console.error('Failed to send health report:', error);
    }
  }
}

// Global instance
export const healthMonitor = new HealthMonitor();