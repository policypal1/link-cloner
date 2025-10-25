import { kv } from '../../lib/kv.js';
import { parseDevice, hashIp, getIp } from '../../lib/util.js';
import { serialize } from 'cookie';

async function sendWebhook(ev, id, link) {
  const hook = process.env.DISCORD_WEBHOOK_URL;
  if (!hook) return;
  try {
    await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: 'New consented click',
          description: `**Short:** https://${process.env.VERCEL_URL || ''}/${id}\n**Target:** <${link.url}>`,
          fields: [
            { name: 'Device',   value: String(ev.device || 'unknown'), inline: true },
            { name: 'Time',     value: new Date(ev.ts).toISOString(), inline: true }
          ],
          footer: { text: 'Privacy: no IP, no identifiers. GPC/DNT honored.' }
        }]
      })
    });
  } catch { /* ignore webhook errors */ }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const { id } = req.query;
  const link = await kv.get(`links:${id}`);
  if (!link) return res.status(404).send('Not found');

  // set consent cookie for 1 year
  const cookie = serialize('analytics_consent', '1', {
    path: '/', maxAge: 60*60*24*365, sameSite: 'Lax', httpOnly: false, secure: true
  });
  res.setHeader('Set-Cookie', cookie);

  // Log one event immediately after consent
  const ev = {
    ts: Date.now(),
    device: parseDevice(req.headers['user-agent'] || ''),
    referer: req.headers['referer'] || null,
    ipHash: hashIp(getIp(req))
  };
  await kv.rpush(`events:${id}`, JSON.stringify(ev));

  // Notify Discord (first click right after consent)
  await sendWebhook(ev, id, link);

  res.status(204).end();
}
