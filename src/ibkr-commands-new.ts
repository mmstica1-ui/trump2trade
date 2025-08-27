/**
 * IBKR Commands - Updated for New Server Endpoints
 * Uses /trading/* endpoints with proper authentication
 */

// Helper function to get authentication token
async function getAuthToken(baseUrl: string): Promise<string> {
  const authResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: "demo_user",
      password: "demo_password", 
      trading_mode: "paper"
    })
  });
  
  if (!authResponse.ok) {
    throw new Error(`Authentication failed: ${authResponse.status}`);
  }
  
  const authData = await authResponse.json();
  return authData.api_token;
}

// Updated IBKR Account Command
export const ibkrAccountCommand = `
bot.command('ibkr_account', async (ctx) => {
  if (!adminOnly(ctx)) return;
  try {
    const baseUrl = process.env.IBKR_BASE_URL || 'https://web-production-a020.up.railway.app';
    
    try {
      // Get authentication token
      const token = await getAuthToken(baseUrl);
      
      // Get configuration info for account details
      const configResponse = await fetch(\`\${baseUrl}/config\`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        }
      });
      
      if (configResponse.ok) {
        const configData = await configResponse.json();
        const message = \`👤 <b>IBKR Account Info</b>

✅ <b>Server Status:</b>
• Environment: \${configData.environment || 'Unknown'}
• Trading Mode: \${configData.trading_mode || 'Unknown'} 
• IBKR Connected: \${configData.ibkr_connected ? '✅' : '❌'}
• Ready for Trading: \${configData.ready_for_trading ? '✅' : '❌'}

🔧 <b>Configured Account:</b>
\${process.env.IBKR_ACCOUNT_ID || 'Not configured'}

💼 <b>Trading Capabilities:</b>
\${Array.isArray(configData.trading_capabilities) ? 
  configData.trading_capabilities.map((cap: string) => \`• \${cap}\`).join('\\n') : 
  '• Standard trading functions'}

📊 <b>Available Endpoints:</b>
\${Array.isArray(configData.endpoints) ? 
  configData.endpoints.filter((ep: string) => ep.includes('trading')).map((ep: string) => \`• \${ep}\`).join('\\n') : 
  'Standard endpoints'}\`;
        
        await ctx.reply(message, { parse_mode: 'HTML' });
      } else {
        throw new Error(\`Config fetch failed: \${configResponse.status}\`);
      }
    } catch (apiError: any) {
      const message = \`👤 <b>IBKR Account Info</b>

❌ <b>Connection Failed:</b>
Error: \${apiError.message || 'Unknown error'}
Endpoint: \${baseUrl}/config

🔧 <b>Possible Issues:</b>
• IBKR Gateway authentication failed
• Server configuration issue
• Network connectivity problems

💡 <b>Try:</b> /ibkr_connect to reconnect\`;
      
      await ctx.reply(message, { parse_mode: 'HTML' });
    }
  } catch (error: any) {
    await ctx.reply(\`❌ Account info error: \${error?.message || error}\`);
  }
});`;

// Updated IBKR Positions Command
export const ibkrPositionsCommand = `
bot.command('ibkr_positions', async (ctx) => {
  if (!adminOnly(ctx)) return;
  try {
    const baseUrl = process.env.IBKR_BASE_URL || 'https://web-production-a020.up.railway.app';
    
    try {
      // Get authentication token
      const token = await getAuthToken(baseUrl);
      
      // Get positions using authenticated endpoint
      const positionsResponse = await fetch(\`\${baseUrl}/trading/positions\`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        }
      });
      
      if (positionsResponse.ok) {
        const positionsData = await positionsResponse.json();
        
        let message = \`📊 <b>Current Positions</b>\\n\\n\`;
        
        if (positionsData.success && positionsData.total_positions > 0) {
          message += \`✅ <b>Active Positions (\${positionsData.total_positions}):</b>\\n\`;
          
          // Display positions from the positions object
          const positions = positionsData.positions || {};
          Object.entries(positions).forEach(([symbol, pos]: [string, any], index: number) => {
            message += \`\\n\${index + 1}. <b>\${symbol}</b>\\n\`;
            message += \`   Quantity: \${pos.quantity || 0}\\n\`;
            message += \`   Market Price: $\${pos.market_price || 'N/A'}\\n\`;
            message += \`   Market Value: $\${pos.market_value || 'N/A'}\\n\`;
            message += \`   P&L: \${pos.unrealized_pnl || 'N/A'}\\n\`;
          });
        } else {
          message += \`📈 <b>No open positions</b>\\n\\n✅ Account ready for trading\\n💡 All positions closed or no trades executed yet\`;
        }
        
        message += \`\\n\\n🏦 <b>Account:</b> \${process.env.IBKR_ACCOUNT_ID || 'DU1234567'}\\n\`;
        message += \`📊 <b>Trading Mode:</b> \${positionsData.trading_mode || 'paper'}\\n\`;
        message += \`📅 <b>Updated:</b> \${new Date().toLocaleTimeString()}\`;
        
        await ctx.reply(message, { parse_mode: 'HTML' });
      } else {
        throw new Error(\`Positions fetch failed: \${positionsResponse.status}\`);
      }
    } catch (apiError: any) {
      const message = \`📊 <b>Current Positions</b>

❌ <b>Unable to fetch positions:</b>
Error: \${apiError.message}
Endpoint: \${baseUrl}/trading/positions

🔧 <b>Troubleshooting:</b>
• Check IBKR Gateway authentication
• Verify server connection
• Ensure trading mode is active

💡 Try: /ibkr_status for connection details\`;
      
      await ctx.reply(message, { parse_mode: 'HTML' });
    }
  } catch (error: any) {
    await ctx.reply(\`❌ Positions error: \${error?.message || error}\`);
  }
});`;

// Updated IBKR Balance Command
export const ibkrBalanceCommand = `
bot.command('ibkr_balance', async (ctx) => {
  if (!adminOnly(ctx)) return;
  try {
    const baseUrl = process.env.IBKR_BASE_URL || 'https://web-production-a020.up.railway.app';
    
    try {
      // Get authentication token
      const token = await getAuthToken(baseUrl);
      
      // Get trading status which includes balance info
      const statusResponse = await fetch(\`\${baseUrl}/trading/status\`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        }
      });
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        
        const message = \`💰 <b>Account Balance & Status</b>

✅ <b>Connection Status:</b>
• IBKR Connected: \${statusData.ibkr_connected ? '✅' : '❌'}
• Credentials Set: \${statusData.credentials_set ? '✅' : '❌'}
• System Status: \${statusData.system_status || 'Unknown'}

📊 <b>Trading Information:</b>
• Trading Mode: \${statusData.trading_mode || 'Unknown'}
• Active Positions: \${statusData.active_positions || 0}
• Total Orders: \${statusData.total_orders || 0}
• Last Activity: \${statusData.last_activity || 'None'}

💼 <b>Capabilities:</b>
\${statusData.capabilities ? Object.entries(statusData.capabilities).map(([key, value]: [string, any]) => 
  \`• \${key.replace('_', ' ')}: \${value ? '✅' : '❌'}\`
).join('\\n') : '• Standard capabilities'}

🏦 <b>Account:</b> \${process.env.IBKR_ACCOUNT_ID || 'DU1234567'}
📅 <b>Updated:</b> \${new Date().toLocaleTimeString()}\`;
        
        await ctx.reply(message, { parse_mode: 'HTML' });
      } else {
        throw new Error(\`Status fetch failed: \${statusResponse.status}\`);
      }
    } catch (apiError: any) {
      const message = \`💰 <b>Account Balance</b>

❌ <b>Unable to fetch balance:</b>
Error: \${apiError.message}
Endpoint: \${baseUrl}/trading/status

🔧 <b>Possible Issues:</b>
• IBKR Gateway not authenticated
• Server connection issue  
• Trading status unavailable

💡 Try: /ibkr_connect to establish connection\`;
      
      await ctx.reply(message, { parse_mode: 'HTML' });
    }
  } catch (error: any) {
    await ctx.reply(\`❌ Balance error: \${error?.message || error}\`);
  }
});`;

// Updated IBKR Status Command (already uses correct endpoints)
export const ibkrStatusCommand = `
bot.command('ibkr_status', async (ctx) => {
  if (!adminOnly(ctx)) return;
  try {
    const baseUrl = process.env.IBKR_BASE_URL || 'https://web-production-a020.up.railway.app';
    
    // Check Railway server health
    const healthResponse = await fetch(\`\${baseUrl}/health\`);
    const healthData = await healthResponse.json();
    
    // Try to check IBKR auth status  
    let ibkrStatus = "❌ Not Connected";
    let authDetails = "Gateway not authenticated";
    
    try {
      // Try authentication with demo credentials
      let authResponse = await fetch(\`\${baseUrl}/auth/login\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: "demo_user",
          password: "demo_password", 
          trading_mode: "paper"
        })
      });
      
      if (authResponse.ok) {
        const authData = await authResponse.json();
        ibkrStatus = authData.success ? "✅ Authenticated" : "⚠️ Auth Failed";
        authDetails = \`Token: \${authData.api_token ? 'Valid' : 'None'}, Mode: \${authData.trading_mode || 'paper'}, Status: \${authData.connection_status || 'unknown'}\`;
      } else {
        ibkrStatus = healthData.ibkr_connected ? "✅ Connected via Health" : "❌ Not Available";
        authDetails = "Using health endpoint status";
      }
    } catch (authError) {
      ibkrStatus = healthData.ibkr_connected ? "✅ Connected via Health" : "❌ Not Available";
      authDetails = "Using health endpoint status";
    }
    
    const message = \`🏦 <b>IBKR Connection Status</b>

🌐 <b>Server Status:</b>
Status: \${healthData.status === 'healthy' ? '✅' : '❌'} \${healthData.status}
URL: \${baseUrl}
Version: \${healthData.version || 'Unknown'}
IBKR Ready: \${healthData.ibkr_connected ? '✅' : '❌'} \${healthData.ibkr_connected || 'false'}
Trading Ready: \${healthData.trading_ready ? '✅' : '❌'} \${healthData.trading_ready || 'false'}

🏦 <b>IBKR Gateway:</b>
Status: \${ibkrStatus}
Details: \${authDetails}

📊 <b>Configuration:</b>
Account: \${process.env.IBKR_ACCOUNT_ID || 'Not configured'}
Mode: Paper Trading
Safe Mode: \${process.env.DISABLE_TRADES === 'false' ? '🔴 OFF' : '🟢 ON'}\`;
    
    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error: any) {
    await ctx.reply(\`❌ IBKR Status error: \${error?.message || error}\`);
  }
});`;