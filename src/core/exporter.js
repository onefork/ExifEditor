import JSZip from 'jszip';
import { writeExif } from './exif-writer.js';

let _fileSaver = null;
let _notifier = null;

export function initExporter({ fileSaver, notifier } = {}) {
  _fileSaver = fileSaver || null;
  _notifier = notifier || null;
}

// notifier 是可选的；未注入时静默跳过，调用失败也不影响导出主流程
async function safeNotifyProgress(percent) {
  if (!_notifier) return;
  try { await _notifier.showProgress(percent); } catch (e) {}
}

async function safeNotifyCancel() {
  if (!_notifier) return;
  try { await _notifier.cancelProgress(); } catch (e) {}
}

// 为每张图片生成修改后的 Blob; 非 JPEG 跳过并在进度里标注
async function processImage(image, report) {
  if (image.summary && image.summary.isJpeg === false && !/jpe?g/i.test(image.file.name || '')) {
    // 回退检测
    if (!/jpe?g/i.test(image.file.name || '') && (image.file.type && !/jpeg/.test(image.file.type))) {
      return { skipped: true, reason: 'non-jpeg' };
    }
  }
  try {
    // 将 summary.rawBinary 传入，避免重复读取
    const editsWithRaw = { ...image.edits };
    if (image.summary && image.summary.rawBinary) editsWithRaw.__rawBinary = image.summary.rawBinary;
    const blob = await writeExif(image.file, editsWithRaw);
    return { blob, skipped: false };
  } catch (err) {
    if (err && err.code === 'UNSUPPORTED_FORMAT') return { skipped: true, reason: 'non-jpeg' };
    return { skipped: true, reason: err?.message || String(err) };
  }
}

function outputFileName(file) {
  const name = file.name || 'image.jpg';
  const dot = name.lastIndexOf('.');
  const base = dot >= 0 ? name.slice(0, dot) : name;
  const ext = dot >= 0 ? name.slice(dot) : '.jpg';
  return `${base}_exif${ext}`;
}

export async function exportOneByOne(images, onProgress) {
  if (!_fileSaver) {
    throw new Error('Exporter not initialized. Call initExporter({ fileSaver, notifier }) first.');
  }
  const total = images.length;
  const results = [];
  const blobs = [];
  const fileNames = [];
  let lastNotifPercent = -1;

  for (let i = 0; i < total; i++) {
    const im = images[i];
    const out = outputFileName(im.file);
    const res = await processImage(im);
    results.push({ image: im, ...res, fileName: out });
    if (onProgress) onProgress({ index: i, total, percent: Math.round(((i + 1) / total) * 100), name: im.file.name });

    // 收集 blob，最后统一保存
    if (res.blob) {
      blobs.push(res.blob);
      fileNames.push(out);
    }

    // 进度通知（每 10% 更新一次）
    const percent = Math.round(((i + 1) / total) * 100);
    if (percent - lastNotifPercent >= 10) {
      lastNotifPercent = percent;
      await safeNotifyProgress(percent);
    }

    // 让出事件循环，避免长时间阻塞
    await new Promise((r) => setTimeout(r, 50));
  }

  // 统一保存（具体保存方式由 fileSaver 适配器决定）
  if (blobs.length > 0) {
    await safeNotifyCancel();
    await _fileSaver.saveBatch(blobs, fileNames);
    await safeNotifyCancel();
  }

  return results;
}

export async function exportZip(images, onProgress) {
  if (!_fileSaver) {
    throw new Error('Exporter not initialized. Call initExporter({ fileSaver, notifier }) first.');
  }
  const total = images.length;
  const zip = new JSZip();
  const nameCounts = {};

  for (let i = 0; i < total; i++) {
    const im = images[i];
    const out = outputFileName(im.file);
    const res = await processImage(im);
    if (res.blob) {
      const n = nameCounts[out] = (nameCounts[out] || 0) + 1;
      const finalName = n > 1 ? `${out.replace(/\.([^.]+)$/, '')}_${n}.${out.replace(/^.*\.([^.]+)$/, '$1')}` : out;
      zip.file(finalName || `image_${i}.jpg`, res.blob);
    }
    if (onProgress) {
      const mid = Math.round(((i + 1) / total) * 50);
      onProgress({ index: i, total, percent: mid, name: im.file.name, stage: 'write' });
    }

    // 进度通知
    if (i % Math.max(1, Math.floor(total / 5)) === 0) {
      const pct = Math.round(((i + 1) / total) * 50);
      await safeNotifyProgress(pct);
    }

    await new Promise((r) => setTimeout(r, 10));
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    if (onProgress) onProgress({ percent: 50 + Math.round(metadata.percent / 2), stage: 'zip' });
  });

  // 保存 ZIP（具体保存方式由 fileSaver 适配器决定）
  await safeNotifyCancel();
  await _fileSaver.saveZip(zipBlob);

  return zipBlob;
}
