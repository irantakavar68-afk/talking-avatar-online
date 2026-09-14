// api/config.js — only PUBLIC Cloudinary configuration is exposed here.
// No secrets belong in this file. The D-ID key lives only in server env vars.

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    CLOUDINARY_UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET || '',
    // Injected into the page so client-side Cloudinary unsigned upload works.
    CLIENT_SNIPPET: `<script>window.APP_CONFIG={CLOUDINARY_CLOUD_NAME:"${process.env.CLOUDINARY_CLOUD_NAME || ''}",CLOUDINARY_UPLOAD_PRESET:"${process.env.CLOUDINARY_UPLOAD_PRESET || ''}"};</script>`
  });
};
