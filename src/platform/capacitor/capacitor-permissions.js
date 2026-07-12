import { StatusBar, Style } from '@capacitor/status-bar';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Filesystem } from '@capacitor/filesystem';
import { isAndroid, getAndroidVersion } from './capacitor-file-saver.js';

// Android 权限申请流程：状态栏适配 + 通知权限 + 存储权限
// 仅在 Android 原生平台执行；Web 端直接返回。
export async function requestAndroidPermissions() {
  if (!isAndroid()) return;
  const androidVer = getAndroidVersion();

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

  // 存储权限：仅 Android ≤10 需要写权限（用于直接写入 DCIM 公共目录）
  // Android 11+ 强制 Scoped Storage，app 私有目录无需权限，公共目录写入需要 MediaStore API
  if (androidVer === null || androidVer <= 10) {
    try {
      const fsPerm = await Filesystem.checkPermissions();
      if (fsPerm.publicStorage === 'prompt') {
        await Filesystem.requestPermissions();
      }
    } catch (e) {}
  }
}
