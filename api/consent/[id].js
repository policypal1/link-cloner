// api/consent/[id].js
import { kv } from '../../lib/kv.js';
import { parseDevice, hashIp, getIp } from '../../lib/util.js';
import { serialize } from 'cookie';

async function notifyClick({ id, link, ev, req }) {
  const hook = process.env.DISCORD_WEBHOOK_URL;
  if (!hook) return;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers.host;
  const lang  = (req.headers['accept-language'] || '').split(',')[0] || 'unknown';

  try {
    await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: 'New consented click',
          description: `**Short:** ${proto}://${host}/api/${id}\n**Target:** <${link.url}>`,
          fields: [
            { name: 'Device',   value: String(ev.device || 'unknown'), inline: true },
            { name: 'Language', value: lang, inline: true },
            { name: 'Referrer', value: ev.referer || '—', inline: false },
            { name: 'Time',     value: new Date(ev.ts).toLocaleString(), inline: false }
          ],
          footer: { text: 'Privacy: no raw IP stored; GPC/DNT respected.' }
        }]
      })
    });
  } catch {}
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const { id } = req.query;
  const link = await kv.get(`links:${id}`);
  if (!link) return res.status(404).send('Not found');

  // Set consent cookie for 1 year
  res.setHeader('Set-Cookie', serialize('analytics_consent', '1', {
    path: '/', maxAge: 60*60*24*365, sameSite: 'Lax', httpOnly: false, secure: true
  }));

  const ev = {
    ts: Date.now(),
    device: parseDevice(req.headers['user-agent'] || ''),
    referer: req.headers['referer'] || null,
    ipHash: hashIp(getIp(req))
  };
  await kv.rpush(`events:${id}`, JSON.stringify(ev));

  await notifyClick({ id, link, ev, req });

  res.status(204).end();
}
