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

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({
        error: "کلید ElevenLabs در تنظیمات سرور تعریف نشده است."
      });
    }

    // دریافت فایل صوتی از Cloudinary
    const audioResponse = await fetch(audioUrl);

    if (!audioResponse.ok) {
      return res.status(400).json({
        error: "دریافت فایل صوتی از Cloudinary ناموفق بود."
      });
    }

    const audioBuffer = await audioResponse.arrayBuffer();

    const audioBlob = new Blob([audioBuffer], {
      type:
        audioResponse.headers.get("content-type") ||
        "audio/mpeg"
    });

    // ارسال فایل از سرور به ElevenLabs
    const formData = new FormData();

    formData.append(
      "files",
      audioBlob,
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

    const result = await elevenResponse.json();

    if (!elevenResponse.ok) {
      return res.status(elevenResponse.status).json({
        error:
          result.detail?.message ||
          result.detail ||
          result.message ||
          "خطا در کلون صدا توسط ElevenLabs",
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
