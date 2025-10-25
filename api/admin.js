export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');

  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end(`<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Create a short link</title>
  <style>
    body{font-family:system-ui,Arial;max-width:680px;margin:auto;padding:24px}
    input,button{padding:10px;margin:6px 0;width:100%}
    .ok{color:#0a7c2f}
    .err{color:#b00020}
    pre{background:#f6f6f6;padding:12px;border-radius:8px;white-space:pre-wrap}
    .row{display:grid;gap:8px}
  </style>
</head>
<body>
  <h2>Create a short link</h2>
  <form id="f" class="row">
    <input name="url" placeholder="https://example.com" required />
    <input name="owner" placeholder="owner (optional)" />
    <input name="adminKey" placeholder="ADMIN_KEY (leave blank — not used)" />
    <input name="webhookUrl" placeholder="Discord webhook URL (optional; overrides env var)" />
    <button type="submit">Create</button>
  </form>

  <div id="status"></div>
  <pre id="out"></pre>

  <script>
    const f = document.getElementById('f');
    const out = document.getElementById('out');
    const status = document.getElementById('status');

    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      out.textContent = '';
      status.textContent = 'Creating…';

      const data = Object.fromEntries(new FormData(f).entries());

      try {
        const r = await fetch('/api/create', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(data)
        });

        let json;
        try {
          json = await r.json();
        } catch (e) {
          status.innerHTML = '<span class="err">HTTP ' + r.status + ' — response was not JSON</span>';
          return;
        }

        if (!r.ok) {
          status.innerHTML = '<span class="err">Error: ' + (json.error || ('HTTP ' + r.status)) + '</span>';
          out.textContent = JSON.stringify(json, null, 2);
          return;
        }

        // Success
        status.innerHTML = '<span class="ok">Success — short link created.</span>';
        out.textContent = JSON.stringify(json, null, 2);

        if (json.short && navigator.clipboard) {
          try { await navigator.clipboard.writeText(json.short); }
          catch (_) {}
        }
      } catch (err) {
        status.innerHTML = '<span class="err">Network error — check console.</span>';
        console.error(err);
      }
    });
  </script>
</body>
</html>`);
}
