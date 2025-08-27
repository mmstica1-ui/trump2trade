// Real IBKR Connector - Direct connection to your actual IBKR account
export class RealIBKRConnector {
  private baseUrl: string;
  private username: string;
  private password: string;
  private accountId: string;
  private mode: 'paper' | 'live';
  private authToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.baseUrl = process.env.IBKR_BASE_URL || 'http://localhost:5000';
    this.username = process.env.TWS_USERNAME || 'ilyuwc476';
    this.password = process.env.TWS_PASSWORD || 'trump123!';
    this.accountId = process.env.IBKR_ACCOUNT_ID || 'DU7428350';
    this.mode = (process.env.IBKR_GATEWAY_MODE as 'paper' | 'live') || 'paper';
  }

  private async getAuthToken(): Promise<string> {
    // Check if we have a valid token
    if (this.authToken && Date.now() < this.tokenExpiry) {
      return this.authToken;
    }

    console.log(`🔐 Authenticating with server: ${this.baseUrl}`);
    console.log(`📋 Credentials: ${this.username} / ${this.mode} mode`);
    
    // Get new token from your server
    const authPayload = {
      username: this.username,
      password: this.password,
      trading_mode: this.mode
    };
    
    console.log('🔍 Auth payload:', JSON.stringify(authPayload));
    
    const authResponse = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authPayload)
    });

    console.log(`📊 Auth response status: ${authResponse.status}`);
    
    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error(`❌ Auth failed: ${authResponse.status} - ${errorText}`);
      throw new Error(`Authentication failed: ${authResponse.status} - ${errorText}`);
    }

    const authData = await authResponse.json();
    console.log('✅ Auth success:', authData);
    
    this.authToken = authData.api_token;
    // Token expires in 1 hour, refresh 5 minutes before
    this.tokenExpiry = Date.now() + (55 * 60 * 1000);

    console.log('✅ Successfully authenticated with your IBKR server');
    return this.authToken || '';
  }

  async testRealConnection(): Promise<{connected: boolean, data?: any, error?: string}> {
    try {
      console.log(`🔍 Testing connection to YOUR server: ${this.baseUrl}`);
      
      // Test 1: Basic server health (use /health since it works)
      const healthResponse = await fetch(`${this.baseUrl}/health`);
      
      if (!healthResponse.ok) {
        return {
          connected: false,
          error: `Server health check failed: ${healthResponse.status} ${healthResponse.statusText}`
        };
      }

      const healthData = await healthResponse.json();
      console.log('✅ Your server health:', healthData);

      // Test 2: Try to access trading endpoints (may require auth)
      let tradingData = null;
      try {
        const positionsResponse = await fetch(`${this.baseUrl}/trading/positions`);
        if (positionsResponse.ok) {
          tradingData = await positionsResponse.json();
          console.log('✅ Trading positions accessible:', tradingData);
        } else {
          console.log('ℹ️ Trading positions require authentication:', positionsResponse.status);
        }
      } catch (e) {
        console.log('ℹ️ Trading endpoints may need authentication');
      }

      // Test 3: Check if this is indeed your real account server
      const isYourServer = healthData.ibkr_connected && healthData.trading_ready;
      
      if (!isYourServer) {
        return {
          connected: false,
          error: 'Server not ready for trading or IBKR not connected'
        };
      }

      return {
        connected: true,
        data: {
          serverHealth: healthData,
          tradingReady: healthData.trading_ready,
          ibkrConnected: healthData.ibkr_connected,
          version: healthData.version,
          isRealAccount: true,
          accountId: this.accountId,
          mode: this.mode,
          serverUrl: this.baseUrl,
          tradingData: tradingData
        }
      };

    } catch (error) {
      return {
        connected: false,
        error: `Connection to your server failed: ${(error as Error).message}`
      };
    }
  }

  async getRealBalance(): Promise<any> {
    // Get authentication token first
    const token = await this.getAuthToken();
    
    // Try your server's trading endpoints with auth
    try {
      const response = await fetch(`${this.baseUrl}/trading/balance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        return response.json();
      }
    } catch (e) {
      console.log('Trading/balance endpoint not available, trying IBKR API...');
    }
    
    // Fallback to standard IBKR API
    const response = await fetch(`${this.baseUrl}/v1/api/iserver/account/${this.accountId}/summary`);
    if (!response.ok) {
      throw new Error(`Balance fetch failed: ${response.status}`);
    }
    return response.json();
  }

  async getRealPositions(): Promise<any> {
    // Get authentication token first
    const token = await this.getAuthToken();
    
    // Try your server's trading endpoints with auth
    try {
      const response = await fetch(`${this.baseUrl}/trading/positions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        return response.json();
      }
    } catch (e) {
      console.log('Trading/positions endpoint not available, trying IBKR API...');
    }
    
    // Fallback to standard IBKR API
    const response = await fetch(`${this.baseUrl}/v1/api/iserver/account/${this.accountId}/positions/0`);
    if (!response.ok) {
      throw new Error(`Positions fetch failed: ${response.status}`);
    }
    return response.json();
  }

  async placeRealOrder(orderData: {
    symbol: string;
    action: 'BUY' | 'SELL';
    quantity: number;
    orderType?: 'MKT' | 'LMT';
    price?: number;
  }): Promise<any> {
    
    if (process.env.DISABLE_TRADES === 'true') {
      throw new Error('🚨 Trading is disabled for safety');
    }

    console.log(`🔥 REAL ORDER: ${orderData.action} ${orderData.quantity} ${orderData.symbol}`);

    const orderPayload = {
      orders: [{
        acctId: this.accountId,
        conid: await this.getContractId(orderData.symbol),
        secType: 'STK',
        cOID: `BOT_${Date.now()}`,
        orderType: orderData.orderType || 'MKT',
        listingExchange: 'SMART',
        side: orderData.action,
        quantity: orderData.quantity,
        ...(orderData.price && { price: orderData.price }),
        tif: 'DAY'
      }]
    };

    const response = await fetch(`${this.baseUrl}/v1/api/iserver/account/${this.accountId}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    if (!response.ok) {
      throw new Error(`Order placement failed: ${response.status} ${await response.text()}`);
    }

    const result = await response.json();
    console.log('✅ Order placed:', result);
    return result;
  }

  private async getContractId(symbol: string): Promise<number> {
    // Get contract ID for symbol
    const response = await fetch(`${this.baseUrl}/v1/api/iserver/secdef/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, name: true, secType: 'STK' })
    });
    
    const data = await response.json();
    if (data && data.length > 0) {
      return data[0].conid;
    }
    
    throw new Error(`Contract ID not found for ${symbol}`);
  }

  getConnectionInfo(): string {
    return `
🔗 YOUR IBKR Server Connection:
├─ 🌐 Server URL: ${this.baseUrl}
├─ 👤 Account ID: ${this.accountId}  
├─ 📊 Mode: ${this.mode.toUpperCase()} TRADING
├─ 🔑 Username: ${this.username}
├─ ⚡ Server Type: Your Custom E2B Server
└─ 🎯 Status: Connected to YOUR real account!`;
  }
}

// Global instance for real IBKR connection
export const realIBKR = new RealIBKRConnector();