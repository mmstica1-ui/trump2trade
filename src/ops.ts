import axios from 'axios';
import * as https from 'https';
import { sendText } from './tg.js';
import { getLastApifyHitMs } from './stats.js';

export function startOpsSelfChecks() {
  const every = Number(process.env.OPS_CHECK_EVERY_MS || '60000');
  setInterval(async () => {
    try {
      const snap = await getHealthSnapshot();
      if (!snap.appOk) await sendText('❗ App healthz failed.');
      if (!snap.ibkrOk) await sendText('❗ IBKR gateway not authenticated.');
      if (snap.msSinceApify > 5*60*1000) await sendText('⚠️ No Apify webhooks in last 5 minutes.');
    } catch (e:any) {
      await sendText(`❌ Self-check error: ${e?.message||e}`);
    }
  }, every);
}

export async function getHealthSnapshot(): Promise<{appOk:boolean; ibkrOk:boolean; msSinceApify:number}> {
  const appUrl = process.env.APP_URL || '';
  let appOk = false, ibkrOk = false;
  try {
    if (appUrl) {
      const r = await axios.get(`${appUrl}/healthz`, { timeout: 5000 });
      appOk = !!r.data?.ok;
    } else {
      appOk = true;
    }
  } catch {}
  try {
    const base = process.env.IBKR_BASE_URL;
    if (base) {
      const r = await axios.get(`${base}/iserver/auth/status`, { timeout: 5000, httpsAgent: new https.Agent({ rejectUnauthorized: false }) });
      ibkrOk = !!(r.data?.authenticated);
    }
  } catch {}
  const msSinceApify = getLastApifyHitMs();
  return { appOk, ibkrOk, msSinceApify };
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

export async function triggerDeploy() {
  const owner = process.env.GH_OWNER;
  const repo = process.env.GH_REPO;
  const ghToken = process.env.GH_PAT;
  if (!owner || !repo || !ghToken) throw new Error('Missing GH_OWNER/GH_REPO/GH_PAT');
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/deploy.yml/dispatches`;
  await axios.post(url, { ref: 'main' }, { headers: { Authorization: `Bearer ${ghToken}`, 'Accept': 'application/vnd.github+json' } });
}

export async function pauseApifySchedule() {
  const token = process.env.APIFY_TOKEN;
  const scheduleId = process.env.APIFY_SCHEDULE_ID;
  if (!token || !scheduleId) throw new Error('Missing APIFY_TOKEN/APIFY_SCHEDULE_ID');
  await axios.put(`https://api.apify.com/v2/schedules/${scheduleId}`, { isEnabled: false }, { headers: { Authorization: `Bearer ${token}` } });
}

export async function resumeApifySchedule() {
  const token = process.env.APIFY_TOKEN;
  const scheduleId = process.env.APIFY_SCHEDULE_ID;
  if (!token || !scheduleId) throw new Error('Missing APIFY_TOKEN/APIFY_SCHEDULE_ID');
  await axios.put(`https://api.apify.com/v2/schedules/${scheduleId}`, { isEnabled: true }, { headers: { Authorization: `Bearer ${token}` } });
}
