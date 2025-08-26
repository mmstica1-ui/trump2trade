import pino from 'pino';
import { sendText } from './tg.js';

const log = pino({ level: 'debug' });

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  connections: {
    telegram: boolean;
    synoptic: boolean;
    gemini: boolean;
  };
  lastPostProcessed?: Date;
  alertsSent24h: number;
  errors: Array<{
    timestamp: Date;
    error: string;
    stack?: string;
  }>;
}

class SystemMonitor {
  private startTime: number = Date.now();
  private lastPostTime?: Date;
  private alertsSent24h: number = 0;
  private recentErrors: Array<{ timestamp: Date; error: string; stack?: string }> = [];
  private connections = {
    telegram: false,
    synoptic: false, 
    gemini: false
  };
  
  // Admin notification settings
  private adminChatId: string;
  private lastCriticalAlert: number = 0;
  private readonly CRITICAL_ALERT_COOLDOWN = 10 * 60 * 1000; // 10 minutes

  constructor(adminChatId?: string) {
    this.adminChatId = adminChatId || process.env.TELEGRAM_CHAT_ID || '';
    this.setupGlobalErrorHandlers();
    this.startPeriodicChecks();
    log.info('System monitoring initialized');
  }

  private setupGlobalErrorHandlers(): void {
    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      log.fatal({ error: error.message, stack: error.stack }, 'Uncaught exception detected');
      this.recordError(`CRITICAL: Uncaught exception - ${error.message}`, error.stack);
      this.sendCriticalAlert(`🆘 CRITICAL CRASH: Uncaught exception\n\n${error.message}\n\nStack: ${error.stack?.substring(0, 500)}...`);
      process.exit(1);
    });

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      const errorMsg = `Unhandled rejection: ${reason}`;
      log.error({ reason, promise }, 'Unhandled promise rejection');
      this.recordError(errorMsg);
      this.sendWarningAlert(`⚠️ Unhandled Promise Rejection\n\n${reason}`);
    });

    // Memory warnings
    process.on('warning', (warning) => {
      if (warning.name === 'DeprecationWarning') return; // Skip deprecation warnings
      log.warn({ warning: warning.message, name: warning.name }, 'Process warning');
      this.recordError(`Warning: ${warning.name} - ${warning.message}`);
    });
  }

  private startPeriodicChecks(): void {
    // Health check every 2 minutes
    setInterval(() => {
      this.performHealthCheck();
    }, 2 * 60 * 1000);

    // Daily stats reset
    setInterval(() => {
      this.alertsSent24h = 0;
      this.cleanupOldErrors();
    }, 24 * 60 * 60 * 1000);

    // Memory monitoring every 5 minutes
    setInterval(() => {
      this.checkMemoryUsage();
    }, 5 * 60 * 1000);
  }

  public recordError(error: string, stack?: string): void {
    this.recentErrors.push({
      timestamp: new Date(),
      error,
      stack
    });

    // Keep only last 50 errors
    if (this.recentErrors.length > 50) {
      this.recentErrors = this.recentErrors.slice(-50);
    }
  }

  public setConnectionStatus(service: keyof typeof this.connections, status: boolean): void {
    const wasConnected = this.connections[service];
    this.connections[service] = status;
    
    if (wasConnected && !status) {
      this.sendWarningAlert(`🔌 Connection Lost: ${service.toUpperCase()}`);
      log.warn({ service }, 'Service connection lost');
    } else if (!wasConnected && status) {
      log.info({ service }, 'Service connection restored');
    }
  }

  public recordPostProcessed(): void {
    this.lastPostTime = new Date();
  }

  public recordAlertSent(): void {
    this.alertsSent24h++;
  }

  private async performHealthCheck(): Promise<SystemHealth> {
    const health = this.getSystemHealth();
    
    // Check for critical conditions
    if (health.status === 'critical') {
      await this.sendCriticalAlert(
        `🆘 SYSTEM CRITICAL\n\n` +
        `Memory: ${health.memory.percentage}%\n` +
        `Connections: ${Object.entries(health.connections).filter(([_, status]) => !status).map(([name]) => name).join(', ') || 'All OK'}\n` +
        `Recent Errors: ${health.errors.slice(-3).map(e => e.error).join(', ')}`
      );
    } else if (health.status === 'warning') {
      await this.sendWarningAlert(
        `⚠️ System Warning\n\n` +
        `Memory: ${health.memory.percentage}%\n` +
        `Last post: ${health.lastPostProcessed ? this.formatTimeDiff(health.lastPostProcessed) : 'Never'}`
      );
    }

    return health;
  }

  public getSystemHealth(): SystemHealth {
    const memUsage = process.memoryUsage();
    const memPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    // Determine status with more forgiving memory thresholds
    const recentCriticalErrors = this.recentErrors.filter(e => 
      Date.now() - e.timestamp.getTime() < 5 * 60 * 1000).length;
    
    if (memPercentage > 98 || recentCriticalErrors > 10) {
      status = 'critical';
    } else if (memPercentage > 85 || 
               !this.connections.telegram ||
               recentCriticalErrors > 3 ||
               (this.lastPostTime && Date.now() - this.lastPostTime.getTime() > 60 * 60 * 1000)) {
      status = 'warning';  
    }

    return {
      status,
      uptime: Date.now() - this.startTime,
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: Math.round(memPercentage)
      },
      connections: { ...this.connections },
      lastPostProcessed: this.lastPostTime,
      alertsSent24h: this.alertsSent24h,
      errors: this.recentErrors.slice(-10) // Last 10 errors
    };
  }

  private async checkMemoryUsage(): Promise<void> {
    const memUsage = process.memoryUsage();
    const memPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    // Aggressive memory management
    if (memPercentage > 80) {
      // Clear old errors first to free memory
      this.cleanupOldErrors();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        log.info('Forced garbage collection due to high memory usage');
        
        // Check memory again after GC
        const newMemUsage = process.memoryUsage();
        const newMemPercentage = (newMemUsage.heapUsed / newMemUsage.heapTotal) * 100;
        log.info(`Memory after GC: ${Math.round(newMemPercentage)}%`);
        
        // If still high after GC, it's a real problem
        if (newMemPercentage > 95) {
          await this.sendCriticalAlert(
            `🆘 CRITICAL MEMORY LEAK\n\n` +
            `Memory: ${Math.round(newMemPercentage)}% after GC\n` +
            `Heap Used: ${(newMemUsage.heapUsed / 1024 / 1024).toFixed(1)}MB\n` +
            `May require restart!`
          );
        }
      } else {
        // No GC available, send warning at lower threshold
        if (memPercentage > 90) {
          await this.sendWarningAlert(
            `🧠 High Memory Usage: ${Math.round(memPercentage)}%\n\n` +
            `Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB\n` +
            `Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(1)}MB\n` +
            `⚠️ GC not available - consider restart`
          );
        }
      }
    }
  }

  private cleanupOldErrors(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.recentErrors = this.recentErrors.filter(e => e.timestamp.getTime() > oneDayAgo);
  }

  private async sendCriticalAlert(message: string): Promise<void> {
    const now = Date.now();
    if (now - this.lastCriticalAlert < this.CRITICAL_ALERT_COOLDOWN) {
      return; // Prevent spam
    }
    
    this.lastCriticalAlert = now;
    
    try {
      const fullMessage = `🚨 TRUMP2TRADE ADMIN ALERT 🚨\n\n${message}\n\n⏰ ${new Date().toLocaleString('he-IL')}`;
      await sendText(fullMessage);
      log.info('Critical alert sent to admin');
    } catch (error) {
      log.error({ error }, 'Failed to send critical alert');
    }
  }

  public async sendWarningAlert(message: string): Promise<void> {
    try {
      const fullMessage = `⚠️ Trump2Trade Warning\n\n${message}\n\n⏰ ${new Date().toLocaleString('he-IL')}`;
      await sendText(fullMessage);
      log.info('Warning alert sent');
    } catch (error) {
      log.error({ error }, 'Failed to send warning alert');
    }
  }

  private formatTimeDiff(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffMins < 24 * 60) {
      return `${Math.floor(diffMins / 60)}h ago`;
    } else {
      return `${Math.floor(diffMins / (24 * 60))}d ago`;
    }
  }

  // Graceful shutdown handling
  public setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'] as const;
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        log.info({ signal }, 'Shutdown signal received');
        
        try {
          await this.sendWarningAlert(`🔄 System Restart\n\nReceived ${signal} - shutting down gracefully...`);
        } catch (error) {
          log.error({ error }, 'Failed to send shutdown alert');
        }
        
        process.exit(0);
      });
    });
  }
}

// Singleton instance
let monitor: SystemMonitor | null = null;

export function initializeMonitoring(adminChatId?: string): SystemMonitor {
  if (!monitor) {
    monitor = new SystemMonitor(adminChatId);
    monitor.setupGracefulShutdown();
  }
  return monitor;
}

export function getMonitor(): SystemMonitor {
  if (!monitor) {
    throw new Error('Monitor not initialized. Call initializeMonitoring() first.');
  }
  return monitor;
}

// Health check endpoint data
export function getHealthEndpointData(): SystemHealth {
  return monitor ? monitor.getSystemHealth() : {
    status: 'critical',
    uptime: 0,
    memory: { used: 0, total: 0, percentage: 0 },
    connections: { telegram: false, synoptic: false, gemini: false },
    alertsSent24h: 0,
    errors: []
  };
}