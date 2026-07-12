// Web platform ImageDecoder — uses Canvas / Image / createObjectURL.
// Extracted from src/exif-reader.js (decodeImage, generateThumbnail,
// applyOrientation). Core's readExif receives this via { imageDecoder }.

const THUMBNAIL_MAX_SIZE = 200;
const THUMBNAIL_QUALITY = 0.85;

// Decode an image file into an HTMLImageElement plus its natural dimensions.
// Uses new Image() + URL.createObjectURL (broad browser compatibility).
function decodeImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight, img });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图像解码失败'));
    };
    img.src = url;
  });
}

// Apply EXIF Orientation (1-8) correction to a 2D canvas context.
// Orientations 5-8 involve 90°/270° rotation, so the caller must swap the
// canvas width/height before invoking this.
export function applyOrientation(ctx, w, h, orientation) {
  switch (orientation) {
    case 2: ctx.translate(w, 0); ctx.scale(-1, 1); break;
    case 3: ctx.translate(w, h); ctx.rotate(Math.PI); break;
    case 4: ctx.translate(0, h); ctx.scale(1, -1); break;
    case 5: ctx.rotate(0.5 * Math.PI); ctx.scale(1, -1); break;
    case 6: ctx.rotate(0.5 * Math.PI); ctx.translate(0, -h); break;
    case 7: ctx.rotate(0.5 * Math.PI); ctx.translate(w, -h); ctx.scale(-1, 1); break;
    case 8: ctx.rotate(-0.5 * Math.PI); ctx.translate(-w, 0); break;
    default: break;
  }
}

export const webImageDecoder = {
  async decode(file) {
    const decoded = await decodeImageElement(file);
    return { width: decoded.width, height: decoded.height };
  },

  async generateThumbnail(file, orientation) {
    const decoded = await decodeImageElement(file);
    const scale = Math.min(1, THUMBNAIL_MAX_SIZE / Math.max(decoded.width, decoded.height));
    const w = Math.round(decoded.width * scale);
    const h = Math.round(decoded.height * scale);
    // orientation 5-8 需要旋转/翻转, 画布宽高需交换
    const swap = orientation >= 5 && orientation <= 8;
    const canvasW = swap ? h : w;
    const canvasH = swap ? w : h;
    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');
    applyOrientation(ctx, canvasW, canvasH, orientation);
    ctx.drawImage(decoded.img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', THUMBNAIL_QUALITY);
  },
};

export default webImageDecoder;
