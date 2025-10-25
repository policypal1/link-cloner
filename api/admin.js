export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end(`<!doctype html><html><body style="font-family:system-ui,Arial;max-width:640px;margin:auto;padding:24px">
<h2>Create a short link</h2>
<form id="f"><input name="url" placeholder="https://example.com" style="width:100%;padding:10px" required/>
<input name="owner" placeholder="owner (optional)" style="width:100%;padding:10px;margin-top:8px"/>
<input name="adminKey" placeholder="ADMIN_KEY (if set)" style="width:100%;padding:10px;margin-top:8px"/>
<input name="webhookUrl" placeholder="Discord webhook URL (optional)" style="width:100%;padding:10px;margin-top:8px"/>
<button type="submit" style="padding:10px 16px;margin-top:10px">Create</button></form>
<pre id="out" style="background:#f6f6f6;padding:12px;border-radius:8px;margin-top:12px"></pre>
<script>
const f=document.getElementById('f'),out=document.getElementById('out');
f.addEventListener('submit',async e=>{e.preventDefault();
 const data=Object.fromEntries(new FormData(f).entries());
 const r = await fetch('/api/create', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 out.textContent=JSON.stringify(await r.json(),null,2);
});
</script></body></html>`);
}
