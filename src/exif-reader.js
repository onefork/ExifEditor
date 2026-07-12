import piexif from 'piexifjs';

const JPEG_MIME = 'image/jpeg';

function bufferToBinaryString(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return binary;
}

function rationalVal(rational) {
  if (!rational) return null;
  try {
    if (Array.isArray(rational[0])) {
      return rational[0][0] / rational[0][1];
    }
    if (rational.length === 2 && typeof rational[0] === 'number') {
      return rational[0] / rational[1];
    }
  } catch (e) {}
  return null;
}

// 清理 EXIF ASCII 字符串:
// 1. 截断到第一个 0x00(NUL 终止符)
// 2. 过滤掉所有控制字符 (<0x20 除 \r\n\t) 和 0x7f
// 3. 两端空白
function cleanAscii(raw) {
  if (raw == null) return null;
  let s = typeof raw === 'string' ? raw : String(raw);
  const firstNul = s.indexOf('\0');
  if (firstNul !== -1) s = s.slice(0, firstNul);
  s = s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
  s = s.trim();
  return s === '' ? null : s;
}

function degMinSecToDecimal(dms, ref) {
  if (!dms || !Array.isArray(dms) || dms.length !== 3) return null;
  try {
    const deg = rationalVal(dms[0]) || (Array.isArray(dms[0]) ? dms[0][0] / dms[0][1] : null);
    const min = rationalVal(dms[1]) || (Array.isArray(dms[1]) ? dms[1][0] / dms[1][1] : 0);
    const sec = rationalVal(dms[2]) || (Array.isArray(dms[2]) ? dms[2][0] / dms[2][1] : 0);
    let decimal = (deg || 0) + (min || 0) / 60 + (sec || 0) / 3600;
    if (ref === 'S' || ref === 'W') decimal = -decimal;
    return decimal;
  } catch (e) {
    return null;
  }
}

// 格式化 EXIF 日期 "YYYY:MM:DD HH:MM:SS" → "YYYY-MM-DD HH:MM:SS"
export function formatExifDate(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  const m = s.match(/^(\d{4}):(\d{2}):(\d{2})([ T])(\d{2}):(\d{2}):(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]} ${m[5]}:${m[6]}:${m[7]}`;
  return s;
}

function formatExposureTime(rational) {
  const num = rationalVal(rational);
  if (num == null) return null;
  if (num >= 1) return `${num.toFixed(2)}s`;
  return `1/${Math.round(1 / num)}s`;
}

function formatFNumber(rational) {
  const num = rationalVal(rational);
  if (num == null) return null;
  return `F${num.toFixed(1)}`;
}

function formatIsoSpeed(iso) {
  if (iso == null || iso === '') return null;
  return `ISO${iso}`;
}

function formatFocalLength(rational) {
  const num = rationalVal(rational);
  if (num == null) return null;
  return `${num.toFixed(1)} mm`;
}

function formatFocalLengthMm(rational) {
  // 接收 piexifjs 给出的 rational（如 [53, 10]）或纯数字
  const num = (typeof rational === 'number')
    ? rational
    : rationalVal(rational);
  if (num == null || Number.isNaN(num)) return null;
  return Number(num.toFixed(1));
}

export async function readExif(file) {
  const isJpeg = file.type === JPEG_MIME || /\.(jpe?g)$/i.test(file.name);
  const fileName = file.name;
  const fileSize = file.size;
  const summary = {
    fileName,
    fileSize,
    width: null,
    height: null,
    dateTimeOriginal: null, // EXIF internal "YYYY:MM:DD HH:MM:SS"
    gpsLat: null,
    gpsLng: null,
    make: null,
    model: null,
    software: null,
    exposureTime: null,
    fNumber: null,
    isoSpeedRatings: null,
    exposureBias: null,
    focalLength: null,
    focalLengthIn35mmFilm: null,
    orientation: 1,
    error: null,
    thumbnail: null,
    isJpeg,
  };

  try {
    const buffer = await file.arrayBuffer();
    const binary = bufferToBinaryString(buffer);
    summary.rawBinary = binary;
    let tags = null;
    try {
      tags = piexif.load(binary);
      summary.rawTags = tags;
    } catch (inner) {
      // piexifjs 解析失败(例如 APP1 段损坏),仍然尝试读取图像尺寸
      console.warn('[exif-reader] piexifjs 解析失败:', inner);
      summary.error = 'EXIF 解析失败: ' + (inner && inner.message ? inner.message : String(inner));
    }

    if (tags) {
      const zeroth = tags['0th'] || {};
      const exif = tags['Exif'] || {};
      const gps = tags['GPS'] || {};

      summary.make = cleanAscii(zeroth[piexif.ImageIFD.Make]);
      summary.model = cleanAscii(zeroth[piexif.ImageIFD.Model]);
      summary.software = cleanAscii(zeroth[piexif.ImageIFD.Software]);

      const dto = cleanAscii(exif[piexif.ExifIFD.DateTimeOriginal]);
      const dt = cleanAscii(zeroth[piexif.ImageIFD.DateTime]);
      summary.dateTimeOriginal = dto || dt || null;

      // GPS
      const latRef = gps[piexif.GPSIFD.GPSLatitudeRef];
      const lat = gps[piexif.GPSIFD.GPSLatitude];
      const lngRef = gps[piexif.GPSIFD.GPSLongitudeRef];
      const lng = gps[piexif.GPSIFD.GPSLongitude];
      if (lat && latRef && lng && lngRef) {
        summary.gpsLat = degMinSecToDecimal(lat, latRef);
        summary.gpsLng = degMinSecToDecimal(lng, lngRef);
      }

      // 曝光相关
      summary.exposureTime = formatExposureTime(exif[piexif.ExifIFD.ExposureTime]);
      summary.fNumber = formatFNumber(exif[piexif.ExifIFD.FNumber]);
      summary.isoSpeedRatings = formatIsoSpeed(exif[piexif.ExifIFD.ISOSpeedRatings]);
      const bias = rationalVal(exif[piexif.ExifIFD.ExposureBiasValue]);
      if (bias != null) summary.exposureBias = `${bias > 0 ? '+' : ''}${bias.toFixed(1)} EV`;
      summary.focalLength = formatFocalLengthMm(exif[piexif.ExifIFD.FocalLength]);
      const rawF35 = rationalVal(exif[piexif.ExifIFD.FocalLengthIn35mmFilm]);
      if (rawF35 != null) summary.focalLengthIn35mmFilm = Number(rawF35.toFixed(1));
      const rawFlash = exif[piexif.ExifIFD.Flash];
      summary.flashCode = typeof rawFlash === 'number' ? rawFlash : null;

      const orientation = zeroth[piexif.ImageIFD.Orientation];
      // 合法的 EXIF 方向值为 1..8（1=正常，2=水平镜像，3=180度旋转，4=垂直镜像，5-8=带镜像的 90/270 旋转）。
      // 某些设备会写入 0 或其它非法值，统一回退到 1 以避免后续处理崩溃。
      if (typeof orientation === 'number' && orientation >= 1 && orientation <= 8) {
        summary.orientation = orientation;
      } else {
        summary.orientation = 1;
      }

      const w = exif[piexif.ExifIFD.PixelXDimension];
      const h = exif[piexif.ExifIFD.PixelYDimension];
      if (w) summary.width = w;
      if (h) summary.height = h;
    }

    if (!summary.width || !summary.height) {
      try {
        const img = await decodeImage(file);
        summary.width = img.width;
        summary.height = img.height;
      } catch (e2) {}
    }

    try {
      summary.thumbnail = await generateThumbnail(file, summary.orientation);
    } catch (e3) {}

    return summary;
  } catch (err) {
    summary.error = err && err.message ? err.message : String(err);
    try {
      const img = await decodeImage(file);
      summary.width = img.width;
      summary.height = img.height;
      summary.thumbnail = await generateThumbnail(file, summary.orientation);
    } catch (e2) {}
    return summary;
  }
}

function decodeImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight, img });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      reject(new Error('图像解码失败'));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

async function generateThumbnail(file, orientation) {
  const decoded = await decodeImage(file);
  const maxSize = 200;
  const scale = Math.min(1, maxSize / Math.max(decoded.width, decoded.height));
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
  return canvas.toDataURL('image/jpeg', 0.85);
}

function applyOrientation(ctx, w, h, orientation) {
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

export function humanSize(bytes) {
  if (!bytes) return '0 B';
  const n = Number(bytes);
  if (Number.isNaN(n)) return String(bytes);
  const units = ['B', 'KB', 'MB', 'GB'];
  let val = n;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
