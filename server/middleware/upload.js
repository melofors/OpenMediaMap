const multer = require("multer");

// --- ESM-only file-type support (Node 18+ / 24 safe) ---
let fileTypeFromBuffer;

async function getFileTypeFromBuffer(buffer) {
  if (!fileTypeFromBuffer) {
    ({ fileTypeFromBuffer } = await import("file-type"));
  }
  return fileTypeFromBuffer(buffer);
}

// Allowlist only common raster image types
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // Early MIME gate (cheap, but not trusted)
    if (!file || !ALLOWED_MIME.has(file.mimetype)) {
      return cb(
        new Error("Only JPG, PNG, WEBP, or GIF images are allowed"),
        false
      );
    }
    cb(null, true);
  },
});

// Strong validation: verify magic bytes
async function verifyImageMagicBytes(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) return next();

    const type = await getFileTypeFromBuffer(req.file.buffer);

    if (!type || !ALLOWED_MIME.has(type.mime)) {
      return res.status(400).json({
        error: "Invalid or unsupported image file",
      });
    }

    return next();
  } catch (err) {
    console.error("Upload validation failed:", err);
    return res.status(400).json({ error: "Invalid upload" });
  }
}

module.exports = { upload, verifyImageMagicBytes };