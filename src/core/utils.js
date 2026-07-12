// 纯业务逻辑工具函数集合（核心层）
// 本模块 SHALL NOT 依赖任何 DOM/浏览器/Node.js API。
// 所有函数均为纯函数：无副作用、无平台依赖。

// 字段分组映射：将 UI 字段组名映射到具体的 EXIF 字段列表
export const fieldGroupMap = {
  dateTimeOriginal: ['dateTimeOriginal'],
  gps: ['gpsLat', 'gpsLng'],
  equip: ['make', 'model'],
  software: ['software'],
};

// 解析 EXIF 日期字符串 "YYYY:MM:DD HH:MM:SS" 或 "YYYY-MM-DD HH:MM:SS"
// 返回 { date: "YYYY-MM-DD", time: "HH:MM:SS" } 或 null
export function parseExifDate(val) {
  if (!val) return null;
  const m = String(val).trim().match(/^(\d{4})[:\-](\d{2})[:\-](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const sec = m[6] || '00';
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}:${sec}` };
}

// 将日期 + 时间组合为 EXIF 格式 "YYYY:MM:DD HH:MM:SS"
export function dtToExif(dateStr, timeStr) {
  if (!dateStr && !timeStr) return null;
  const d = dateStr || '0000:00:00';
  const t = timeStr || '00:00';
  const tNorm = /^\d{2}:\d{2}:\d{2}$/.test(t) ? t : `${t}:00`;
  const dNorm = d.replace(/-/g, ':');
  return `${dNorm} ${tNorm}`;
}

// 格式化 GPS 经纬度为展示字符串 "39.9163°N, 116.3972°E"
export function formatGps(lat, lng) {
  if (lat == null || lng == null) return '';
  const ns = Number(lat) >= 0 ? 'N' : 'S';
  const ew = Number(lng) >= 0 ? 'E' : 'W';
  return `${Math.abs(Number(lat)).toFixed(4)}°${ns}, ${Math.abs(Number(lng)).toFixed(4)}°${ew}`;
}

// 分类 EXIF 解析错误，返回 { key, warn, symbol } 或 null
// key 用于 i18n 翻译键（error.notValidJpeg / error.notImageFile / error.exifFailed）
export function classifyExifError(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase();
  if (/wrong jpeg data/.test(s) || /not a valid jpeg/.test(s) || /invalid jpeg/.test(s)) {
    return { key: 'notValidJpeg', warn: false, symbol: '!' };
  }
  if (/invalid file data/.test(s) || /invalid file format/.test(s) || /unsupported format/.test(s)) {
    return { key: 'notImageFile', warn: true, symbol: '?' };
  }
  return { key: 'exifFailed', warn: false, symbol: '!' };
}

// 判断某字段是否被用户手动修改过（用于信息区高亮显示）
// editedBy 存在且 value 非 null/undefined
export function hasEdit(image, field) {
  if (!image || !image.edits || !image.edits[field]) return false;
  const e = image.edits[field];
  return !!e.editedBy && e.value !== null && e.value !== undefined;
}

// 判断某字段是否被用户清除（editedBy 存在且 value=null/undefined）
// 清除的字段在导出时会从 EXIF 删除；查看修改后信息时以删除线深红显示
export function isCleared(image, field) {
  if (!image || !image.edits || !image.edits[field]) return false;
  const e = image.edits[field];
  return !!e.editedBy && (e.value === null || e.value === undefined);
}

// 检查单张图片是否存在任意修改（含清除）
export function hasAnyEdit(image) {
  if (!image || !image.edits) return false;
  const e = image.edits;
  return !!(e.dateTimeOriginal && e.dateTimeOriginal.editedBy)
      || !!(e.gpsLat && e.gpsLat.editedBy)
      || !!(e.gpsLng && e.gpsLng.editedBy)
      || !!(e.make && e.make.editedBy)
      || !!(e.model && e.model.editedBy)
      || !!(e.software && e.software.editedBy);
}

// 检查单张图片是否有 GPS 位置（编辑值优先于原始值）
export function hasAnyLocation(image) {
  if (!image || !image.edits || !image.summary) return false;
  const latEdit = image.edits.gpsLat;
  const lngEdit = image.edits.gpsLng;
  const lat = latEdit && latEdit.editedBy ? latEdit.value : image.summary.gpsLat;
  const lng = lngEdit && lngEdit.editedBy ? lngEdit.value : image.summary.gpsLng;
  return lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));
}

// 根据 showEdited 状态读取字段的"展示值"
// - showEdited=true 且用户有编辑 → 使用 edits 中保存的值
// - showEdited=false 或字段未被修改 → 使用 summary 中的原始值
export function getDisplayValue(image, field, showEdited) {
  if (!image || !field) return null;
  const edit = image.edits && image.edits[field];
  const edited = edit && edit.editedBy && edit.value !== null && edit.value !== undefined;
  if (showEdited && edited) return edit.value;
  const raw = image.summary && image.summary[field];
  return raw;
}

// 检查字段组在多张图片中是否存在修改（editedBy 存在且 value 非 null）
export function groupHasEdits(images, fieldGroup) {
  if (!Array.isArray(images) || images.length === 0) return false;
  const fields = fieldGroupMap[fieldGroup] || [fieldGroup];
  return images.some((image) =>
    fields.some((f) => image && image.edits && image.edits[f] && image.edits[f].editedBy && image.edits[f].value !== null)
  );
}

// 检查多张图片中是否存在某字段的修改
export function anyImageHasEdit(images, field) {
  if (!Array.isArray(images) || images.length === 0) return false;
  return images.some((image) => hasEdit(image, field));
}

// 格式化 EXIF 日期 "YYYY:MM:DD HH:MM:SS" → "YYYY-MM-DD HH:MM:SS"（用于展示）
export function formatExifDate(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  const m = s.match(/^(\d{4}):(\d{2}):(\d{2})([ T])(\d{2}):(\d{2}):(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]} ${m[5]}:${m[6]}:${m[7]}`;
  return s;
}

// 格式化文件大小为人类可读字符串（如 "1.5 MB"）
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
