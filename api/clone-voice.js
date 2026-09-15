module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'فقط درخواست POST مجاز است.'
    });
  }

  try {
    const { audioUrl } = req.body || {};

    if (!audioUrl || typeof audioUrl !== 'string') {
      return res.status(400).json({
        error: 'آدرس فایل صوتی ارسال نشده است.'
      });
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(audioUrl);
    } catch {
      return res.status(400).json({
        error: 'آدرس فایل صوتی معتبر نیست.'
      });
    }

    if (parsedUrl.protocol !== 'https: {
      return res.status(400).jsonjson({
        error: 'آدرس فایل صوتی باید با HTTPS شروع شود.'
      });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({
        error: 'متغیر ELEVENLABS_API_KEY در Vercel تنظیم نشده است.'
      });
    }

    const audioResponse = await fetch(audioUrl);

    if (!audioResponse.ok) {
      return res.status(400).json({
        error: 'دریافت فایل صوتی از Cloudinary ناموفق بود.'
      });
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const contentType =
      audioResponse.headers.get('content-type') || 'audio/mpeg';

    const audioFile = new File(
      [audioBuffer],
      'voice-sample.mp3',
      { type: contentType }
    );

    const formData = new FormData();

    formData.append(
      'name',
      process.env.ELEVENLABS_VOICE_NAME || 'Cloned Voice'
    );

    formData.append(
      'description'
    );

    formData.append(
      'description',
      'VoiceData.append('files', audioFile);

    const elevenLabsResponse = await fetch(
      'https://api.elevenlabs.io/v1/voices/add',
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        },
        body: formData
      }
    );

    const responseText = await elevenLabsResponse.text();

    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      return res.status(502).json({
        error: 'ElevenLabs پاسخ JSON معتبر برنگرداند.'
      });
    }

    if (!elevenLabsResponse.ok) {
      const detail = responseData.detail;

      return res.status(elevenLabsResponse.status).json({
        error:
          (detail && detail.message) ||
          detail ||
          responseData.message ||
          'ساخت کلون صدا در ElevenLabs ناموفق بود.'
      });
    }

    if (!responseData.voice_id) {
      return res.status(502).json({
        error: 'شناسه صدای ساخته‌شده از ElevenLabs دریافت نشد.'
      });
    }

    return res.status(200).json({
      voiceId: responseData.voice_id
    });
  } catch (error) {
    console.error('clone-voice error:', error);

    return res.status(500).json({
      error: 'خطای داخلی در ساخت کلون صدا رخ داد.'
    });
  }
};
