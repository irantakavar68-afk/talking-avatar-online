// api/status.js — polls D-ID talk status and returns the final video URL.
// CommonJS handler for Vercel serverless (Node >= 18, built-in fetch, no deps).

function send(res, status, obj) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).json(obj);
}

function buildAuthHeader(raw) {
  if (!raw) return null;
  let key = String(raw).trim();
  if (key.toLowerCase().startsWith('basic ')) return 'Basic ' + key.slice(6).trim();
  return 'Basic ' + key;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'فقط GET مجاز است.' });

  const apiKey = buildAuthHeader(process.env.D_ID_API_KEY);
  if (!apiKey) return send(res, 500, { error: 'متغیر محیطی D_ID_API_KEY تنظیم نشده است.' });

  const id = String(req.query.id || '').trim();
  if (!id || !/^[A-Za-z0-9_\-@:.]{6,200}$/.test(id)) {
    return send(res, 400, { error: 'شناسه گفتار نامعتبر است.' });
  }

  try {
    const r = await fetch('https://api.d-id.com/talks/' + encodeURIComponent(id), {
      method: 'GET',
      headers: {
        'Authorization': apiKey,
        'Accept': 'application/json'
      }
    });

    const raw = await r.text();
    let data;
    try { data = raw ? JSON.parse(raw) : {}; } catch (e) { data = { raw: raw }; }

    if (!r.ok) {
      return send(res, r.status === 404 ? 404 : 502, {
        error: 'خطای D-ID: ' + ((data && (data.description || data.message)) || ('HTTP ' + r.status))
      });
    }

    const status = String(data.status || '').toLowerCase();
    if (status === 'done' && data.result_url) {
      return send(res, 200, { id: id, status: 'done', resultUrl: data.result_url });
    }
    if (status === 'error' || status === 'rejected' || status === 'failed') {
      return send(res, 200, {
        id: id,
        status: 'error',
        error: 'ساخت ویدیو توسط D-ID ناموفق بود: ' + (data.error && (data.error.description || data.error.kind) || 'نامشخص')
      });
    }

    // started / created / queued → still processing
    return send(res, 200, { id: id, status: status || 'processing' });
  } catch (e) {
    return send(res, 502, { error: 'عدم دسترسی به D-ID: ' + (e && e.message ? e.message : String(e)) });
  }
};
