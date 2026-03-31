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
 * Validate file type (images only).
 */
export const isValidImageType = (file: File): boolean => {
  const allowed = ["image/jpeg", "image/jpg", "image/png"];
  return allowed.includes(file.type);
};

/**
 * Validate file size (max 5MB).
 */
export const isValidFileSize = (file: File, maxMB = 5): boolean => {
  return file.size <= maxMB * 1024 * 1024;
};

/**
 * Validate an uploaded image file.
 */
export const validateImageUpload = (file: File): string | null => {
  if (!isValidImageType(file)) {
    return "يسمح فقط بصيغ JPG و PNG";
  }
  if (!isValidFileSize(file)) {
    return "حجم الملف يتجاوز 5 ميغابايت";
  }
  return null;
};
