// api/talk.js — validates input and calls the official D-ID Talks API.
// CommonJS handler for Vercel serverless (Node >= 18, built-in fetch, no deps).

const ALLOWED_AUDIO_EXT = ['mp3', 'wav', 'm4a', 'flac', 'mp4'];
const D_ID_API = 'https://api.d-id.com/talks';
const D_ID_API_KEY_RAW = 'Z29vZ2xlLW9hdXRoMnwxMDI3NzI2MTY3OTA3Mzg4MDkwMTZAYWtfNVUtcW5tMWZsT2M2R29yOHdQbVFQ:KE-Hy2L7ph9VBor9SyJRh';


function send(res, status, obj) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).json(obj);
}

function buildAuthHeader(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    return null;
  }

  // Remove an optional Basic prefix.
  const value = raw.trim().replace(/^Basic\s+/i, '').trim();

  if (!value) return null;

  // Raw D-ID key: API_USER:API_PASSWORD
  if (value.includes(':')) {
    return 'Basic ' + Buffer.from(value, 'utf8').toString('base64');
  }

  // Already Base64-encoded credentials.
  return 'Basic ' + value;
}


function validateCloudinaryUrl(url, kind) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return 'لینک ' + kind + ' باید HTTPS باشد.';
    const cloud = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
    if (!cloud) return 'متغیر محیطی CLOUDINARY_CLOUD_NAME روی سرور تنظیم نشده است.';
    const hostOk = u.hostname === 'res.cloudinary.com';
    const pathParts = u.pathname.split('/').filter(Boolean); // [cloud, type, resource, ...]
    if (!hostOk || pathParts[0] !== cloud) return 'لینک ' + kind + ' باید متعلق به کلود ' + cloud + ' باشد.';
    const last = pathParts[pathParts.length - 1].split('.')[0]; // strip format
    const ext = (u.pathname.split('.').pop() || '').toLowerCase();
    if (kind === 'عکس' && ext !== 'jpg' && ext !== 'jpeg' && ext !== 'png') {
      return 'فرمت عکس باید JPG یا PNG باشد.';
    }
    if (kind === 'صوت' && ALLOWED_AUDIO_EXT.indexOf(ext) === -1) {
      return 'فرمت صوت باید یکی از ' + ALLOWED_AUDIO_EXT.join('/') + ' باشد.';
    }
    return null;
  } catch (e) {
    return 'لینک ' + kind + ' معتبر نیست.';
  }
}

module.exports = async (req, res) => {
  const configuredKey = D_ID_API_KEY_RAW;
  console.log("D key configuration check", {
    keyPresent:
      typeof configuredKey === "string" &&
      configuredKey.trim().length > 0,
    environment: process.env.VERCEL_ENV || "unknown"
  });

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'فقط POST مجاز است.' });

  const apiKey = buildAuthHeader(D_ID_API_KEY_RAW);
  if (!apiKey) return send(res, 500, { error: 'متغیر محیطی D_ID_API_KEY تنظیم نشده است.' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return send(res, 400, { error: 'بدنه JSON نامعتبر است.' });
  }

  const text = String(body.text || '').trim();
  const imageUrl = String(body.imageUrl || '').trim();
  const audioUrl = String(body.audioUrl || '').trim();

  if (!text) return send(res, 400, { error: 'متن الزامی است.' });
  if (text.length > 5000) return send(res, 400, { error: 'متن حداکثر ۵۰۰۰ کاراکتر است.' });
  if (!imageUrl) return send(res, 400, { error: 'لینک عکس الزامی است.' });
  if (!audioUrl) return send(res, 400, { error: 'لینک صوت الزامی است.' });

  let err = validateCloudinaryUrl(imageUrl, 'عکس');
  if (err) return send(res, 400, { error: err });
  err = validateCloudinaryUrl(audioUrl, 'صوت');
  if (err) return send(res, 400, { error: err });

  const payload = {
    source_url: imageUrl,
    script: {
      type: 'audio',
      audio_url: audioUrl,
      subtitles: 'false'
    },
    config: {
      result_format: 'mp4'
    }
  };


  try {
    const r = await fetch(D_ID_API, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const raw = await r.text();
    let data;
    try { data = raw ? JSON.parse(raw) : {}; } catch (e) { data = { raw: raw }; }

    if (!r.ok) {
      const msg = (data && (data.description || data.message || data.error)) || ('D-ID HTTP ' + r.status);
     return send(res, r.status === 401 ? 401 : 502, {
      error: 'خطای D-ID (HTTP ' + r.status + '): ' +
        (typeof msg === 'string' ? msg : JSON.stringify(msg))
    });

    }

    if (!data || !data.id) {
      return send(res, 502, { error: 'پاسخ D-ID فاقد شناسه است.', detail: data });
    }

    return send(res, 200, { id: data.id, status: data.status || 'created' });
  } catch (e) {
    return send(res, 502, { error: 'عدم دسترسی به D-ID: ' + (e && e.message ? e.message : String(e)) });
  }
};
