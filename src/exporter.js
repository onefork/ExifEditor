import JSZip from 'jszip';
import { writeExif } from './exif-writer.js';
import { isAndroid, saveBlobToFolder, saveBlobBatch, showNotification, showProgressNotification, cancelProgressNotification } from './android-compat.js';

// Web 平台 (非 Android): 通过 <a download> 触发浏览器下载。
// Android 走 saveBlobToFolder / saveBlobBatch 原生保存路径。
function triggerBrowserDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 延迟释放，避免浏览器还没开始读取 blob
  setTimeout(() => URL.revokeObjectURL(url), 1500);
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
  const total = images.length;
  const results = [];
  const blobs = [];
  const fileNames = [];
  let savedCount = 0;
  let lastNotifPercent = -1;

  // Android: 显示导出开始通知
  if (isAndroid()) {
    await showProgressNotification('图片信息编辑器', `正在导出 ${total} 张图片…`);
  }

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
      savedCount++;
    }

    // Android: 更新进度通知（每 10% 更新一次）
    const percent = Math.round(((i + 1) / total) * 100);
    if (isAndroid() && percent - lastNotifPercent >= 10) {
      lastNotifPercent = percent;
      await showProgressNotification('图片信息编辑器', `导出进度 ${percent}% (${i + 1}/${total})`);
    }

    // 让浏览器有机会绘制
    await new Promise((r) => setTimeout(r, 50));
  }

  // Android: 统一保存（先尝试直接保存到相册，失败则弹出分享菜单）
  if (isAndroid() && blobs.length > 0) {
    await cancelProgressNotification();
    await showProgressNotification('图片信息编辑器', `正在保存 ${blobs.length} 张图片到相册…`);
    const saveResults = await saveBlobBatch(blobs, fileNames);
    const directSaved = saveResults.filter((r) => r.direct).length;
    await cancelProgressNotification();

    if (directSaved > 0) {
      await showNotification('保存完成', `已直接保存 ${directSaved} 张图片到相册（DCIM/exif-editor）`);
    } else {
      await showNotification('导出完成', `已处理 ${savedCount} 张图片，请通过分享菜单选择保存位置`);
    }
  } else if (blobs.length > 0) {
    // Web: 逐个触发浏览器下载。注意：main.js 当前只传单张；若传多张，
    // 浏览器可能拦截第二个及之后的下载（建议多张用 exportZip）。
    for (let i = 0; i < blobs.length; i++) {
      triggerBrowserDownload(blobs[i], fileNames[i]);
    }
  }

  return results;
}

export async function exportZip(images, onProgress) {
  const total = images.length;
  const zip = new JSZip();
  const nameCounts = {};

  // Android: 显示导出开始通知
  if (isAndroid()) {
    await showProgressNotification('图片信息编辑器', `正在打包 ${total} 张图片…`);
  }

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

    // Android: 更新进度通知
    if (isAndroid() && i % Math.max(1, Math.floor(total / 5)) === 0) {
      const pct = Math.round(((i + 1) / total) * 50);
      await showProgressNotification('图片信息编辑器', `写入 EXIF… ${pct}% (${i + 1}/${total})`);
    }

    await new Promise((r) => setTimeout(r, 10));
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    if (onProgress) onProgress({ percent: 50 + Math.round(metadata.percent / 2), stage: 'zip' });
  });

  // 保存 ZIP（直接保存到 Download 目录，失败则弹出分享菜单）
  if (isAndroid()) {
    await cancelProgressNotification();
    await showProgressNotification('图片信息编辑器', '正在保存 ZIP 文件…');
    const saveResult = await saveBlobToFolder(zipBlob, 'edited_images.zip');
    await cancelProgressNotification();

    if (saveResult.direct) {
      await showNotification('保存完成', 'ZIP 已保存到 Download/exif-editor 目录');
    } else {
      await showNotification('导出完成', 'ZIP 已生成，请通过分享菜单选择保存位置');
    }
  } else {
    // Web: 触发浏览器下载 ZIP
    triggerBrowserDownload(zipBlob, 'edited_images.zip');
  }

  return zipBlob;
}
