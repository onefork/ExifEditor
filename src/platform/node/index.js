// Node.js platform adapter barrel — re-exports all Node adapters.
// This is a NEW barrel file; the individual adapter implementations
// (node-storage.js, node-image-decoder.js, node-file-saver.js, node-notifier.js)
// are untouched.

export { nodeStorage, createNodeStorage } from './node-storage.js';
export { nodeImageDecoder } from './node-image-decoder.js';
export { nodeFileSaver, createNodeFileSaver } from './node-file-saver.js';
export { nodeNotifier } from './node-notifier.js';
