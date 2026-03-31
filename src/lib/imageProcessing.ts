/**
 * Canvas-based image processing for font matching.
 * Implements SSIM (Structural Similarity Index) and perceptual hashing.
 * All operations run in the browser via Canvas API for speed.
 */

// ─── Image Loading ──────────────────────────────────────────

export const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

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
  const scale = Math.min(width / img.width, height / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
  return ctx.getImageData(0, 0, width, height);
};

// ─── Color Utilities ────────────────────────────────────────

const hexToRgb = (hex: string) => {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
};

const colorDist = (
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number
) => Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);

const toLuminance = (r: number, g: number, b: number) =>
  r * 0.299 + g * 0.587 + b * 0.114;

// ─── Image Normalization ────────────────────────────────────

/** Standard size for all comparison operations */
const MATCH_WIDTH = 256;
const MATCH_HEIGHT = 96;

/**
 * Normalize user's cropped image to binary (black text on white)
 * using picked text/bg colors.
 */
export const normalizeImage = async (
  imageSrc: string,
  textColorHex: string,
  bgColorHex: string,
  width = MATCH_WIDTH,
  height = MATCH_HEIGHT
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

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const distToText = colorDist(r, g, b, textRgb.r, textRgb.g, textRgb.b);
    const distToBg = colorDist(r, g, b, bgRgb.r, bgRgb.g, bgRgb.b);
    if (distToText < distToBg) {
      data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
    } else {
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
    }
  }
  return imageData;
};

/** Normalize a reference image to binary at standard size */
export const normalizeReferenceImage = async (
  src: string,
  width = MATCH_WIDTH,
  height = MATCH_HEIGHT
): Promise<ImageData> => {
  const imgData = await getImageData(src, width, height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const l = toLuminance(data[i], data[i + 1], data[i + 2]);
    const v = l < 128 ? 0 : 255;
    data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
  }
  return imgData;
};

// ─── SSIM (Structural Similarity Index) ─────────────────────

/** Convert ImageData to grayscale float array */
const toGrayscale = (imgData: ImageData): Float32Array => {
  const d = imgData.data;
  const pixels = imgData.width * imgData.height;
  const gray = new Float32Array(pixels);
  for (let i = 0; i < pixels; i++) {
    const idx = i * 4;
    gray[i] = toLuminance(d[idx], d[idx + 1], d[idx + 2]) / 255;
  }
  return gray;
};

/** Calculate mean of a float array */
const mean = (arr: Float32Array): number => {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return sum / arr.length;
};

/** Calculate variance */
const variance = (arr: Float32Array, mu: number): number => {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += (arr[i] - mu) ** 2;
  return sum / arr.length;
};

/** Calculate covariance */
const covariance = (a: Float32Array, b: Float32Array, muA: number, muB: number): number => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - muA) * (b[i] - muB);
  return sum / a.length;
};

/**
 * Full-image SSIM calculation.
 * Returns score 0-100.
 * Uses constants: C1 = (0.01)^2, C2 = (0.03)^2 (standard for [0,1] range)
 */
export const calculateSSIM = (img1: ImageData, img2: ImageData): number => {
  const g1 = toGrayscale(img1);
  const g2 = toGrayscale(img2);
  const len = Math.min(g1.length, g2.length);

  // Use windowed SSIM for better accuracy (8x8 blocks)
  const w = img1.width;
  const h = img1.height;
  const blockSize = 8;
  const C1 = 0.0001; // (0.01)^2
  const C2 = 0.0009; // (0.03)^2
  let ssimSum = 0;
  let blockCount = 0;

  for (let by = 0; by <= h - blockSize; by += blockSize) {
    for (let bx = 0; bx <= w - blockSize; bx += blockSize) {
      const block1 = new Float32Array(blockSize * blockSize);
      const block2 = new Float32Array(blockSize * blockSize);
      let bi = 0;

      for (let y = by; y < by + blockSize; y++) {
        for (let x = bx; x < bx + blockSize; x++) {
          const idx = y * w + x;
          if (idx < len) {
            block1[bi] = g1[idx];
            block2[bi] = g2[idx];
          }
          bi++;
        }
      }

      const mu1 = mean(block1);
      const mu2 = mean(block2);
      const sigma1sq = variance(block1, mu1);
      const sigma2sq = variance(block2, mu2);
      const sigma12 = covariance(block1, block2, mu1, mu2);

      const numerator = (2 * mu1 * mu2 + C1) * (2 * sigma12 + C2);
      const denominator = (mu1 * mu1 + mu2 * mu2 + C1) * (sigma1sq + sigma2sq + C2);
      ssimSum += numerator / denominator;
      blockCount++;
    }
  }

  if (blockCount === 0) return 0;
  const ssim = ssimSum / blockCount;
  // SSIM is [-1, 1], but for binary images it's usually [0, 1]
  return Math.round(Math.max(0, ssim) * 100);
};

// ─── Perceptual Hash (pHash) ────────────────────────────────

/**
 * Generate a 64-bit perceptual hash of an image.
 * Uses a simplified DCT approach:
 * 1. Resize to 32x32 grayscale
 * 2. Compute mean of pixel values
 * 3. Generate hash bits based on > or < mean
 * Returns hex string of the hash.
 */
export const generatePerceptualHash = async (imageSrc: string): Promise<string> => {
  const size = 32;
  const imgData = await getImageData(imageSrc, size, size);
  const gray = toGrayscale(imgData);

  // Reduce to 8x8 by averaging 4x4 blocks
  const reduced = new Float32Array(64);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      let sum = 0;
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 4; dx++) {
          sum += gray[(y * 4 + dy) * size + (x * 4 + dx)];
        }
      }
      reduced[y * 8 + x] = sum / 16;
    }
  }

  const avg = mean(reduced);
  let hash = "";
  for (let i = 0; i < 64; i++) {
    hash += reduced[i] >= avg ? "1" : "0";
  }

  // Convert binary string to hex
  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    hex += parseInt(hash.substring(i, i + 4), 2).toString(16);
  }
  return hex;
};

/**
 * Hamming distance between two hex hashes.
 * Returns similarity as 0-100.
 */
export const hashSimilarity = (hash1: string, hash2: string): number => {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 0;

  // Convert to binary
  const toBin = (hex: string) =>
    hex.split("").map((c) => parseInt(c, 16).toString(2).padStart(4, "0")).join("");

  const bin1 = toBin(hash1);
  const bin2 = toBin(hash2);
  let diff = 0;
  for (let i = 0; i < bin1.length; i++) {
    if (bin1[i] !== bin2[i]) diff++;
  }
  return Math.round((1 - diff / bin1.length) * 100);
};

// ─── Combined Matching ──────────────────────────────────────

export interface MatchResult {
  fontName: string;
  ssimScore: number;
  hashScore: number;
  combinedScore: number;
}

/**
 * Run full matching pipeline: SSIM + pHash.
 * SSIM weighted 70%, hash weighted 30%.
 */
export const matchFont = async (
  userNormalized: ImageData,
  userHashHex: string,
  refImageUrl: string,
  refHash?: string | null
): Promise<{ ssim: number; hash: number; combined: number }> => {
  let ssimScore = 0;
  let hashScore = 0;

  try {
    const refNormalized = await normalizeReferenceImage(refImageUrl);
    ssimScore = calculateSSIM(userNormalized, refNormalized);
  } catch (e) {
    console.warn("SSIM failed:", e);
  }

  if (refHash) {
    hashScore = hashSimilarity(userHashHex, refHash);
  } else {
    try {
      const refHashComputed = await generatePerceptualHash(refImageUrl);
      hashScore = hashSimilarity(userHashHex, refHashComputed);
    } catch (e) {
      console.warn("Hash comparison failed:", e);
    }
  }

  const combined = Math.round(ssimScore * 0.7 + hashScore * 0.3);
  return { ssim: ssimScore, hash: hashScore, combined };
};
