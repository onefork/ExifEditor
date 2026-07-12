import { LocalNotifications } from '@capacitor/local-notifications';
import { isAndroid } from './capacitor-file-saver.js';

// 通知 ID 自增计数器（每次 notify 递增，避免 ID 冲突覆盖）
let notifIdCounter = 1;

export const capacitorNotifier = {
  // 通用通知：非 Android 走浏览器 Notification API，Android 走 LocalNotifications
  async notify(title, body) {
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
  },

  // 进度通知：使用固定 id=999 + ongoing:true 持续更新，body 显示百分比
  async showProgress(percent) {
    if (!isAndroid()) return;
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 999,
            title: '导出进度',
            body: `${percent}%`,
            ongoing: true,
            schedule: { at: new Date(Date.now()) },
          },
        ],
      });
    } catch (e) {}
  },

  // 取消进度通知（取消 id=999 的 ongoing 通知）
  async cancelProgress() {
    if (!isAndroid()) return;
    try {
      await LocalNotifications.cancel({ notifications: [{ id: 999 }] });
    } catch (e) {}
  },
};
