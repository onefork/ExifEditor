import { readExif } from './exif-reader.js';

// 可编辑字段常量
export const EDITABLE_FIELDS = [
  'dateTimeOriginal',
  'gpsLat',
  'gpsLng',
  'make',
  'model',
  'software',
];

function uid() {
  return 'img_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function fileDedupKey(file) {
  return `${file.name}|${file.size}|${file.lastModified || 0}`;
}

function emptyEdits() {
  const o = {};
  for (const f of EDITABLE_FIELDS) o[f] = { value: null, editedBy: null };
  return o;
}

export function createImageStore() {
  const state = {
    images: [], // [{id, file, summary, edits, selected}]
    selectedId: null,
    mode: 'single', // 'single' | 'batch'
    keys: new Set(),
    listeners: new Set(),
  };

  function emit() {
    state.listeners.forEach((fn) => fn({ ...publicApi }));
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList || []);
    const tasks = [];
    for (const file of files) {
      const key = fileDedupKey(file);
      if (state.keys.has(key)) continue;
      state.keys.add(key);
      tasks.push(
        readExif(file).then((summary) => {
          const image = {
            id: uid(),
            file,
            summary,
            edits: emptyEdits(),
            selected: false,
          };
          // 使用原始 EXIF 作为 edits 的默认值来源（仅用于 UI 预填，editedBy=null 表示未编辑）
          if (summary.dateTimeOriginal) image.edits.dateTimeOriginal.rawValue = summary.dateTimeOriginal;
          if (summary.gpsLat !== null && summary.gpsLat !== undefined) image.edits.gpsLat.rawValue = summary.gpsLat;
          if (summary.gpsLng !== null && summary.gpsLng !== undefined) image.edits.gpsLng.rawValue = summary.gpsLng;
          if (summary.make) image.edits.make.rawValue = summary.make;
          if (summary.model) image.edits.model.rawValue = summary.model;
          if (summary.software) image.edits.software.rawValue = summary.software;
          return image;
        }).catch((err) => {
          return { id: uid(), file, summary: { fileName: file.name, fileSize: file.size, error: String(err), isJpeg: false }, edits: emptyEdits(), selected: false };
        })
      );
    }
    const results = await Promise.all(tasks);
    state.images.push(...results);
    // 加图后自动选中第一张（仅当当前无选中时，避免追加图片时跳转焦点）
    if (!state.selectedId && state.images.length > 0) {
      state.selectedId = state.images[0].id;
      state.images[0].selected = true;
    }
    emit();
    return results;
  }

  function removeImage(id) {
    const idx = state.images.findIndex((im) => im.id === id);
    if (idx >= 0) {
      const removed = state.images[idx];
      state.keys.delete(fileDedupKey(removed.file));
      state.images.splice(idx, 1);
      if (state.selectedId === id) state.selectedId = state.images[0]?.id || null;
      emit();
    }
  }

  function clearAll() {
    state.images = [];
    state.keys.clear();
    state.selectedId = null;
    emit();
  }

  function selectImage(id) {
    state.selectedId = id;
    state.images.forEach((im) => (im.selected = im.id === id));
    emit();
  }

  function setMode(mode) {
    state.mode = mode;
    emit();
  }

  // 逐张设置
  function setEdit(id, field, value) {
    if (!EDITABLE_FIELDS.includes(field)) return;
    const img = state.images.find((i) => i.id === id);
    if (!img) return;
    img.edits[field] = { value, editedBy: 'user' };
    emit();
  }

  // 批量:把某个字段的值直接写到所有图片的 edits 中
  function applyFieldValueToAll(field, value) {
    if (!EDITABLE_FIELDS.includes(field)) return;
    for (const im of state.images) {
      im.edits[field] = { value, editedBy: 'user' };
    }
    emit();
  }

  // 批量:按 fieldGroup 把多个字段(如 gps→gpsLat+gpsLng)的值写入所有图片
  // fieldValueMap 形如 { gpsLat: 39.9, gpsLng: 116.4 }
  function applyFieldGroupToAll(fieldValueMap) {
    const normalized = {};
    for (const [f, v] of Object.entries(fieldValueMap || {})) {
      if (EDITABLE_FIELDS.includes(f)) normalized[f] = v;
    }
    if (Object.keys(normalized).length === 0) return;
    for (const im of state.images) {
      for (const [f, v] of Object.entries(normalized)) {
        im.edits[f] = { value: v, editedBy: 'user' };
      }
    }
    emit();
  }

  function subscribe(fn) {
    state.listeners.add(fn);
    return () => state.listeners.delete(fn);
  }

  const publicApi = {
    addFiles,
    removeImage,
    clearAll,
    selectImage,
    setMode,
    setEdit,
    applyFieldValueToAll,
    applyFieldGroupToAll,
    subscribe,
    get images() { return state.images; },
    get selectedId() { return state.selectedId; },
    get mode() { return state.mode; },
  };
  return publicApi;
}
