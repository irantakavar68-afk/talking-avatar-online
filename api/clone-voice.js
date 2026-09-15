export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "فقط درخواست POST مجاز است."
    });
  }

  try {
    const { audioUrl } = req.body || {};

    if (!audioUrl || typeof audioUrl !== "string") {
      return res.status(400).json({
        error: "لینک فایل صوتی ارسال نشده است."
      });
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(audioUrl);
    } catch {
      return res.status(400).json({
        error: "لینک فایل صوتی معتبر نیست."
      });
    }

    if (
      parsedUrl.protocol !== "https:" ||
      parsedUrl.hostname !== "res.cloudinary.com"
    ) {
      return res.status(400).json({
        error: "فایل باید از Cloudinary دریافت شود."
      });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({
        error: "کلید ElevenLabs در تنظیمات سرور تعریف نشده است."
      });
    }

    const audioResponse = await fetch(audioUrl);

    if (!audioResponse.ok) {
      return res.status(400).json({
        error: "دریافت فایل صوتی از Cloudinary ناموفق بود."
      });
    }

    const contentLength = Number(
      audioResponse.headers.get("content-length") || 0
    );

    const maxBytes = 10 * 1024 * 1024;

    if (contentLength > maxBytes) {
      return res.status(413).json({
        error: "حجم فایل صوتی بیشتر از حد مجاز است."
      });
    }

    const audioBuffer = await audioResponse.arrayBuffer();

    if (audioBuffer.byteLength > maxBytes) {
      return res.status(413).json({
        error: "حجم فایل صوتی بیشتر از حد مجاز است."
      });
    }

    const contentType =
      audioResponse.headers.get("content-type") || "audio/mpeg";

    const formData = new FormData();

    formData.append(
      "files",
      new Blob([audioBuffer], { type: contentType }),
      "voice-sample.mp3"
    );

    formData.append("name", `Cloned Voice ${Date.now()}`);

    const elevenResponse = await fetch(
      "https://api.elevenlabs.io/v1/voices/add",
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY
        },
        body: formData
      }
    );

    const responseText = await elevenResponse.text();

    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      result = {
        message: responseText || "پاسخ معتبر JSON نیست."
      };
    }

    if (!elevenResponse.ok) {
      return res.status(502).json({
        error:
          result.detail?.message ||
          result.detail ||
          result.message ||
          "خطا در ElevenLabs",
        upstreamStatus: elevenResponse.status,
        details: result
      });
    }

    return res.status(200).json({
      success: true,
      voiceId: result.voice_id,
      voice_id: result.voice_id
    });
  } catch (error) {
    console.error("clone-voice error:", error);

    return res.status(500).json({
      error: error.message || "خطای داخلی سرور"
    });
  }
}
