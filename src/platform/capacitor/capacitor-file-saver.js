import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// 是否运行在 Android 原生平台
export function isAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

// 获取 Android 主版本号，非 Android 返回 null
export function getAndroidVersion() {
  const ua = navigator.userAgent || '';
  const m = ua.match(/Android\s+(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

// Blob 转 base64（不含 data: 前缀）
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.error) reject(reader.error);
      else resolve(reader.result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ====================================================================
// 保存到相册/路径
// ====================================================================
// 策略：逐级尝试公共目录 → app 私有目录 → Cache + Share
// 1. Directory.ExternalStorage + DCIM/ExifEditor/  → 直接进相册（Android ≤10）
// 2. Directory.ExternalStorage + Download/ExifEditor/  → 进下载目录（ZIP，Android ≤10）
// 3. Directory.External (app 私有) + ExifEditor/  → 保底，不需权限
// 4. Directory.Cache + Share        → 最终回退
// 注意：Android 11+ 强制 Scoped Storage，Directory.ExternalStorage 写入公共目录会被拒绝，
// 因此 Android 11+ 直接跳过步骤 1-2，走 app 私有目录 + Share。

// 根据文件类型选择目标子目录
function getSaveSubPath(fileName) {
  const isImage = /\.jpe?g$/i.test(fileName);
  const isZip = /\.zip$/i.test(fileName);
  if (isZip) return `Download/ExifEditor/${fileName}`;
  if (isImage) return `DCIM/ExifEditor/${fileName}`;
  return `Documents/ExifEditor/${fileName}`;
}

// 直接保存到公共目录（相册/下载等），不需要用户交互
// Android 11+ 强制 Scoped Storage，写入公共目录会被拒绝，直接返回 null 走回退。
async function saveToPublicStorage(blob, fileName) {
  // Android 11+ (API 30+) 强制 Scoped Storage，
  // Directory.ExternalStorage 写入 DCIM/Pictures 会被拒绝。
  // 跳过直接保存，走 app 私有目录 + Share 回退。
  const androidVer = getAndroidVersion();
  if (androidVer !== null && androidVer >= 11) {
    return null;
  }

  const base64 = await blobToBase64(blob);
  const subPath = getSaveSubPath(fileName);

  // 尝试写入 ExternalStorage（公共外部存储根目录）
  try {
    const result = await Filesystem.writeFile({
      path: subPath,
      data: base64,
      directory: Directory.ExternalStorage,
      recursive: true,
    });
    return { saved: true, uri: result.uri, directory: 'ExternalStorage', direct: true };
  } catch (e) {
    // ExternalStorage 失败，继续尝试其他方式
  }

  return null;
}

// 写入 app 私有外部存储（不需要权限，总是可写）
async function saveToAppExternal(blob, fileName) {
  const base64 = await blobToBase64(blob);
  // 使用 ExifEditor 子目录，避免文件散落在 app 根目录
  const subPath = `ExifEditor/${fileName}`;
  try {
    const result = await Filesystem.writeFile({
      path: subPath,
      data: base64,
      directory: Directory.External,
      recursive: true,
    });
    return { saved: true, uri: result.uri, directory: 'External', direct: false };
  } catch (e) {
    try {
      const result = await Filesystem.writeFile({
        path: subPath,
        data: base64,
        directory: Directory.Cache,
        recursive: true,
      });
      return { saved: true, uri: result.uri, directory: 'Cache', direct: false };
    } catch (e2) {
      throw new Error(`保存失败: ${e2.message || e2}`);
    }
  }
}

// 通过系统分享菜单分享文件，返回是否成功
async function shareFiles(uris, title, text) {
  if (!isAndroid() || !uris || uris.length === 0) return false;
  try {
    await Share.share({
      files: uris,
      title: title || '保存文件',
      dialogTitle: '选择保存位置',
      text: text || '',
    });
    return true;
  } catch (e) {
    if (e && e.message && /cancel/i.test(e.message)) return false;
    // 不再静默吞掉错误，返回 false 让调用方知道分享失败
    console.error('Share failed:', e);
    return false;
  }
}

// 保存文件：先尝试公共目录（直接进相册），失败则用 app 私有目录 + Share
export const capacitorFileSaver = {
  async saveBlob(blob, fileName) {
    if (!isAndroid()) {
      // Web: 使用 <a download>
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) {}
      }, 200);
      return { saved: true, uri: null, direct: true };
    }

    // 1. 尝试直接写入公共目录（相册/下载）
    const publicResult = await saveToPublicStorage(blob, fileName);
    if (publicResult) return publicResult;

    // 2. 回退：写入 app 私有目录
    const appResult = await saveToAppExternal(blob, fileName);

    // 3. 弹出分享菜单让用户手动保存
    if (appResult.uri) {
      await shareFiles([appResult.uri], fileName);
    }

    return appResult;
  },

  // 批量保存：先尝试公共目录，失败则收集 URI 统一分享
  async saveBatch(blobs, fileNames) {
    const results = [];
    const shareUris = [];

    for (let i = 0; i < blobs.length; i++) {
      const blob = blobs[i];
      const fileName = fileNames[i];

      if (!isAndroid()) {
        await this.saveBlob(blob, fileName);
        results.push({ saved: true, fileName, direct: true });
        continue;
      }

      // 尝试公共目录
      const publicResult = await saveToPublicStorage(blob, fileName);
      if (publicResult) {
        results.push(publicResult);
        continue;
      }

      // 回退到 app 私有目录
      try {
        const appResult = await saveToAppExternal(blob, fileName);
        results.push(appResult);
        if (appResult.uri) shareUris.push(appResult.uri);
      } catch (e) {
        results.push({ saved: false, fileName, error: e.message });
      }
    }

    // 如果有文件未能直接保存，统一弹出分享菜单
    if (shareUris.length > 0) {
      await shareFiles(shareUris, `保存 ${shareUris.length} 个文件`);
    }

    return results;
  },

  async saveZip(zipBlob) {
    return this.saveBlob(zipBlob, 'edited_images.zip');
  },
};
