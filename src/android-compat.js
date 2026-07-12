import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { StatusBar, Style } from '@capacitor/status-bar';

// 是否运行在 Android 原生平台
export function isAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function isNative() {
  return Capacitor.isNativePlatform();
}

// Blob 转 base64（不含 data: 前缀）
function blobToBase64(blob) {
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
// 权限申请
// ====================================================================
export async function requestAndroidPermissions() {
  if (!isAndroid()) return;

  // 状态栏：使用默认样式，让 WebView 内容不被状态栏遮挡
  try {
    await StatusBar.setStyle({ style: Style.Default });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (e) {}

  // 通知权限（Android 13+）
  try {
    const notifPerm = await LocalNotifications.checkPermissions();
    if (notifPerm.display === 'prompt') {
      await LocalNotifications.requestPermissions();
    }
  } catch (e) {}

  // Filesystem 权限
  try {
    const fsPerm = await Filesystem.checkPermissions();
    if (fsPerm.publicStorage === 'prompt') {
      await Filesystem.requestPermissions();
    }
  } catch (e) {}
}

// ====================================================================
// 通知条支持
// ====================================================================
let notifIdCounter = 1;

export async function showNotification(title, body) {
  if (!isAndroid()) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
    return;
  }
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notifIdCounter++,
          title,
          body,
          schedule: { at: new Date(Date.now()) },
        },
      ],
    });
  } catch (e) {}
}

export async function showProgressNotification(title, body) {
  if (!isAndroid()) return;
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 999,
          title,
          body,
          ongoing: true,
          schedule: { at: new Date(Date.now()) },
        },
      ],
    });
  } catch (e) {}
}

export async function cancelProgressNotification() {
  if (!isAndroid()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: 999 }] });
  } catch (e) {}
}

// ====================================================================
// 保存到相册/路径
// ====================================================================
// 策略：逐级尝试公共目录 → app 私有目录 → Cache + Share
// 1. Directory.ExternalStorage + DCIM/exif-editor/  → 直接进相册
// 2. Directory.ExternalStorage + Pictures/exif-editor/ → 进图片文件夹
// 3. Directory.ExternalStorage + Download/exif-editor/  → 进下载目录（ZIP）
// 4. Directory.External (app 私有)  → 保底，不需权限
// 5. Directory.Cache + Share        → 最终回退

// 根据文件类型选择目标子目录
function getSaveSubPath(fileName) {
  const isImage = /\.jpe?g$/i.test(fileName);
  const isZip = /\.zip$/i.test(fileName);
  if (isZip) return `Download/exif-editor/${fileName}`;
  if (isImage) return `DCIM/exif-editor/${fileName}`;
  return `Documents/exif-editor/${fileName}`;
}

// 直接保存到公共目录（相册/下载等），不需要用户交互
async function saveToPublicStorage(blob, fileName) {
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
  try {
    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.External,
      recursive: true,
    });
    return { saved: true, uri: result.uri, directory: 'External', direct: false };
  } catch (e) {
    try {
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      });
      return { saved: true, uri: result.uri, directory: 'Cache', direct: false };
    } catch (e2) {
      throw new Error(`保存失败: ${e2.message || e2}`);
    }
  }
}

// 保存文件：先尝试公共目录（直接进相册），失败则用 app 私有目录 + Share
export async function saveBlobToFolder(blob, fileName) {
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
}

// 批量保存：先尝试公共目录，失败则收集 URI 统一分享
export async function saveBlobBatch(blobs, fileNames) {
  const results = [];
  const shareUris = [];

  for (let i = 0; i < blobs.length; i++) {
    const blob = blobs[i];
    const fileName = fileNames[i];

    if (!isAndroid()) {
      await saveBlobToFolder(blob, fileName);
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
}

// 通过系统分享菜单分享文件
export async function shareFiles(uris, title, text) {
  if (!isAndroid() || !uris || uris.length === 0) return;
  try {
    await Share.share({
      files: uris,
      title: title || '保存文件',
      dialogTitle: '选择保存位置',
      text: text || '',
    });
  } catch (e) {
    if (e && e.message && /cancel/i.test(e.message)) return;
  }
}
