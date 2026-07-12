// Web platform Notifier — uses the browser Notification API.
// showProgress / cancelProgress are no-ops because the Web UI surfaces export
// progress through its own on-screen progress bar rather than notifications.

export const webNotifier = {
  notify(title, body) {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(title, { body });
          }
        });
      }
    } catch (_) {
      /* notifications unavailable or blocked — ignore */
    }
  },

  showProgress(_percent) {
    // No-op on Web: progress is rendered in the UI progress bar.
  },

  cancelProgress() {
    // No-op on Web: progress is rendered in the UI progress bar.
  },
};

export default webNotifier;
