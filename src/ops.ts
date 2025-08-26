import axios from 'axios';
import * as https from 'https';
import { sendText } from './tg.js';

// Global system state
let systemActive = true;
let pollerHandle: any = null;
let healthCheckHandle: any = null;

export function startOpsSelfChecks() {
  const every = Number(process.env.OPS_CHECK_EVERY_MS || '60000');
  const checkIbkr = (process.env.DISABLE_TRADES || '').toLowerCase() !== 'true';
  
  if (healthCheckHandle) clearInterval(healthCheckHandle);
  
  healthCheckHandle = setInterval(async () => {
    if (!systemActive) return; // Skip if system is off
    
    try {
      const snap = await getHealthSnapshot();
      if (!snap.appOk) await sendText('❗ App healthz failed.');
      // Only check IBKR if trades are enabled
      if (checkIbkr && !snap.ibkrOk) await sendText('❗ IBKR gateway not authenticated.');
    } catch (e:any) {
      await sendText(`❌ Self-check error: ${e?.message||e}`);
    }
  }, every);
}

export async function getHealthSnapshot(): Promise<{appOk:boolean; ibkrOk:boolean}> {
  const appUrl = process.env.APP_URL || '';
  let appOk = false, ibkrOk = false;
  try {
    if (appUrl) {
      const r = await axios.get(`${appUrl}/healthz`, { timeout: 5000 });
      appOk = !!r.data?.ok;
    } else { appOk = true; }
  } catch {}
  try {
    const base = process.env.IBKR_BASE_URL;
    if (base) {
      const r = await axios.get(`${base}/iserver/auth/status`, { timeout: 5000, httpsAgent: new https.Agent({ rejectUnauthorized: false }) });
      ibkrOk = !!(r.data?.authenticated);
    }
  } catch {}
  return { appOk, ibkrOk };
}

export async function toggleSafeMode(on: boolean) {
  const token = process.env.RAILWAY_TOKEN;
  const serviceId = process.env.RAILWAY_SERVICE_ID;
  if (!token || !serviceId) throw new Error('Missing Railway token/service id');
  const query = `mutation($serviceId: String!, $name: String!, $value: String!) {
    variableUpsert(serviceId: $serviceId, name: $name, value: $value) { id }
  }`;
  await axios.post('https://backboard.railway.app/graphql', {
    query, variables: { serviceId, name: 'DISABLE_TRADES', value: on ? 'true' : 'false' }
  }, { headers: { Authorization: `Bearer ${token}` } });
}

export async function toggleSystemActive(active: boolean) {
  systemActive = active;
  if (!active) {
    // Stop poller
    if (pollerHandle) {
      clearInterval(pollerHandle);
      pollerHandle = null;
    }
    // Stop health checks
    if (healthCheckHandle) {
      clearInterval(healthCheckHandle);
      healthCheckHandle = null;
    }
    await sendText('⏸️ System deactivated - Truth monitoring stopped');
  } else {
    // Restart all services
    const { startTruthPoller } = await import('./poller.js');
    const { stopTruthPoller } = await import('./poller.js');
    startTruthPoller();
    startOpsSelfChecks();
    await sendText('🔄 System reactivated - Running diagnostics...');
  }
}

export async function runFullSystemCheck() {
  const results: string[] = [];
  
  // 1. Test Telegram
  try {
    results.push('✅ Telegram: Connected');
  } catch (e) {
    results.push('❌ Telegram: Failed');
  }
  
  // 2. Test Gemini API
  try {
    const { analyzePost } = await import('./llm.js');
    const test = await analyzePost('Test analysis');
    results.push('✅ Gemini AI: Connected');
  } catch (e: any) {
    results.push(`❌ Gemini AI: ${e?.message || 'Failed'}`);
  }
  
  // 3. Test Health endpoint
  try {
    const snap = await getHealthSnapshot();
    results.push(`✅ Health: App ${snap.appOk ? 'OK' : 'FAIL'}`);
    
    // Only test IBKR if trades enabled
    const tradesEnabled = (process.env.DISABLE_TRADES || '').toLowerCase() !== 'true';
    if (tradesEnabled) {
      results.push(`${snap.ibkrOk ? '✅' : '❌'} IBKR: ${snap.ibkrOk ? 'Connected' : 'Not authenticated'}`);
    } else {
      results.push('⚠️ IBKR: Disabled (Safe mode)');
    }
  } catch (e: any) {
    results.push(`❌ Health Check: ${e?.message || 'Failed'}`);
  }
  
  // 4. Test webhook endpoints
  try {
    const appUrl = process.env.APP_URL || 'https://web-production-918d1.up.railway.app';
    const apifyUrl = `${appUrl}/webhook/apify`;
    const gensparkUrl = `${appUrl}/webhook/genspark?secret=${process.env.GENSPARK_WEBHOOK_SECRET || 'moshe454'}`;
    results.push(`✅ Apify Webhook: ${apifyUrl}`);
    results.push(`🎯 Genspark Webhook: ${gensparkUrl}`);
  } catch (e) {
    results.push('❌ Webhook: Setup failed');
  }
  
  // 5. Data sources status
  const synopticEnabled = process.env.SYNOPTIC_API_KEY ? true : false;
  results.push(`🌐 Synoptic WebSocket: ${synopticEnabled ? 'Connected' : 'Disabled'}`);
  results.push(`🔄 Truth Poller: ${process.env.POLL_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
  
  // 6. System status
  results.push(`🛡️ Safe Mode: ${process.env.DISABLE_TRADES === 'true' ? 'ON' : 'OFF'}`);
  results.push(`🧪 Mode: TESTING`);
  results.push(`🎯 System: ${systemActive ? 'ACTIVE' : 'PAUSED'}`);
  
  const report = '🔍 **Trump2Trade Testing System**\n\n' + results.join('\n') + '\n\n💡 Use /help for commands';
  await sendText(report);
}
