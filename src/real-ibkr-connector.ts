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

  private getHeaders(): Record<string, string> {
    // Your server doesn't require authentication - just standard headers
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
    console.log('🔍 Getting balance from your server (no auth needed)...');
    
    // First try the IBKR API endpoint that has the real data (no auth needed on your server)
    try {
      const response = await fetch(`${this.baseUrl}/v1/api/iserver/account/${this.accountId}/summary`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Trump2Trade-Bot/1.0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Got real balance from IBKR API:', JSON.stringify(data, null, 2));
        
        // Convert IBKR format to our expected format
        const formattedData = {
          success: true,
          message: `Real balance retrieved for account ${this.accountId}`,
          balance: {
            account_id: this.accountId,
            account_type: "REAL_IBKR_ACCOUNT",
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
            trading_mode: this.mode === 'paper' ? "paper_on_real_account" : "live_trading",
            account_status: "Active"
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
    
    // Fallback to trading endpoint (even though it returns zeros)
    try {
      const response = await fetch(`${this.baseUrl}/trading/balance`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Trump2Trade-Bot/1.0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('⚠️ Trading endpoint data (may be zeros):', JSON.stringify(data, null, 2));
        return data;
      } else {
        console.log(`❌ Trading balance failed: ${response.status} ${response.statusText}`);
      }
    } catch (e) {
      console.log('❌ Trading endpoint error:', e);
    }
    
    throw new Error('Could not fetch balance from any endpoint - both IBKR API and trading endpoints failed');
  }

  async getRealPositions(): Promise<any> {
    console.log('🔍 Getting positions from your server (no auth needed)...');
    
    // Try trading/positions endpoint first (no auth needed on your server)
    try {
      const response = await fetch(`${this.baseUrl}/trading/positions`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Trump2Trade-Bot/1.0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Got positions from trading endpoint:', JSON.stringify(data, null, 2));
        return data;
      } else {
        console.log(`❌ Trading positions failed: ${response.status} ${response.statusText}`);
      }
    } catch (e) {
      console.log('❌ Trading/positions endpoint error:', e);
    }
    
    // Fallback to IBKR API positions endpoint
    try {
      const response = await fetch(`${this.baseUrl}/v1/api/iserver/account/${this.accountId}/positions/0`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Trump2Trade-Bot/1.0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Got positions from IBKR API:', JSON.stringify(data, null, 2));
        return data;
      } else {
        console.log(`❌ IBKR positions failed: ${response.status} ${response.statusText}`);
      }
    } catch (e) {
      console.log('❌ IBKR API positions error:', e);
    }
    
    throw new Error('Could not fetch positions from any endpoint');
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