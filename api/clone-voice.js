const formidable = require('formidable');

function send(res, status, data) {
  res.status(status).json(data);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return send(res, 405, {
      error: 'فقط درخواست POST مجاز است.'
    });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return send(res, 500, {
      error: 'ELEVENLABS_API_KEY در تنظیمات سرور وجود ندارد.'
    });
  }

  const form = formidable({
    multiples: false,
    maxFileSize: 25 * 1024 * 10241024 * 1024
  });

  try {
    const [fields, files]    const uploadedFile = Array.isArray(files.voiceSample)
      ? files.voiceSample[0]
      : files.voiceSample;

    if (!uploadedFile) {
      return send(res, 400, {
        error: 'فایل voiceSample ارسال نشده است.'
      });
    }

    const fileBuffer = require('fs').readFileSync(
      uploadedFile.filepath
    );

    const formData = new FormData();

    formData.append(
      'name',
      String(fields.name?.[0] || 'Persian Avatar Voice')
    );

    formData.append(
      'files',
      new Blob([fileBuffer], {
        type: uploadedFile.mimetype || 'audio/mpeg'
      }),
      uploadedFile.originalFilename || 'voice-sample.mp3'
    );

    const response = await fetch(
      'https://api.elevenlabs.io/v1/voices/add',
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey
        },
        body: formData
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return send(res, response.status, {
        error: 'خطا در ساخت کلون صدا',
        detail: result
      });
    }

    return send(res, 200, {
      success: true,
      voiceId: result.voice_id,
      name: result.name
    });
  } catch (error) {
    return send(res, 500, {
      error: 'ساخت کلون صدا انجام نشد.',
      detail: error.message
    });
  }
};
