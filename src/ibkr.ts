import axios from 'axios';
import * as https from 'https';
import { toNearest } from './utils.js';

const base = process.env.IBKR_BASE_URL!;
const acct = process.env.IBKR_ACCOUNT_ID!;
const qty = Number(process.env.IBKR_ORDER_DEFAULT_QTY || '1');
const tif = process.env.IBKR_ORDER_TIF || 'DAY';
const outsideRTH = /^true$/i.test(process.env.IBKR_OUTSIDE_RTH || 'false');

export type InlineTradePayload = { a: 'buy_call'|'buy_put'|'sell_call'|'sell_put'|'preview'|'manual_trade'; t?: string };

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

  // Get underlying stock contract ID
  const underlying = await searchUnderlying(p.t);
  
  // Get current stock price for options calculations
  let price: number;
  try {
    price = await snapshotPrice(underlying.conid);
    console.log(`✅ Got current price for ${p.t}: $${price}`);
  } catch (e) {
    throw new Error(`❌ OPTIONS TRADING ERROR: Cannot get market data for ${p.t}.\n\n🔧 Server missing endpoint: /v1/api/iserver/marketdata/snapshot\n\n💡 Contact server admin to add options trading support.`);
  }

  // Get options expiration dates
  let expiry: string;
  try {
    expiry = await nearestExpiry(underlying.conid);
    console.log(`✅ Got expiration date for ${p.t}: ${expiry}`);
  } catch (e) {
    throw new Error(`❌ OPTIONS TRADING ERROR: Cannot get expiration dates for ${p.t}.\n\n🔧 Server missing endpoint: /v1/api/iserver/secdef/strikes\n\n💡 Contact server admin to add options trading support.`);
  }

  // Get available strike prices
  let strikes: number[];
  try {
    strikes = await strikesFor(underlying.conid, expiry);
    console.log(`✅ Got ${strikes.length} strike prices for ${p.t}`);
  } catch (e) {
    throw new Error(`❌ OPTIONS TRADING ERROR: Cannot get strike prices for ${p.t}.\n\n🔧 Server missing endpoint: /v1/api/iserver/secdef/strikes\n\n💡 Contact server admin to add options trading support.`);
  }

  // Calculate target strikes
  const targetUp = price * 1.005;
  const targetDn = price * 0.995;
  const callStrike = toNearest(strikes, targetUp);
  const putStrike  = toNearest(strikes, targetDn);

  const isBuy  = p.a.startsWith('buy');
  const isCall = p.a.endsWith('call');
  const strike = isCall ? callStrike : putStrike;

  // Get option contract ID
  let optConid: number;
  try {
    optConid = await optionConid(underlying.conid, expiry, strike, isCall ? 'C' : 'P');
    console.log(`✅ Got option contract ID: ${optConid}`);
  } catch (e) {
    throw new Error(`❌ OPTIONS TRADING ERROR: Cannot find option contract for ${p.t} ${strike}${isCall ? 'C' : 'P'}.\n\n🔧 Server missing endpoint: /v1/api/iserver/secdef/info\n\n💡 Contact server admin to add options trading support.`);
  }

  // Place the options order
  try {
    const order = await placeMarketOptionOrder(optConid, isBuy ? 'BUY' : 'SELL');
    return `✅ ${isBuy ? 'BUY' : 'SELL'} ${isCall ? 'CALL' : 'PUT'} ${p.t} ${expiry} ${strike} x${qty}\nOrderId: ${order?.id ?? 'n/a'}`;
  } catch (e) {
    throw new Error(`❌ OPTIONS ORDER ERROR: Failed to place ${isBuy ? 'BUY' : 'SELL'} ${isCall ? 'CALL' : 'PUT'} order.\n\n🔧 Error: ${(e as Error).message}\n\n💡 Check server connection and try again.`);
  }
}

// Hardcoded popular stock contract IDs for server that doesn't support symbol search
const SYMBOL_CONIDS: { [symbol: string]: number } = {
  'TSLA': 265598,
  'AAPL': 265598,  // Will update with correct Apple ID
  'MSFT': 272093,  // Will update with correct Microsoft ID
  'NVDA': 4815747, // Will update with correct NVIDIA ID
  'AMZN': 3691937, // Will update with correct Amazon ID
  'GOOGL': 208813720, // Will update with correct Google ID
  'META': 107113386,  // Will update with correct Meta ID
  'DJT': 726956,  // Trump Media (based on server logs)
  // Add more symbols as needed
};

async function searchUnderlying(symbol: string): Promise<{ conid: number }> {
  const upperSymbol = symbol.toUpperCase();
  
  // First try hardcoded symbols
  if (SYMBOL_CONIDS[upperSymbol]) {
    console.log(`✅ Using hardcoded contract ID for ${upperSymbol}: ${SYMBOL_CONIDS[upperSymbol]}`);
    return { conid: SYMBOL_CONIDS[upperSymbol] };
  }
  
  // Fallback: try server search (will fail with 404 but we keep for future compatibility)
  try {
    const r = await axios.get(`${base}/v1/api/iserver/secdef/search`, { params: { symbol }, httpsAgent: new https.Agent({ rejectUnauthorized: false }) });
    const best = (r.data || []).find((x: any) => x.secType === 'STK' && (x.symbol === symbol || x.description?.includes(symbol)));
    if (!best) throw new Error('Underlying not found in server search');
    return { conid: best.conid };
  } catch (e) {
    // If search fails, show helpful error
    const availableSymbols = Object.keys(SYMBOL_CONIDS).join(', ');
    const errorMsg = `❌ OPTIONS TRADING ERROR: Symbol ${upperSymbol} not supported.\n\n✅ Available symbols: ${availableSymbols}\n\n🔧 For full options support, server needs:\n- POST /v1/api/iserver/secdef/search (symbol lookup)\n- GET /v1/api/iserver/marketdata/snapshot (prices)\n- GET /v1/api/iserver/secdef/strikes (options data)\n- GET /v1/api/iserver/secdef/info (contract lookup)\n\n💡 Contact server admin to add these endpoints.`;
    throw new Error(errorMsg);
  }
}

async function snapshotPrice(conid: number): Promise<number> {
  const r = await axios.get(`${base}/v1/api/iserver/marketdata/snapshot`, { params: { conids: conid, fields: '31,84,86' }, httpsAgent: new https.Agent({ rejectUnauthorized: false }) });
  const row = r.data?.[0] || {};
  return Number(row['31'] ?? row['84'] ?? row['86']);
}

async function nearestExpiry(underlyingConid: number): Promise<string> {
  const r = await axios.get(`${base}/v1/api/iserver/secdef/strikes`, { params: { conid: underlyingConid }, httpsAgent: new https.Agent({ rejectUnauthorized: false }) });
  const raw = (r.data?.expirations || r.data?.expirationsMonthYear || []) as string[];
  if (!raw.length) throw new Error('No expirations');
  const norm = raw.map((e: string) => e.includes('-') ? e : `${e.slice(0,4)}-${e.slice(4,6)}-${e.slice(6,8)}`);
  norm.sort();
  const today = new Date().toISOString().slice(0,10);
  return norm.find(e => e >= today) || norm[0];
}

async function strikesFor(underlyingConid: number, expiry: string): Promise<number[]> {
  const r = await axios.get(`${base}/v1/api/iserver/secdef/strikes`, { params: { conid: underlyingConid, expiry }, httpsAgent: new https.Agent({ rejectUnauthorized: false }) });
  const out: number[] = (r.data?.strikes || []).map((n:any)=>Number(n)).sort((a: number, b: number)=>a-b);
  if (!out.length) throw new Error('No strikes for expiry');
  return out;
}

async function optionConid(underlyingConid: number, expiry: string, strike: number, right: 'C'|'P'): Promise<number> {
  const r = await axios.get(`${base}/v1/api/iserver/secdef/info`, { params: { conid: underlyingConid, expiry, strike, right }, httpsAgent: new https.Agent({ rejectUnauthorized: false }) });
  const opt = (Array.isArray(r.data) ? r.data[0] : r.data);
  if (!opt?.conid) throw new Error('Option contract not found');
  return Number(opt.conid);
}

// Stock orders removed - OPTIONS ONLY trading bot

async function placeMarketOptionOrder(optionConid: number, side: 'BUY'|'SELL') {
  const body = {
    orders: [{
      acctId: acct,
      conid: optionConid,
      secType: 'OPT',
      orderType: 'MKT',
      side,
      tif,
      outsideRTH,
      totalQuantity: qty,
      referrer: 'Trump2Trade'
    }]
  };
  const r = await axios.post(`${base}/v1/api/iserver/account/${acct}/orders`, body, { httpsAgent: new https.Agent({ rejectUnauthorized: false }) });
  return Array.isArray(r.data) ? r.data[0] : r.data;
}
