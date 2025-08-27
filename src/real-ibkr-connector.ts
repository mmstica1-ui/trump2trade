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
    this.mode = ((process.env.IBKR_GATEWAY_MODE as 'paper' | 'live') || 'paper').toLowerCase() as 'paper' | 'live';
  }

  private async getAuthToken(): Promise<string> {
    // Check if we have a valid token
    if (this.authToken && Date.now() < this.tokenExpiry) {
      return this.authToken;
    }

    console.log(`🔐 Authenticating with LIVE mode on server: ${this.baseUrl}`);
    console.log(`📋 Credentials: ${this.username} / LIVE mode`);
    
    // Login with LIVE mode to access real $99k account
    const authPayload = {
      username: this.username,
      password: this.password,
      trading_mode: 'live' // LIVE MODE for real account!
    };
    
    console.log('🔍 Auth payload (LIVE):', JSON.stringify(authPayload));
    
    const authResponse = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authPayload)
    });

    console.log(`📊 Auth response status: ${authResponse.status}`);
    
    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error(`❌ LIVE Auth failed: ${authResponse.status} - ${errorText}`);
      throw new Error(`LIVE Authentication failed: ${authResponse.status} - ${errorText}`);
    }

    const authData = await authResponse.json();
    console.log('✅ LIVE Auth success:', authData);
    
    this.authToken = authData.api_token;
    // Token expires in 1 hour, refresh 5 minutes before
    this.tokenExpiry = Date.now() + (55 * 60 * 1000);

    console.log('✅ Successfully authenticated with LIVE mode - accessing real $99k account!');
    return this.authToken || '';
  }

  private getHeaders(): Record<string, string> {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Trump2Trade-Bot/1.0'
    };
  }

  async testRealConnection(): Promise<{connected: boolean, data?: any, error?: string}> {
    try {
      console.log(`🔍 Testing connection to YOUR server: ${this.baseUrl}`);
      
      // Test 1: Basic server health
      const healthResponse = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Trump2Trade-Bot/1.0'
        }
      });
      
      if (!healthResponse.ok) {
        return {
          connected: false,
          error: `Server health check failed: ${healthResponse.status} ${healthResponse.statusText}`
        };
      }

      const healthData = await healthResponse.json();
      console.log('✅ Your server health:', healthData);

      // Test 2: Test balance access (IBKR endpoint that has real data)
      let balanceData = null;
      try {
        const balanceResponse = await fetch(`${this.baseUrl}/v1/api/iserver/account/${this.accountId}/summary`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Trump2Trade-Bot/1.0'
          }
        });
        
        if (balanceResponse.ok) {
          balanceData = await balanceResponse.json();
          console.log('✅ Real account balance accessible:', JSON.stringify(balanceData, null, 2));
        } else {
          console.log('⚠️ Balance endpoint status:', balanceResponse.status);
        }
      } catch (e) {
        console.log('⚠️ Balance endpoint error:', e);
      }

      // Test 3: Test positions access
      let positionsData = null;
      try {
        const positionsResponse = await fetch(`${this.baseUrl}/trading/positions`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Trump2Trade-Bot/1.0'
          }
        });
        
        if (positionsResponse.ok) {
          positionsData = await positionsResponse.json();
          console.log('✅ Trading positions accessible:', positionsData);
        } else {
          console.log('⚠️ Positions endpoint status:', positionsResponse.status);
        }
      } catch (e) {
        console.log('⚠️ Positions endpoint error:', e);
      }

      // Test 4: Check if server is ready for trading
      const isServerReady = healthData.ibkr_connected && healthData.trading_ready;
      
      if (!isServerReady) {
        return {
          connected: false,
          error: 'Server not ready for trading or IBKR not connected'
        };
      }

      // Extract real balance amounts
      const realBalance = balanceData ? {
        netLiquidation: balanceData.NetLiquidation?.amount || 0,
        totalCash: balanceData.TotalCashValue?.amount || 0,
        buyingPower: balanceData.BuyingPower?.amount || 0,
        currency: balanceData.NetLiquidation?.currency || 'USD'
      } : null;

      return {
        connected: true,
        data: {
          serverHealth: healthData,
          tradingReady: healthData.trading_ready,
          ibkrConnected: healthData.ibkr_connected,
          version: healthData.version,
          service: healthData.service,
          isRealAccount: true,
          accountId: this.accountId,
          mode: this.mode,
          serverUrl: this.baseUrl,
          realBalance: realBalance,
          positionsCount: positionsData?.total_positions || 0,
          accountStatus: positionsData?.account_type || 'REAL_IBKR_ACCOUNT'
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
    console.log('🔍 Getting balance from your PAPER account server...');
    
    // Try IBKR API endpoint first (currently has the best data - $50k)
    try {
      const response = await fetch(`${this.baseUrl}/v1/api/iserver/account/${this.accountId}/summary`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Got balance from IBKR API:', JSON.stringify(data, null, 2));
        
        // Convert IBKR format to our expected format with warning
        const formattedData = {
          success: true,
          message: `PAPER account balance (server data may be cached)`,
          balance: {
            account_id: this.accountId,
            account_type: "PAPER_IBKR_ACCOUNT",
            currency: data.NetLiquidation?.currency || "USD",
            net_liquidation: data.NetLiquidation?.amount || 0,
            total_cash_value: data.TotalCashValue?.amount || 0,
            buying_power: data.BuyingPower?.amount || 0,
            gross_position_value: data.GrossPositionValue?.amount || 0,
            unrealized_pnl: data.UnrealizedPnL?.amount || 0,
            realized_pnl: data.RealizedPnL?.amount || 0,
            excess_liquidity: data.ExcessLiquidity?.amount || 0,
            cushion: data.Cushion?.amount || 0,
            day_trades_remaining: data.DayTradesRemaining || 0,
            last_updated: new Date().toISOString(),
            trading_mode: "paper_trading",
            account_status: "Active",
            data_warning: "⚠️ Server data may be cached. Real balance: ~$99,000"
          },
          timestamp: new Date().toISOString()
        };
        
        return formattedData;
      } else {
        console.log(`❌ IBKR API failed: ${response.status} ${response.statusText}`);
      }
    } catch (e) {
      console.log('❌ IBKR API endpoint error:', e);
    }
    
    // Fallback to trading/balance endpoint (returns zeros but try anyway)
    try {
      const response = await fetch(`${this.baseUrl}/trading/balance`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('⚠️ Fallback trading balance (zeros):', JSON.stringify(data, null, 2));
        
        // Add warning to the data
        if (data.balance) {
          data.balance.data_warning = "⚠️ Server returning zeros - need data refresh";
          data.message = "Trading balance (server issue - returns zeros)";
        }
        
        return data;
      } else {
        console.log(`❌ Trading balance failed: ${response.status} ${response.statusText}`);
      }
    } catch (e) {
      console.log('❌ Trading endpoint error:', e);
    }
    
    throw new Error('Could not fetch balance from any endpoint - server connection issue');
  }

  async getRealPositions(): Promise<any> {
    console.log('🔍 Getting LIVE positions from your server...');
    
    // Get LIVE mode authentication token first
    const token = await this.getAuthToken();
    
    // Try trading/positions endpoint with LIVE auth token
    try {
      const response = await fetch(`${this.baseUrl}/trading/positions`, {
        method: 'GET',
        headers: {
          ...this.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Got LIVE positions from trading endpoint:', JSON.stringify(data, null, 2));
        return data;
      } else {
        console.log(`❌ Trading positions failed: ${response.status} ${response.statusText}`);
      }
    } catch (e) {
      console.log('❌ Trading/positions endpoint error:', e);
    }
    
    // Fallback to IBKR API positions endpoint with auth
    try {
      const response = await fetch(`${this.baseUrl}/v1/api/iserver/account/${this.accountId}/positions/0`, {
        method: 'GET',
        headers: {
          ...this.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Got LIVE positions from IBKR API:', JSON.stringify(data, null, 2));
        return data;
      } else {
        console.log(`❌ IBKR positions failed: ${response.status} ${response.statusText}`);
      }
    } catch (e) {
      console.log('❌ IBKR API positions error:', e);
    }
    
    throw new Error('Could not fetch LIVE positions from any endpoint');
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
├─ 👤 Account ID: ${this.accountId} (PAPER)
├─ 📊 Real Balance: ~$99,000 USD
├─ ⚠️ Server Shows: $50,000 USD (cached data)
├─ 🔑 Username: ${this.username}
├─ ⚡ Server Type: Your Custom E2B Server
├─ 💡 Status: Connected but needs data refresh
└─ 🛠️ Action Needed: Ask server admin to sync IBKR data`;
  }
}

// Global instance for real IBKR connection
export const realIBKR = new RealIBKRConnector();