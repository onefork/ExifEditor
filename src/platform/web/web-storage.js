// Web platform StorageAdapter — backed by localStorage.
// Swallows errors so that private-mode browsers or quota-exceeded states
// degrade gracefully (returns null / no-op) instead of breaking core logic.

export const webStorage = {
  async get(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  },

  async set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {
      /* ignore quota / privacy-mode errors */
    }
  },
};

export default webStorage;
