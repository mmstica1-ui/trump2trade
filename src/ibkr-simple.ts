import axios from 'axios';
import { ibkrFallback } from './ibkr-fallback-system.js';

const acct = process.env.IBKR_ACCOUNT_ID || 'DUA065113';
const qty = Number(process.env.IBKR_ORDER_DEFAULT_QTY || '1');

export type InlineTradePayload = { 
  a: 'buy_call'|'buy_put'|'sell_call'|'sell_put'|'preview'|'manual_trade'; 
  t?: string; 
  pct?: string;
};

export async function chooseTrade(p: InlineTradePayload): Promise<string> {
  if ((process.env.DISABLE_TRADES || '').toLowerCase() === 'true') {
    return '🧪 Preview mode is ON (DISABLE_TRADES=true). No orders will be sent.';
  }
  if (p.a === 'preview') return 'No trade. This is a dry run.';
  if (p.a === 'manual_trade') {
    const manualTradingUrl = process.env.MANUAL_TRADING_URL || 'https://your-trading-platform.com';
    return `📈 Manual Trading: ${manualTradingUrl}\n\n🎯 Use this link to execute trades manually on your preferred platform.`;
  }
  if (!p.t) throw new Error('Missing ticker');

  const isBuy = p.a.startsWith('buy');
  const isCall = p.a.endsWith('call');
  const pct = p.pct || '1';
  
  console.log(`🎯 Processing order: ${isBuy ? 'BUY' : 'SELL'} ${isCall ? 'CALL' : 'PUT'} ${p.t} ${pct}%`);
  
  try {
    const baseUrl = ibkrFallback.getConnectionUrl();
    console.log(`📡 Using IBKR server: ${baseUrl}`);
    
    const orderData = {
      orders: [{
        symbol: p.t,
        side: isBuy ? 'BUY' : 'SELL',
        orderType: 'MKT',
        quantity: qty,
        secType: 'OPT',
        strike: 140, // Demo strike - server will calculate based on pct
        right: isCall ? 'C' : 'P',
        expiry: '20241220', // Demo expiry
        metadata: {
          pct_otm: pct,
          source: 'Trump2Trade',
          timestamp: new Date().toISOString()
        }
      }]
    };
    
    console.log(`📝 Sending order:`, JSON.stringify(orderData, null, 2));
    
    const response = await axios.post(
      `${baseUrl}/v1/api/iserver/account/${acct}/orders`,
      orderData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );
    
    const orderResult = Array.isArray(response.data) ? response.data[0] : response.data;
    console.log(`✅ Order result:`, JSON.stringify(orderResult, null, 2));
    
    const orderId = orderResult?.demo_order_id || orderResult?.id || 'UNKNOWN';
    const status = orderResult?.message?.[0] || 'Order submitted';
    
    return `✅ ${isBuy ? 'BUY' : 'SELL'} ${isCall ? 'CALL' : 'PUT'} ${p.t} ${pct}% OTM x${qty}\n` +
           `📋 Order ID: ${orderId}\n` +
           `📊 Status: ${status}\n` +
           `🏦 Account: ${acct} (Demo Mode)`;
           
  } catch (error: any) {
    console.error('❌ Order placement error:', error);
    const errorMsg = error.response?.data?.detail || error.response?.data || error.message;
    return `❌ Order failed: ${errorMsg}\n\n🔧 Check IBKR connection status`;
  }
}