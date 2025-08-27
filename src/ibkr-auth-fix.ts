// IBKR Authentication Fix - Auto-healing system
export class IBKRAuthManager {
  private baseUrl: string;
  private username: string;
  private password: string;
  private accountId: string;
  private lastAuthTime: number = 0;
  private authToken: string | null = null;

  constructor() {
    this.baseUrl = process.env.IBKR_BASE_URL || 'https://8080-ibu98pd4j6524ljwfdvht.e2b.dev';
    this.username = process.env.TWS_USERNAME || 'ilyuwc476';
    this.password = process.env.TWS_PASSWORD || 'trump123!';
    this.accountId = process.env.IBKR_ACCOUNT_ID || 'DU7428350';
  }

  async ensureAuthenticated(): Promise<boolean> {
    try {
      // Check if we need to re-authenticate (every 30 minutes)
      if (Date.now() - this.lastAuthTime > 30 * 60 * 1000 || !this.authToken) {
        await this.authenticate();
      }

      // Verify authentication
      const statusResponse = await fetch(`${this.baseUrl}/v1/api/iserver/auth/status`);
      const status = await statusResponse.json();
      
      if (status.authenticated) {
        return true;
      } else {
        // Force re-authentication
        await this.authenticate();
        return true;
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      return false;
    }
  }

  private async authenticate(): Promise<void> {
    try {
      // Step 1: Login
      const loginResponse = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.username,
          password: this.password,
          trading_mode: 'paper'
        })
      });

      if (loginResponse.ok) {
        const authData = await loginResponse.json();
        this.authToken = authData.api_token || 'authenticated';
        this.lastAuthTime = Date.now();
        console.log('✅ IBKR Authentication successful');
      } else {
        // Try direct authentication if login endpoint fails
        const directAuth = await fetch(`${this.baseUrl}/v1/api/iserver/reauthenticate`, {
          method: 'POST'
        });
        
        if (directAuth.ok) {
          this.lastAuthTime = Date.now();
          console.log('✅ IBKR Direct authentication successful');
        } else {
          throw new Error('Authentication failed');
        }
      }
    } catch (error) {
      console.error('❌ IBKR Authentication failed:', error);
      throw error;
    }
  }

  async makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    await this.ensureAuthenticated();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` }),
        ...options.headers
      }
    });

    if (response.status === 401) {
      // Re-authenticate and retry
      await this.authenticate();
      return this.makeAuthenticatedRequest(endpoint, options);
    }

    return response.json();
  }

  async getAccountData(): Promise<any> {
    return this.makeAuthenticatedRequest('/v1/api/iserver/accounts');
  }

  async getBalance(): Promise<any> {
    return this.makeAuthenticatedRequest(`/v1/api/iserver/account/${this.accountId}/summary`);
  }

  async getPositions(): Promise<any> {
    return this.makeAuthenticatedRequest(`/v1/api/iserver/account/${this.accountId}/positions/0`);
  }
}

// Global instance
export const ibkrAuth = new IBKRAuthManager();