import piexif from 'piexifjs';

// 写入前对 ASCII 字段做一次兜底清理:截断到第一个 \0,并去掉不可打印字符
function cleanAscii(raw) {
  if (raw == null) return null;
  let s = String(raw);
  const firstNul = s.indexOf('\0');
  if (firstNul !== -1) s = s.slice(0, firstNul);
  s = s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
  s = s.trim();
  return s === '' ? null : s;
}

// 将 decimal 坐标转为度/分/秒, 以理性数组
function decimalToDmsRational(decimal) {
  const abs = Math.abs(decimal);
  let deg = Math.floor(abs);
  let minFloat = (abs - deg) * 60;
  let min = Math.floor(minFloat);
  let sec = Math.round((minFloat - min) * 60 * 10000);
  // 秒数进位: round 可能产生 600000 (=60秒), 需进位到分; 分到 60 再进位到度
  if (sec === 600000) { sec = 0; min += 1; }
  if (min === 60) { min = 0; deg += 1; }

  // piexif 格式: [[num, den] 数组
  return [
    [deg * 10000, 10000],
    [min * 10000, 10000],
    [sec, 10000],
  ];
}

function normalizeDateTime(val) {
  if (!val) return null;
  // 支持 YYYY-MM-DD HH:MM:SS 或 YYYY:MM:DD HH:MM:SS 或 ISO 格式
  let s = String(val).trim();
  s = s.replaceAll('-', ':').replace('T', ' ');
  // 可能只有日期补 00:00:00
  if ((/^\d{4}:\d{2}:\d{2}$/).test(s)) s += ' 00:00:00';
  if (!(/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/).test(s)) return null;
  return s;
}

function binaryStringToBlob(binary, mime = 'image/jpeg') {
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// 获取原文件内容 (仅 JPEG)
function bufferToBinaryString(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return binary;
}

export async function writeExif(file, edits) {
  const isJpeg = file.type === 'image/jpeg' || /\.(jpe?g)$/i.test(file.name);
  if (!isJpeg) {
    const err = new Error('UNSUPPORTED_FORMAT');
    err.code = 'UNSUPPORTED_FORMAT';
    throw err;
  }

  let originalBinary;
  if (edits && edits.__rawBinary) {
    originalBinary = edits.__rawBinary;
  } else {
    const buffer = await file.arrayBuffer();
    originalBinary = bufferToBinaryString(buffer);
  }

  let exifObj;
  try {
    exifObj = piexif.load(originalBinary);
  } catch (e) {
    // 若解析失败，构造一个最小 EXIF
    exifObj = { '0th': {}, 'Exif': {}, 'GPS': {}, '1st': {}, 'thumbnail': null, 'Interop': {} };
  }

  // 基础: 确保各 IFD 存在
  if (!exifObj['0th']) exifObj['0th'] = {};
  if (!exifObj['Exif']) exifObj['Exif'] = {};
  if (!exifObj['GPS']) exifObj['GPS'] = {};
  if (!exifObj['Interop']) exifObj['Interop'] = {};

  // 处理各字段
  const fields = edits || {};
  const dateEdit = fields.dateTimeOriginal;
  const dateStr = dateEdit && dateEdit.value !== null && dateEdit.value !== undefined
    ? normalizeDateTime(dateEdit.value)
    : null;
  if (dateStr) {
    exifObj['Exif'][piexif.ExifIFD.DateTimeOriginal] = dateStr;
    exifObj['0th'][piexif.ImageIFD.DateTime] = dateStr;
  } else if (dateEdit && dateEdit.editedBy === 'user') {
    // 用户明确清空：删除原 EXIF 日期
    delete exifObj['Exif'][piexif.ExifIFD.DateTimeOriginal];
    delete exifObj['0th'][piexif.ImageIFD.DateTime];
  }

  const gpsLat = fields.gpsLat ? fields.gpsLat.value : null;
  const gpsLng = fields.gpsLng ? fields.gpsLng.value : null;

  const latValid = gpsLat !== null && gpsLat !== undefined && !isNaN(gpsLat) && Math.abs(Number(gpsLat)) <= 90;
  const lngValid = gpsLng !== null && gpsLng !== undefined && !isNaN(gpsLng) && Math.abs(Number(gpsLng)) <= 180;

  if (latValid) {
    exifObj['GPS'][piexif.GPSIFD.GPSLatitude] = decimalToDmsRational(Number(gpsLat));
    exifObj['GPS'][piexif.GPSIFD.GPSLatitudeRef] = Number(gpsLat) >= 0 ? 'N' : 'S';
  } else if (fields.gpsLat && fields.gpsLat.editedBy === 'user') {
    // 用户明确清空纬度：删除原 EXIF 纬度
    delete exifObj['GPS'][piexif.GPSIFD.GPSLatitude];
    delete exifObj['GPS'][piexif.GPSIFD.GPSLatitudeRef];
  }
  if (lngValid) {
    exifObj['GPS'][piexif.GPSIFD.GPSLongitude] = decimalToDmsRational(Number(gpsLng));
    exifObj['GPS'][piexif.GPSLongitudeRef] = Number(gpsLng) >= 0 ? 'E' : 'W';
  } else if (fields.gpsLng && fields.gpsLng.editedBy === 'user') {
    // 用户明确清空经度：删除原 EXIF 经度
    delete exifObj['GPS'][piexif.GPSIFD.GPSLongitude];
    delete exifObj['GPS'][piexif.GPSIFD.GPSLongitudeRef];
  }
  // 当用户明确清空 GPS (两者均为 user 清空) 时, 删除 GPSVersionID
  const gpsFullyCleared = !latValid && !lngValid
    && fields.gpsLat && fields.gpsLat.editedBy === 'user'
    && fields.gpsLng && fields.gpsLng.editedBy === 'user';
  if (gpsFullyCleared) {
    delete exifObj['GPS'][piexif.GPSIFD.GPSVersionID];
  } else if (latValid || lngValid) {
    exifObj['GPS'][piexif.GPSIFD.GPSVersionID] = [2, 0, 0, 0];
  }

  if (fields.make && fields.make.value) {
    exifObj['0th'][piexif.ImageIFD.Make] = cleanAscii(fields.make.value) || String(fields.make.value);
  } else if (fields.make && fields.make.editedBy === 'user') {
    delete exifObj['0th'][piexif.ImageIFD.Make];
  }
  if (fields.model && fields.model.value) {
    exifObj['0th'][piexif.ImageIFD.Model] = cleanAscii(fields.model.value) || String(fields.model.value);
  } else if (fields.model && fields.model.editedBy === 'user') {
    delete exifObj['0th'][piexif.ImageIFD.Model];
  }
  if (fields.software && fields.software.value) {
    exifObj['0th'][piexif.ImageIFD.Software] = cleanAscii(fields.software.value) || String(fields.software.value);
  } else if (fields.software && fields.software.editedBy === 'user') {
    delete exifObj['0th'][piexif.ImageIFD.Software];
  }

  // 确保 0th 需要的两个必填项
  if (!exifObj['0th'][piexif.ImageIFD.XResolution]) exifObj['0th'][piexif.ImageIFD.XResolution] = [72, 1];
  if (!exifObj['0th'][piexif.ImageIFD.YResolution]) exifObj['0th'][piexif.ImageIFD.YResolution] = [72, 1];
  if (!exifObj['0th'][piexif.ImageIFD.ResolutionUnit]) exifObj['0th'][piexif.ImageIFD.ResolutionUnit] = 2;

  // 清理缩略图 IFD, 避免保留原始缩略图导致文件膨胀或与主图不一致
  delete exifObj['thumbnail'];
  delete exifObj['1st'];

  const exifBytes = piexif.dump(exifObj);
  const newBinary = piexif.insert(exifBytes, originalBinary);
  return binaryStringToBlob(newBinary, 'image/jpeg');
}
