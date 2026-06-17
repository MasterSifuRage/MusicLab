const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export interface ProcessImageOptions {
  maxWidth: number;
  maxHeight: number;
  maxBytes: number;
  quality?: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode image"))),
      type,
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

function fitDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export function isAcceptedImage(file: File) {
  return ACCEPTED_TYPES.includes(file.type);
}

export async function processImageFile(file: File, options: ProcessImageOptions): Promise<string> {
  if (!isAcceptedImage(file)) {
    throw new Error("INVALID_TYPE");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("FILE_TOO_LARGE");
  }

  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);
  const { width, height } = fitDimensions(img.width, img.height, options.maxWidth, options.maxHeight);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_ERROR");
  ctx.drawImage(img, 0, 0, width, height);

  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const startQuality = options.quality ?? (outputType === "image/png" ? 1 : 0.88);

  let quality = startQuality;
  let result = await canvasToBlob(canvas, outputType, quality);
  while (result.size > options.maxBytes && quality > 0.45) {
    quality -= 0.08;
    result = await canvasToBlob(canvas, outputType, quality);
  }

  if (result.size > options.maxBytes) {
    throw new Error("COMPRESSED_TOO_LARGE");
  }

  return blobToDataUrl(result);
}

export const AVATAR_IMAGE_OPTIONS: ProcessImageOptions = {
  maxWidth: 320,
  maxHeight: 320,
  maxBytes: 280 * 1024,
};

export const COVER_IMAGE_OPTIONS: ProcessImageOptions = {
  maxWidth: 1400,
  maxHeight: 480,
  maxBytes: 700 * 1024,
};
