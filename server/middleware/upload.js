// server/middleware/upload.js

const multer = require("multer");

// =======================
// MULTER CONFIG (KEEP)
// =======================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },

  fileFilter: (req, file, cb) => {
    // Basic check (magic bytes does real validation later)
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images allowed"), false);
    }

    cb(null, true);
  },
});


// =======================
// MAGIC BYTE VALIDATION
// =======================

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function detectMimeFromMagicBytes(buf) {
  if (!buf || buf.length < 12) return null;

  // PNG
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }

  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }

  // GIF
  if (
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61
  ) {
    return "image/gif";
  }

  // WEBP
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}


// =======================
// VALIDATION MIDDLEWARE
// =======================

async function verifyImageMagicBytes(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) return next();

    const detected = detectMimeFromMagicBytes(req.file.buffer);

    if (!detected || !ALLOWED_MIME.has(detected)) {
      return res.status(400).json({
        error: "Invalid or unsupported image file",
      });
    }

    // Override client mimetype
    req.file.mimetype = detected;

    next();
  } catch (err) {
    console.error("Upload validation failed:", err);
    res.status(400).json({ error: "Invalid upload" });
  }
}


// =======================
// EXPORTS (KEEP)
// =======================

module.exports = {
  upload,
  verifyImageMagicBytes,
};