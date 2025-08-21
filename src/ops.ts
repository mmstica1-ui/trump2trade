import axios from 'axios';
import * as https from 'https';
import { sendText } from './tg.js';

export function startOpsSelfChecks() {
  const every = Number(process.env.OPS_CHECK_EVERY_MS || '60000');
  const checkIbkr = (process.env.DISABLE_TRADES || '').toLowerCase() !== 'true';
  
  setInterval(async () => {
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
