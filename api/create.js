// POST /api/create  { url, owner?, meta?, webhookUrl? } -> { short, id, posted }
import { kv } from '../lib/kv.js';
import crypto from 'crypto';
import { absoluteBaseUrl } from '../lib/util.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, owner, meta, webhookUrl } = req.body || {};
    if (!url) return res.status(400).json({ error: 'missing url' });

    let parsed;
    try { parsed = new URL(url); } catch { return res.status(400).json({ error: 'invalid url' }); }

    const id = crypto.randomBytes(4).toString('hex');
    const link = { url: parsed.toString(), owner: owner || 'unknown', meta: meta || {}, createdAt: Date.now() };

    try {
      await kv.set(`links:${id}`, link);
      await kv.sadd('link_ids', id);
    } catch (e) {
      // Even if KV fails, return a helpful error instead of crashing
      return res.status(500).json({ error: 'kv_write_failed', details: String(e?.message || e) });
    }

    const short = `${absoluteBaseUrl(req)}/api/${id}`;

    // Optional Discord webhook
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
      } catch (e) {
        // Don’t fail creation if Discord is down
        posted = false;
      }
    }

    return res.status(200).json({ short, id, posted });
  } catch (err) {
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
}
