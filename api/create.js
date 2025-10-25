// POST /create { url, owner?, meta?, adminKey?, webhookUrl? } -> { short, id, posted }
import { kv } from '../lib/kv.js';
import crypto from 'crypto';
import { absoluteBaseUrl } from '../lib/util.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { url, owner, meta, adminKey, webhookUrl } = req.body || {};
    if (!url) return res.status(400).json({ error: 'missing url' });
    new URL(url); // validate

    // optional protection
    if (process.env.ADMIN_KEY && adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const id   = crypto.randomBytes(4).toString('hex');
    const link = { url, owner: owner || 'unknown', meta: meta || {}, createdAt: Date.now() };
    await kv.set(`links:${id}`, link);
    await kv.sadd('link_ids', id);

    const short  = `${absoluteBaseUrl(req)}/${id}`;
    const hook   = webhookUrl || process.env.DISCORD_WEBHOOK_URL;
    let posted = false;

    if (hook) {
      try {
        await fetch(hook, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            content: `🔗 **Short link created:** ${short}\n→ Target: <${url}>\n_(Share only with consenting users.)_`
          })
        });
        posted = true;
      } catch { /* ignore webhook errors */ }
    }

    res.status(200).json({ short, id, posted });
  } catch {
    res.status(400).json({ error: 'invalid url' });
  }
}
