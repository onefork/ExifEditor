// Capacitor platform barrel file — re-exports all capacitor platform adapters.
// This file contains ONLY re-exports; no logic.

export { capacitorFileSaver, isAndroid, getAndroidVersion, blobToBase64 } from './capacitor-file-saver.js';
export { capacitorNotifier } from './capacitor-notifier.js';
export { requestAndroidPermissions } from './capacitor-permissions.js';
