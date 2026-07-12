// Platform adapter type definitions.
// This file contains ONLY JSDoc typedefs for documentation — no runtime code.
// Core modules accept these adapter shapes via dependency injection so that
// platform-specific concerns (DOM, localStorage, Canvas, Notification, etc.)
// stay out of the pure core layer.

/**
 * Key-value storage adapter backed by a platform-specific persistence mechanism
 * (e.g. localStorage on Web, JSON file on Node, Preferences on Capacitor).
 *
 * @typedef {Object} StorageAdapter
 * @property {(key: string) => Promise<string|null>} get
 *   Returns the stored value for `key`, or `null` if missing/unavailable.
 * @property {(key: string, value: string) => Promise<void>} set
 *   Persists `value` under `key`. Must not throw on quota/permission errors
 *   (adapters are expected to swallow and degrade gracefully).
 */

/**
 * Image decoding adapter. Decodes an image file and (optionally) renders an
 * EXIF-orientation-corrected thumbnail. Implementations may use Canvas/Image
 * (Web), sharp (Node), or native decoders.
 *
 * @typedef {Object} ImageDecoder
 * @property {(file: File|Blob) => Promise<{width: number, height: number}>} decode
 *   Decodes `file` and returns its natural pixel dimensions.
 * @property {(file: File|Blob, orientation: number) => Promise<string>} generateThumbnail
 *   Renders a thumbnail (longest edge <= 200px) of `file`, applying EXIF
 *   `orientation` (1-8) correction. Returns a JPEG dataURL (quality ~0.85).
 */

/**
 * File-saving adapter. Handles persisting exported blobs to the user's device.
 * Web uses `<a download>` + createObjectURL; Capacitor writes to DCIM/Download;
 * Node writes to the filesystem.
 *
 * @typedef {Object} FileSaver
 * @property {(blob: Blob, filename: string) => Promise<void>} saveBlob
 *   Saves a single blob as `filename`.
 * @property {(blobs: Array<Blob>, filenames: Array<string>) => Promise<void>} saveBatch
 *   Saves multiple blobs sequentially. Implementations should space downloads
 *   to avoid browser blocking.
 * @property {(zipBlob: Blob) => Promise<void>} saveZip
 *   Saves a pre-built ZIP blob (typically as `edited_images.zip`).
 */

/**
 * User-notification adapter. Web uses the Notification API; Capacitor uses
 * LocalNotifications; Node logs to console.
 *
 * @typedef {Object} Notifier
 * @property {(title: string, body: string) => void} notify
 *   Shows a one-shot notification to the user.
 * @property {(percent: number) => void} showProgress
 *   Updates a progress notification to `percent` (0-100). No-op where the
 *   platform surfaces progress through the UI instead.
 * @property {() => void} cancelProgress
 *   Dismisses any active progress notification. No-op where not applicable.
 */
