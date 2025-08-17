import axios from 'axios';
import * as https from 'https';
import { toNearest } from './utils.js';

const base = process.env.IBKR_BASE_URL!;
const acct = process.env.IBKR_ACCOUNT_ID!;
const qty = Number(process.env.IBKR_ORDER_DEFAULT_QTY || '1');
const tif = process.env.IBKR_ORDER_TIF || 'DAY';
const outsideRTH = /^true$/i.test(process.env.IBKR_OUTSIDE_RTH || 'false');

export type InlineTradePayload = { a: 'buy_call'|'buy_put'|'sell_call'|'sell_put'|'preview'; t?: string };

export async function chooseTrade(p: InlineTradePayload): Promise<string> {
  if ((process.env.DISABLE_TRADES || '').toLowerCase() === 'true') {
    return '🧪 Preview mode is ON (DISABLE_TRADES=true). No orders will be sent.';
  }
  if (p.a === 'preview') return 'No trade. This is a dry run.';
  if (!p.t) throw new Error('Missing ticker');

  const underlying = await searchUnderlying(p.t);
  const price = await snapshotPrice(underlying.conid);
  const targetUp = price * 1.005;
  const targetDn = price * 0.995;

  const expiry = await nearestExpiry(underlying.conid);
  const strikes = await strikesFor(underlying.conid, expiry);

  const callStrike = toNearest(strikes, targetUp);
  const putStrike  = toNearest(strikes, targetDn);

  const isBuy  = p.a.startsWith('buy');
  const isCall = p.a.endsWith('call');
  const strike = isCall ? callStrike : putStrike;

  const optConid = await optionConid(underlying.conid, expiry, strike, isCall ? 'C' : 'P');

  const order = await placeMarketOptionOrder(optConid, isBuy ? 'BUY' : 'SELL');
  return `✅ ${isBuy ? 'BUY' : 'SELL'} ${isCall ? 'CALL' : 'PUT'} ${p.t} ${expiry} ${strike} x${qty}\nOrderId: ${order?.id ?? 'n/a'}`;
}

async function searchUnderlying(symbol: string): Promise<{ conid: number }> {
  const r = await axios.get(`${base}/iserver/secdef/search`, { params: { symbol }, httpsAgent: new https.Agent({ rejectUnauthorized: false }) });
  const best = (r.data || []).find((x: any) => x.secType === 'STK' && (x.symbol === symbol || x.description?.includes(symbol)));
  if (!best) throw new Error('Underlying not found');
  return { conid: best.conid };
}

async function snapshotPrice(conid: number): Promise<number> {
  const r = await axios.get(`${base}/iserver/marketdata/snapshot`, { params: { conids: conid, fields: '31,84,86' }, httpsAgent: new https.Agent({ rejectUnauthorized: false }) });
  const row = r.data?.[0] || {};
  return Number(row['31'] ?? row['84'] ?? row['86']);
}

async function nearestExpiry(underlyingConid: number): Promise<string> {
  const r = await axios.get(`${base}/iserver/secdef/strikes`, { params: { conid: underlyingConid }, httpsAgent: new https.Agent({ rejectUnauthorized: false }) });
  const raw = (r.data?.expirations || r.data?.expirationsMonthYear || []) as string[];
  if (!raw.length) throw new Error('No expirations');
  const norm = raw.map((e: string) => e.includes('-') ? e : `${e.slice(0,4)}-${e.slice(4,6)}-${e.slice(6,8)}`);
  norm.sort();
  const today = new Date().toISOString().slice(0,10);
  return norm.find(e => e >= today) || norm[0];
}

async function strikesFor(underlyingConid: number, expiry: string): Promise<number[]> {
  const r = await axios.get(`${base}/iserver/secdef/strikes`, { params: { conid: underlyingConid, expiry }, httpsAgent: new https.Agent({ rejectUnauthorized: false }) });
  const out: number[] = (r.data?.strikes || []).map((n:any)=>Number(n)).sort((a: number, b: number)=>a-b);
  if (!out.length) throw new Error('No strikes for expiry');
  return out;
}

async function optionConid(underlyingConid: number, expiry: string, strike: number, right: 'C'|'P'): Promise<number> {
  const r = await axios.get(`${base}/iserver/secdef/info`, { params: { conid: underlyingConid, expiry, strike, right }, httpsAgent: new https.Agent({ rejectUnauthorized: false }) });
  const opt = (Array.isArray(r.data) ? r.data[0] : r.data);
  if (!opt?.conid) throw new Error('Option contract not found');
  return Number(opt.conid);
}

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
  const r = await axios.post(`${base}/iserver/account/${acct}/orders`, body, { httpsAgent: new https.Agent({ rejectUnauthorized: false }) });
  return Array.isArray(r.data) ? r.data[0] : r.data;
}
