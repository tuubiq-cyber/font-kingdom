/**
 * Canvas-based image processing for font matching.
 * All operations run in the browser for speed.
 */

/** Load an image URL into an HTMLImageElement */
export const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/** Get pixel data from an image URL at a fixed size */
export const getImageData = async (
  src: string,
  width: number,
  height: number
): Promise<ImageData> => {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  // Draw image centered/fitted
  const scale = Math.min(width / img.width, height / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
  return ctx.getImageData(0, 0, width, height);
};

/** Parse hex color to RGB */
const hexToRgb = (hex: string) => {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
};

/** Color distance (Euclidean) */
const colorDist = (
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number
) => Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);

/**
 * Normalize a cropped image to black text on white background
 * using the user-picked text and background colors.
 */
export const normalizeImage = async (
  imageSrc: string,
  textColorHex: string,
  bgColorHex: string,
  width = 200,
  height = 80
): Promise<ImageData> => {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const scale = Math.min(width / img.width, height / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const textRgb = hexToRgb(textColorHex);
  const bgRgb = hexToRgb(bgColorHex);

  // For each pixel, determine if it's closer to text color or bg color
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const distToText = colorDist(r, g, b, textRgb.r, textRgb.g, textRgb.b);
    const distToBg = colorDist(r, g, b, bgRgb.r, bgRgb.g, bgRgb.b);

    if (distToText < distToBg) {
      // Text pixel → black
      data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
    } else {
      // Background pixel → white
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
    }
  }

  return imageData;
};

/**
 * Compare two ImageData objects using structural similarity.
 * Returns a score from 0 to 100.
 */
export const compareImages = (img1: ImageData, img2: ImageData): number => {
  const d1 = img1.data;
  const d2 = img2.data;
  const len = Math.min(d1.length, d2.length);
  let matchingPixels = 0;
  let totalPixels = 0;

  for (let i = 0; i < len; i += 4) {
    // Compare luminance (grayscale)
    const l1 = d1[i] * 0.299 + d1[i + 1] * 0.587 + d1[i + 2] * 0.114;
    const l2 = d2[i] * 0.299 + d2[i + 1] * 0.587 + d2[i + 2] * 0.114;
    const isText1 = l1 < 128;
    const isText2 = l2 < 128;

    // Only count pixels where at least one has text
    if (isText1 || isText2) {
      totalPixels++;
      if (isText1 === isText2) {
        matchingPixels++;
      }
    }
  }

  if (totalPixels === 0) return 0;
  return Math.round((matchingPixels / totalPixels) * 100);
};

/**
 * Normalize a reference image the same way (already should be clean,
 * but we ensure consistent size and binary format).
 */
export const normalizeReferenceImage = async (
  src: string,
  width = 200,
  height = 80
): Promise<ImageData> => {
  const imgData = await getImageData(src, width, height);
  const data = imgData.data;

  // Binarize: threshold at 128 luminance
  for (let i = 0; i < data.length; i += 4) {
    const l = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const v = l < 128 ? 0 : 255;
    data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
  }

  return imgData;
};
