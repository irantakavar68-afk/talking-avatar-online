// api/status.js — polls D-ID talk status and returns the final video URL.
// CommonJS handler for Vercel serverless (Node >= 18, built-in fetch, no deps).

// کلید موقت D-ID — همان کلید استفاده‌شده در talk.js
const D_ID_API_KEY_RAW = 'Z29vZ2xlLW9hdXRoMnwxMDI3NzI2MTY3OTA3Mzg4MDkwMTZAYWtfNVUtcW5tMWZsT2M2R29yOHdQbVFQ:KE-Hy2L7ph9VBor9SyJRh';

function send(res, status, obj) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).json(obj);
}

function buildAuthHeader(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    return null;
  }

  const value = raw.trim().replace(/^Basic\s+/i, '').trim();

  if (!value) {
    return null;
  }

  // کلید خام D-ID با قالب API_USER:API_PASSWORD
  if (value.includes(':')) {
    return 'Basic ' + Buffer.from(value, 'utf8').toString('base64');
  }

  // اگر مقدار از قبل Base64 شده باشد
  return 'Basic ' + value;
}


module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'فقط GET مجاز است.' });

  const apiKey = buildAuthHeader(D_ID_API_KEY_RAW);
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
