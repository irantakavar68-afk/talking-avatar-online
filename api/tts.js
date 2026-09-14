function send(res, status, data) {
  res.status(status).json(data);
}

module.exports data) {
  res.status(status).json(data);
}

module.exports = async (req, res return send(res, 405, {
      error: 'فقط درخواست POST مجاز است.'
    });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return send(res, 500, {
      error: 'ELEVENLABS_API_KEY تنظیم نشده است.'
    });
  }

  let body;

  try {
    body =
      typeof req.body === 'string'
        ? JSON.parse(req.body)
        : req.body || {};
  } catch {
    return send(res, 400, {
      error: 'بدنه JSON نامعتبر است.'
    });
  }

  const text = String(body.text || '').trim();
  const voiceId = String(body.voiceId || '').trim();

  if (!text) {
    return send(res, 400, {
      error:, 400, {
      error: 'متن گفتار الزامی (!voiceId) {
    return send(res, 400, {
      error: 'voiceId الزامی است.'
    });
  }

  if (text.length > 5000) {
    return send(res, 400, {
      error: 'متن نباید بیشتر از ۵۰۰۰ کاراکتر باشد.'
    });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg'
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      }
    );

    const audioBuffer = Buffer.from(
      await response.arrayBuffer()
    );

    if (!response.ok) {
      return send(res, response.status, {
        error: 'خطا در ElevenLabs',
        detail: audioBuffer.toString('utf8')
      });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="generated-speech.mp3"'
    );

    return res.status(200).send(audioBuffer);
  } catch (error) {
    return send(res, 502, {
      error: 'ارتباط با ElevenLabs برقرار نشد.',
      detail: error.message
    });
  }
};
