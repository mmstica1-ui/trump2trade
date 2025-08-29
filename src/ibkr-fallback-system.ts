import axios from 'axios';

interface ServerConfig {
  url: string;
  priority: number;
  name: string;
  active: boolean;
  lastHealthCheck?: Date;
  consecutiveFailures?: number;
}

export class IBKRFallbackSystem {
  private servers: ServerConfig[] = [
    {
      url: 'https://web-production-a020.up.railway.app',
      priority: 1,
      name: 'Railway IBKR Server',
      active: true,
      consecutiveFailures: 0
    }
  ];

  private currentServerIndex: number = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutes
  private readonly TIMEOUT_MS = 5000; // 5 seconds
  private readonly MAX_FAILURES = 3;

  constructor() {
    this.startHealthMonitoring();
  }

  public addFallbackServer(url: string, name: string, priority: number = 2): void {
    this.servers.push({
      url,
      priority,
      name,
      active: true,
      consecutiveFailures: 0
    });
    
    // Sort by priority
    this.servers.sort((a, b) => a.priority - b.priority);
    console.log(`🔄 Added fallback server: ${name} (${url}) with priority ${priority}`);
  }

  public getCurrentServer(): ServerConfig {
    return this.servers[this.currentServerIndex];
  }

  public async testRealConnection(): Promise<{ 
    success: boolean; 
    message: string; 
    data?: any; 
    connected?: boolean; 
    error?: string 
  }> {
    const server = this.getCurrentServer();
    
    try {
      console.log(`🔍 Testing connection to ${server.name} (${server.url})`);
      
      const response = await axios.get(`${server.url}/v1/api/iserver/auth/status`, {
        timeout: this.TIMEOUT_MS,
        headers: { 'Accept': 'application/json' }
      });

      if (response.status === 200 && response.data) {
        server.consecutiveFailures = 0;
        server.lastHealthCheck = new Date();
        
        return {
          success: true,
          message: `✅ Connected to ${server.name}`,
          data: response.data,
          connected: true
        };
      }

      throw new Error(`Invalid response: ${response.status}`);

    } catch (error: any) {
      server.consecutiveFailures = (server.consecutiveFailures || 0) + 1;
      
      // Check for specific error patterns that indicate server expiration
      const is502Error = error.response?.status === 502 || error.code === 'ECONNREFUSED';
      
      if (is502Error || server.consecutiveFailures >= this.MAX_FAILURES) {
        console.log(`❌ Server ${server.name} failed (${server.consecutiveFailures}/${this.MAX_FAILURES})`);
        return await this.switchToNextServer(error);
      }

      return {
        success: false,
        message: `⚠️ Connection issue with ${server.name}: ${error.message}`,
        connected: false,
        error: error.message
      };
    }
  }

  private async switchToNextServer(lastError: any): Promise<{ 
    success: boolean; 
    message: string; 
    error?: string 
  }> {
    const failedServer = this.servers[this.currentServerIndex];
    console.log(`🔄 Switching away from failed server: ${failedServer.name}`);

    // Try next servers
    for (let i = 0; i < this.servers.length; i++) {
      const nextIndex = (this.currentServerIndex + 1 + i) % this.servers.length;
      
      if (nextIndex === this.currentServerIndex) continue; // Skip current failed server
      
      const nextServer = this.servers[nextIndex];
      
      try {
        console.log(`🔄 Trying fallback server: ${nextServer.name}`);
        
        const response = await axios.get(`${nextServer.url}/v1/api/iserver/auth/status`, {
          timeout: this.TIMEOUT_MS
        });

        if (response.status === 200) {
          this.currentServerIndex = nextIndex;
          nextServer.consecutiveFailures = 0;
          
          // Update environment variable for the application
          process.env.IBKR_BASE_URL = nextServer.url;
          
          console.log(`✅ Successfully switched to ${nextServer.name}`);
          
          return {
            success: true,
            message: `🔄 Auto-switched to ${nextServer.name}. System recovered!`
          };
        }
      } catch (switchError: any) {
        console.log(`❌ Fallback ${nextServer.name} also failed: ${switchError.message}`);
        nextServer.consecutiveFailures = (nextServer.consecutiveFailures || 0) + 1;
      }
    }

    // All servers failed
    return {
      success: false,
      message: `❌ All IBKR servers unavailable. Last error: ${lastError.message}`,
      error: 'ALL_SERVERS_DOWN'
    };
  }

  public async getSystemHealth(): Promise<{
    currentServer: string;
    allServers: Array<{
      name: string;
      url: string;
      active: boolean;
      failures: number;
      lastCheck?: string;
    }>;
    overallStatus: 'healthy' | 'degraded' | 'critical';
  }> {
    const current = this.getCurrentServer();
    
    const allServers = this.servers.map(s => ({
      name: s.name,
      url: s.url,
      active: s.active,
      failures: s.consecutiveFailures || 0,
      lastCheck: s.lastHealthCheck?.toISOString()
    }));

    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (current.consecutiveFailures && current.consecutiveFailures > 0) {
      overallStatus = 'degraded';
    }
    
    const activeServers = this.servers.filter(s => s.active && (s.consecutiveFailures || 0) < this.MAX_FAILURES);
    if (activeServers.length === 0) {
      overallStatus = 'critical';
    }

    return {
      currentServer: `${current.name} (${current.url})`,
      allServers,
      overallStatus
    };
  }

  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        console.log('🏥 Running scheduled health check...');
        await this.testRealConnection();
      } catch (error) {
        console.error('❌ Health check failed:', error);
      }
    }, this.HEALTH_CHECK_INTERVAL);

    console.log(`🏥 Health monitoring started (every ${this.HEALTH_CHECK_INTERVAL/1000/60} minutes)`);
  }

  public stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('🏥 Health monitoring stopped');
    }
  }

  public getConnectionUrl(): string {
    return this.getCurrentServer().url;
  }
}

// Singleton instance
export const ibkrFallback = new IBKRFallbackSystem();

// Export for use in other modules
export default ibkrFallback;