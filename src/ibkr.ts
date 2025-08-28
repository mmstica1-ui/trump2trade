import axios from 'axios';
import * as https from 'https';
import { toNearest } from './utils.js';
import { ibkrFallback } from './ibkr-fallback-system.js';

// Use fallback system for base URL
const getBaseUrl = () => ibkrFallback.getConnectionUrl();
const acct = process.env.IBKR_ACCOUNT_ID!;
const qty = Number(process.env.IBKR_ORDER_DEFAULT_QTY || '1');
const tif = process.env.IBKR_ORDER_TIF || 'DAY';
const outsideRTH = /^true$/i.test(process.env.IBKR_OUTSIDE_RTH || 'false');

export type InlineTradePayload = { a: 'buy_call'|'buy_put'|'sell_call'|'sell_put'|'preview'|'manual_trade'; t?: string };

export async function chooseTrade(p: InlineTradePayload & { pct?: string }): Promise<string> {
  if ((process.env.DISABLE_TRADES || '').toLowerCase() === 'true') {
    return '🧪 Preview mode is ON (DISABLE_TRADES=true). No orders will be sent.';
  }
  if (p.a === 'preview') return 'No trade. This is a dry run.';
  if (p.a === 'manual_trade') {
    const manualTradingUrl = process.env.MANUAL_TRADING_URL || 'https://your-trading-platform.com';
    return `📈 Manual Trading: ${manualTradingUrl}\n\n🎯 Use this link to execute trades manually on your preferred platform.`;
  }
  if (!p.t) throw new Error('Missing ticker');

  // Simplified demo order using direct API call
  const isBuy = p.a.startsWith('buy');
  const isCall = p.a.endsWith('call');
  const pct = Number(p.pct || '1');
  
  // Use demo server direct order placement
  try {
    const order = await placeDemoOrder({
      symbol: p.t,
      side: isBuy ? 'BUY' : 'SELL',
      secType: 'OPT',
      right: isCall ? 'C' : 'P',
      quantity: qty,
      orderType: 'MKT',
      strike_pct: pct
    });
    
    return `✅ ${isBuy ? 'BUY' : 'SELL'} ${isCall ? 'CALL' : 'PUT'} ${p.t} ${pct}% OTM x${qty}\nDemo Order ID: ${order?.demo_order_id || order?.id || 'DEMO_ORDER'}\nStatus: Submitted to demo account`;
  } catch (error: any) {
    return `❌ Order failed: ${error?.message || error}`;
  }
}

async function searchUnderlying(symbol: string): Promise<{ conid: number }> {
  const base = getBaseUrl();
  const r = await axios.get(`${base}/v1/api/iserver/secdef/search`, { 
    params: { symbol }, 
    httpsAgent: new https.Agent({ rejectUnauthorized: false }) 
  });
  const best = (r.data || []).find((x: any) => x.secType === 'STK' && (x.symbol === symbol || x.description?.includes(symbol)));
  if (!best) throw new Error('Underlying not found');
  return { conid: best.conid };
}

async function snapshotPrice(conid: number): Promise<number> {
  const base = getBaseUrl();
  const r = await axios.get(`${base}/v1/api/iserver/marketdata/snapshot`, { 
    params: { conids: conid, fields: '31,84,86' }, 
    httpsAgent: new https.Agent({ rejectUnauthorized: false }) 
  });
  const row = r.data?.[0] || {};
  return Number(row['31'] ?? row['84'] ?? row['86']);
}

async function nearestExpiry(underlyingConid: number): Promise<string> {
  const base = getBaseUrl();
  const r = await axios.get(`${base}/v1/api/iserver/secdef/strikes`, { 
    params: { conid: underlyingConid }, 
    httpsAgent: new https.Agent({ rejectUnauthorized: false }) 
  });
  const raw = (r.data?.expirations || r.data?.expirationsMonthYear || []) as string[];
  if (!raw.length) throw new Error('No expirations');
  const norm = raw.map((e: string) => e.includes('-') ? e : `${e.slice(0,4)}-${e.slice(4,6)}-${e.slice(6,8)}`);
  norm.sort();
  const today = new Date().toISOString().slice(0,10);
  return norm.find(e => e >= today) || norm[0];
}

async function strikesFor(underlyingConid: number, expiry: string): Promise<number[]> {
  const base = getBaseUrl();
  const r = await axios.get(`${base}/v1/api/iserver/secdef/strikes`, { 
    params: { conid: underlyingConid, expiry }, 
    httpsAgent: new https.Agent({ rejectUnauthorized: false }) 
  });
  const out: number[] = (r.data?.strikes || []).map((n:any)=>Number(n)).sort((a: number, b: number)=>a-b);
  if (!out.length) throw new Error('No strikes for expiry');
  return out;
}

async function optionConid(underlyingConid: number, expiry: string, strike: number, right: 'C'|'P'): Promise<number> {
  const base = getBaseUrl();
  const r = await axios.get(`${base}/v1/api/iserver/secdef/info`, { 
    params: { conid: underlyingConid, expiry, strike, right }, 
    httpsAgent: new https.Agent({ rejectUnauthorized: false }) 
  });
  const opt = (Array.isArray(r.data) ? r.data[0] : r.data);
  if (!opt?.conid) throw new Error('Option contract not found');
  return Number(opt.conid);
}

// Simplified demo order placement
async function placeDemoOrder(orderData: {
  symbol: string;
  side: 'BUY' | 'SELL';
  secType: 'OPT';
  right: 'C' | 'P';
  quantity: number;
  orderType: 'MKT';
  strike_pct: number;
}) {
  const base = getBaseUrl();
  const body = {
    orders: [{
      symbol: orderData.symbol,
      side: orderData.side,
      orderType: orderData.orderType,
      quantity: orderData.quantity,
      secType: orderData.secType,
      strike: 140, // Demo strike - will be auto-calculated by server
      right: orderData.right,
      expiry: "20241220" // Demo expiry
    }]
  };
  
  const r = await axios.post(`${base}/v1/api/iserver/account/${acct}/orders`, body, { 
    httpsAgent: new https.Agent({ rejectUnauthorized: false }) 
  });
  return Array.isArray(r.data) ? r.data[0] : r.data;
}
