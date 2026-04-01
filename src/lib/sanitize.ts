/**
 * Sanitize user text input to prevent XSS.
 * Strips HTML tags and trims whitespace.
 */
export const sanitizeText = (input: string): string => {
  return input
    .replace(/[<>]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
};

/**
 * Magic bytes signatures for allowed image types.
 */
const IMAGE_MAGIC_BYTES: { type: string; bytes: number[] }[] = [
  { type: "image/jpeg", bytes: [0xFF, 0xD8, 0xFF] },
  { type: "image/png", bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
];

/**
 * Validate file type by checking magic bytes (file signature).
 * Falls back to MIME type check if ArrayBuffer read fails.
 */
export const isValidImageType = async (file: File): Promise<boolean> => {
  try {
    const buffer = await file.slice(0, 8).arrayBuffer();
    const header = new Uint8Array(buffer);
    return IMAGE_MAGIC_BYTES.some(({ bytes }) =>
      bytes.every((b, i) => header[i] === b)
    );
  } catch {
    // Fallback to MIME check
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    return allowed.includes(file.type);
  }
};

/**
 * Validate file size (max 5MB).
 */
export const isValidFileSize = (file: File, maxMB = 5): boolean => {
  return file.size <= maxMB * 1024 * 1024;
};

/**
 * Validate an uploaded image file (async - checks magic bytes).
 */
export const validateImageUpload = async (file: File): Promise<string | null> => {
  const validType = await isValidImageType(file);
  if (!validType) {
    return "يسمح فقط بصيغ JPG و PNG";
  }
  if (!isValidFileSize(file)) {
    return "حجم الملف يتجاوز 5 ميغابايت";
  }
  return null;
};
