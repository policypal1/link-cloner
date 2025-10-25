// api/create.js
import crypto from 'crypto';
import { kv } from '../lib/kv.js';

function base(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host']  || req.headers.host;
  return `${proto}://${host}`;
}

async function readJson(req) {
  // Some builders parse req.body, some don't—handle both.
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  await new Promise((res, rej) => {
    req.on('data', (c) => (raw += c));
    req.on('end', res);
    req.on('error', rej);
  });
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    let body;
    try { body = await readJson(req); }
    catch { res.status(400).json({ error: 'invalid_json' }); return; }

    const { url, owner, meta, webhookUrl } = body || {};
    if (!url) { res.status(400).json({ error: 'missing_url' }); return; }

    let parsed;
    try { parsed = new URL(url); }
    catch { res.status(400).json({ error: 'invalid_url' }); return; }

    const id = crypto.randomBytes(4).toString('hex');
    const link = { url: parsed.toString(), owner: owner || 'unknown', meta: meta || {}, createdAt: Date.now() };

    // store
    await kv.set(`links:${id}`, link);
    await kv.sadd('link_ids', id);

    const short = `${base(req)}/api/${id}`;

    // optional webhook notify
    let posted = false;
    const hook = webhookUrl || process.env.DISCORD_WEBHOOK_URL;
    if (hook) {
      try {
        await fetch(hook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `🔗 **Short link created:** ${short}\n→ Target: <${link.url}>\n_(Share only with consenting users.)_`
          })
        });
        posted = true;
      } catch {
        posted = false; // don't fail creation if webhook errors
      }
    }

    res.status(200).json({ short, id, posted });
  } catch (err) {
    // absolute last-resort JSON
    res.status(500).json({ error: 'internal', details: String(err?.message || err) });
  }
}
