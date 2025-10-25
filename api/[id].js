import { kv } from '../lib/kv.js';
import { parseDevice, hashIp, privacySignals, getIp } from '../lib/util.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');
  const { id } = req.query;
  const link = await kv.get(`links:${id}`);
  if (!link) return res.status(404).send('Not found');

  if (privacySignals(req)) {
    res.writeHead(302, { Location: link.url }); return res.end();
  }

  const cookies = Object.fromEntries((req.headers.cookie || '')
    .split(';').map(c => c.trim().split('=')).filter(([k]) => k));
  const consent = cookies['analytics_consent'] === '1';

  if (consent) {
    const ev = {
      ts: Date.now(),
      device: parseDevice(req.headers['user-agent'] || ''),
      referer: req.headers['referer'] || null,
      ipHash: hashIp(getIp(req))
    };
    await kv.rpush(`events:${id}`, JSON.stringify(ev));
    res.writeHead(302, { Location: link.url }); return res.end();
  }

  // interstitial
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`
<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Consent required</title>
<style>
body{font-family:system-ui,Arial;background:#f7f7f7;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.card{background:#fff;width:min(520px,90vw);padding:22px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.08)}
button{padding:10px 16px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;margin-right:8px}
.primary{background:#0b74de;color:#fff;border-color:#0b74de}
</style></head><body><div class="card">
<h2>Allow anonymous analytics?</h2>
<p>We collect device category, timestamp, and a hashed IP to count clicks. No names, emails, or precise location.</p>
<div><button onclick="decline()">Decline & continue</button>
<button class="primary" onclick="allow()">Allow & continue</button></div>
<p style="color:#666;font-size:12px;margin-top:10px;">Revoke later by clearing this cookie.</p>
</div>
<script>
async function allow(){await fetch('/consent/${id}',{method:'POST',credentials:'include'});location.href=${JSON.stringify(link.url)}}
function decline(){location.href=${JSON.stringify(link.url)}}
</script></body></html>`);
}
