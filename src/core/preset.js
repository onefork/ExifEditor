export const STORAGE_KEY = 'exif_editor_presets';

// 默认预设列表（首次加载时通过 storage adapter 写入）
// - id 全用英文，方便第三方译员添加新语种
// - name 用英文通用名，但**不持久化**；显示名称按当前语言的 i18n 翻译动态解析；
//   只有当用户显式编辑了名称时，才会持久化 name，此后不再随语言切换
// - offsetMeters 根据景点大小多样化（单体建筑 ~200m，广场 ~400m，大型景区 ~1500m）
export const DEFAULT_PRESETS = [
  // 中国（3 个）
  { id: 'default-forbidden-city', name: 'Beijing · Forbidden City',   lat: 39.9163, lng: 116.3972, offsetMeters: 300 },
  { id: 'default-shanghai-bund',  name: 'Shanghai · The Bund',         lat: 31.2397, lng: 121.4908, offsetMeters: 400 },
  { id: 'default-westlake',       name: 'Hangzhou · West Lake',        lat: 30.2592, lng: 120.1308, offsetMeters: 1500 },
  // 其它地区（5 个）— 覆盖欧洲、美洲、非洲、大洋洲
  { id: 'default-eiffel',         name: 'Paris · Eiffel Tower',        lat: 48.8584, lng:   2.2945, offsetMeters: 200 },
  { id: 'default-rome-colosseum', name: 'Rome · Colosseum',             lat: 41.8902, lng:  12.4922, offsetMeters: 300 },
  { id: 'default-newyork-statue', name: 'New York · Statue of Liberty', lat: 40.6892, lng: -74.0445, offsetMeters: 200 },
  { id: 'default-giza-pyramids',  name: 'Giza · Pyramids',              lat: 29.9792, lng:  31.1342, offsetMeters: 1500 },
  { id: 'default-sydney-opera',   name: 'Sydney · Opera House',         lat: -33.8568, lng: 151.2153, offsetMeters: 400 },
];

// 通过 id 快速查询默认预设（供"是否仍为原样"判断 & 名称回退）
const DEFAULT_PRESET_BY_ID = new Map(DEFAULT_PRESETS.map((p) => [p.id, p]));

// 模块级 storage 适配器实例，由 initPresetManager 注入
// 接口：{ get(key): Promise<string|null>, set(key, value): Promise<void> }
let _storage = null;

// 初始化 PresetManager，注入 storage 适配器
// 必须在使用任何 CRUD 函数之前调用，否则抛错
export function initPresetManager({ storage } = {}) {
  if (!storage || typeof storage.get !== 'function' || typeof storage.set !== 'function') {
    throw new Error('initPresetManager requires { storage } option with get(key) and set(key, value) methods');
  }
  _storage = storage;
}

function getStorage() {
  if (!_storage) {
    throw new Error('PresetManager not initialized. Call initPresetManager({ storage }) first.');
  }
  return _storage;
}

function uid() {
  return 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function loadAll() {
  try {
    const raw = await getStorage().get(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

async function persist(list) {
  try {
    await getStorage().set(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}
}

// --- 首次初始化：storage 中无预设时写入默认预设 ---
// 判断依据：`exif_editor_presets` 对应的 key 是否存在（非空数组也视为已初始化）
export async function ensureDefaultsOnce() {
  const raw = await getStorage().get(STORAGE_KEY);
  if (raw !== null && raw !== undefined) return; // 已初始化过
  // 故意不包含 name：仅保留 id/lat/lng/offsetMeters，使显示名走 i18n
  const seedList = DEFAULT_PRESETS.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    offsetMeters: p.offsetMeters,
  }));
  await persist(seedList);
}

// --- 取预设的显示名称（按需求三级回退：持久化 name → i18n → DEFAULT_PRESETS.name） ---
// 1. 如果预设不是以 default- 开头（用户自建）→ 直接使用持久化的 name 字段
// 2. 如果是 default- 开头，且持久化中已有非空 name 字段 → 直接使用 name（用户已改过名，锁定显示）
// 3. 如果是 default- 开头，且持久化中无 name 字段 → 查 i18n(`presetNames.${id}`)
//    4. 若 i18n 无该项 → 回落到 DEFAULT_PRESETS[i].name
export function getPresetDisplayName(preset, t) {
  if (!preset) return '';
  const isDefault = preset.id && preset.id.startsWith('default-');
  if (isDefault) {
    const storedName = (preset.name || '').trim();
    // 用户已经改过名 → 锁定为持久化名称，不再随语言切换
    if (storedName !== '') return storedName;
    // 查 i18n 翻译
    const key = 'presetNames.' + preset.id;
    const translated = t ? t(key) : null;
    if (translated && translated !== key) return translated;
    // i18n 无翻译 → 回落到 DEFAULT_PRESETS 中的英文名称
    const base = DEFAULT_PRESET_BY_ID.get(preset.id);
    if (base) return base.name;
  }
  // 用户自定义预设（非 default- 开头），或上面异常情况的兜底
  return (preset.name || '').trim() || '';
}

export async function listPresets() {
  await ensureDefaultsOnce();
  return loadAll();
}

// --- 保存/更新预设 ---
// 命名策略：默认预设（default-*）只有当用户主动改名时才持久化 name 字段
//          未改动名称 → name 字段不写入 storage，让显示名随语言切换
//          用户新增预设 → 总是写入 name
export async function savePreset(preset) {
  const list = await loadAll();
  const id = preset.id || uid();
  const isDefault = id.startsWith('default-');

  // 构造保存对象：默认预设只在用户显式提供了 name 时才保存 name
  const toSave = {
    id: id,
    lat: Number(preset.lat),
    lng: Number(preset.lng),
    offsetMeters: clamp(Number(preset.offsetMeters) || 0, 0, 5000),
  };
  // 默认预设：只有当 payload.name 是真值（用户确实改过名）时才写入
  // 其它预设：总是写入 name（空值用 'Untitled' 兜底）
  if (isDefault) {
    const trimmedName = typeof preset.name === 'string' && preset.name.trim() !== '' ? preset.name.trim() : null;
    // 同时检查：若 trimmedName 仍未等于原始英文名称（即用户真的改了名）则写
    // 这里以"用户是否传入了非空 name"为判断依据（调用方需要保证只有当用户实际改动名称时才传入）
    if (trimmedName) toSave.name = trimmedName.slice(0, 80);
  } else {
    toSave.name = (typeof preset.name === 'string' && preset.name.trim() !== ''
      ? preset.name.trim()
      : 'Untitled').slice(0, 80);
  }

  // 与现有记录合并：若已存在且是默认预设且当前 payload 没提供 name，
  // 则保留现有 name（防止意外清空用户改过的名称）
  const idx = list.findIndex((p) => p.id === toSave.id);
  if (idx >= 0) {
    const existing = list[idx];
    // 默认预设：若已有 name，而新 payload 没带 name → 保留 name
    if (isDefault && !toSave.name && existing.name && existing.name.trim() !== '') {
      list[idx] = { ...toSave, name: existing.name };
    } else {
      list[idx] = toSave;
    }
  } else {
    list.push(toSave);
  }
  await persist(list);
  return toSave;
}

export async function deletePreset(id) {
  const list = (await loadAll()).filter((p) => p.id !== id);
  await persist(list);
  return list;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// 以米为单位在圆盘上生成随机偏移
function randomOffset(offsetMeters) {
  const r = Math.sqrt(Math.random()) * offsetMeters;
  const theta = Math.random() * 2 * Math.PI;
  return { dx: r * Math.cos(theta), dy: r * Math.sin(theta) };
}

export function applyPresetToImage(preset, edits) {
  const offsetMeters = Number(preset.offsetMeters) || 0;
  let newLat = Number(preset.lat);
  let newLng = Number(preset.lng);
  if (offsetMeters > 0) {
    const { dx, dy } = randomOffset(offsetMeters);
    const latDelta = dy / 111320;
    const lngDelta = dx / (111320 * Math.cos((newLat * Math.PI) / 180) || 1);
    newLat = newLat + latDelta;
    newLng = newLng + lngDelta;
  }
  return {
    ...edits,
    gpsLat: { value: newLat, editedBy: 'preset' },
    gpsLng: { value: newLng, editedBy: 'preset' },
  };
}

// --- 调整预设顺序 ---
// 上移一格（与前一项交换）；若已是第一项则返回 null
export async function movePresetUp(id) {
  const list = await loadAll();
  const idx = list.findIndex((p) => p.id === id);
  if (idx <= 0) return null;
  [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
  await persist(list);
  return list;
}

// 下移一格（与后一项交换）；若已是最后一项则返回 null
export async function movePresetDown(id) {
  const list = await loadAll();
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0 || idx >= list.length - 1) return null;
  [list[idx], list[idx + 1]] = [list[idx + 1], list[idx]];
  await persist(list);
  return list;
}
