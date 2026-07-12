import { Notification } from 'electron';

export const electronNotifier = {
  notify(title, body) {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  },
  showProgress(percent) {
    // Electron doesn't have ongoing notifications like Android; use a simple notification
    if (Notification.isSupported()) {
      new Notification({ title: 'Processing', body: `${percent}% complete` }).show();
    }
  },
  cancelProgress() {
    // No-op for Electron
  },
};
