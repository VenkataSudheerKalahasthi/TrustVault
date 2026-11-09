import multer from 'multer';
import path from 'path';

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.txt',
  '.csv',
  '.docx',
  '.xlsx',
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error(`Unsupported file extension: ${ext}. Supported: PDF, PNG, JPG, TXT, CSV, DOCX, XLSX.`));
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error(`Unsupported MIME type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

/**
 * Validates magic number / file header signature to detect spoofed files
 * (Mandatory Adversarial Scenario 8: Misleading extensions or malicious payloads)
 */
export function validateFileSignature(buffer: Buffer, originalName: string, mimeType: string): {
  isValid: boolean;
  error?: string;
} {
  const ext = path.extname(originalName).toLowerCase();

  if (buffer.length < 4) {
    return { isValid: false, error: 'File is too small or corrupt' };
  }

  // 1. PDF Signature: %PDF- (0x25 0x50 0x44 0x46)
  if (ext === '.pdf') {
    const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    if (!isPdf) {
      return { isValid: false, error: 'File header does not match a valid PDF document signature' };
    }
  }

  // 2. PNG Signature: 0x89 0x50 0x4E 0x47
  if (ext === '.png') {
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    if (!isPng) {
      return { isValid: false, error: 'File header does not match a valid PNG image signature' };
    }
  }

  // 3. JPEG Signature: 0xFF 0xD8 0xFF
  if (ext === '.jpg' || ext === '.jpeg') {
    const isJpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (!isJpg) {
      return { isValid: false, error: 'File header does not match a valid JPEG image signature' };
    }
  }

  // 4. DOCX/XLSX: OpenXML (ZIP archive): PK\x03\x04 (0x50 0x4B 0x03 0x04)
  if (ext === '.docx' || ext === '.xlsx') {
    const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
    if (!isZip) {
      return { isValid: false, error: 'File header does not match valid OpenXML document format' };
    }
  }

  return { isValid: true };
}

