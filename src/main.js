import { createImageStore } from './image-store.js';
import { humanSize, formatExifDate } from './exif-reader.js';
import { exportZip, exportOneByOne } from './exporter.js';
import { listPresets, savePreset, deletePreset, applyPresetToImage, ensureDefaultsOnce, getPresetDisplayName, movePresetUp, movePresetDown } from './preset.js';
import { SUPPORTED_LANGUAGES, t, changeLanguage, currentLanguage, getStoredTheme, setTheme, initTheme, FALLBACK_LANGUAGE } from './i18n/index.js';
import { requestAndroidPermissions } from './android-compat.js';

// ====================================================================
// DOM 引用
// ====================================================================
const fileInput = document.getElementById('file-input');
const imageCountEl = document.getElementById('image-count');
const panelList = document.getElementById('panel-list');
const listCountEl = document.getElementById('list-count');
const thumbListEl = document.getElementById('thumb-list');
const collapseToggle = document.getElementById('collapse-toggle');
let isCollapsed = false;
let previousCount = 0;
const panelEdit = document.getElementById('panel-edit');
const panelExport = document.getElementById('panel-export');
const btnClear = document.getElementById('btn-clear');
const modeBtns = document.querySelectorAll('.mode-btn');
const singleHintEl = document.getElementById('single-hint');
const singleEditorEl = document.getElementById('single-editor');
const singleThumbEl = document.getElementById('single-thumb');
const singleMetaEl = document.getElementById('single-meta');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');

// ------ 浏览模式: 字段输入框 (date 和 time 分开) ------
const singleInputs = {
  dateTimeOriginal: document.querySelector('[data-single="dateTimeOriginal"]'),
  dateTimeOriginalTime: document.querySelector('[data-single="dateTimeOriginalTime"]'),
  gpsLat: document.querySelector('[data-single="gpsLat"]'),
  gpsLng: document.querySelector('[data-single="gpsLng"]'),
  make: document.querySelector('[data-single="make"]'),
  model: document.querySelector('[data-single="model"]'),
  software: document.querySelector('[data-single="software"]'),
};
const singleResetButtons = document.querySelectorAll('[data-reset-single]');

// ------ 浏览模式: GPS 内的预设辅助行 ------
const singlePresetRow = document.getElementById('single-preset-row');
const singlePresetSelect = document.getElementById('single-preset-select');
const singlePresetOffsetView = document.getElementById('single-preset-offset-view');
const singlePresetOffsetSlider = document.getElementById('single-preset-offset-quick');
const btnManagePresetSingle = document.getElementById('btn-manage-preset-single');
const btnSingleReset = document.getElementById('btn-single-reset');

// ------ 批量模式: 字段输入框 (date + time) ------
const batchInputs = {
  dateTimeOriginal: document.querySelector('[data-batch="dateTimeOriginal"]'),
  dateTimeOriginalTime: document.querySelector('[data-batch="dateTimeOriginalTime"]'),
  gpsLat: document.querySelector('[data-batch="gpsLat"]'),
  gpsLng: document.querySelector('[data-batch="gpsLng"]'),
  make: document.querySelector('[data-batch="make"]'),
  model: document.querySelector('[data-batch="model"]'),
  software: document.querySelector('[data-batch="software"]'),
};
const batchApplyButtons = document.querySelectorAll('[data-batch-apply]');
const batchResetButtons = document.querySelectorAll('[data-batch-reset]');

// ------ 批量模式: GPS 内的预设辅助行 ------
const batchPresetSelect = document.getElementById('batch-preset-select');
const batchPresetOffsetView = document.getElementById('batch-preset-offset-view');
const batchPresetOffsetSlider = document.getElementById('batch-preset-offset-quick');
const batchPresetInfo = document.getElementById('batch-preset-info');
const btnManagePreset = document.getElementById('btn-manage-preset');

// ------ 预设管理弹窗 ------
const modalPreset = document.getElementById('modal-preset');
const btnPresetClose = document.getElementById('btn-preset-close');
const presetListEl = document.getElementById('preset-list');
const presetForm = document.getElementById('preset-form');
const presetNameInput = document.getElementById('preset-name');
const presetLatInput = document.getElementById('preset-lat');
const presetLngInput = document.getElementById('preset-lng');
const presetOffsetInput = document.getElementById('preset-offset');
const presetOffsetVal = document.getElementById('preset-offset-val');

// ------ 通用确认弹窗 ------
const modalConfirm = document.getElementById('modal-confirm');
const confirmText = document.getElementById('confirm-text');
const btnConfirmOk = document.getElementById('btn-confirm-ok');
const btnConfirmCancel = document.getElementById('btn-confirm-cancel');

// ------ 导出 ------
const btnExportZip = document.getElementById('btn-export-zip');
const btnExportOne = document.getElementById('btn-export-one');
const progressWrap = document.getElementById('progress-wrap');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

// ====================================================================
// store 初始化
// ====================================================================
const store = createImageStore();
ensureDefaultsOnce();

// 查看模式切换：true = 查看修改后的信息；false = 查看修改前的原始信息
// 已修改的字段在 showEdited=true 时会高亮显示；不持久化（刷新重置）
let showEdited = true;
// 时间平移消息 token: 用于避免 setTimeout 竞态 (旧定时器覆盖新消息)
let shiftMsgToken = 0;
// 跟踪上次渲染的选中图片 ID, 用于切换图片时重置预设下拉
let lastRenderedSelectedId = null;
function updateViewToggleButtons() {
  // 三态：查看修改后+有修改=蓝色高亮(is-active)；查看修改后+无修改=普通(透明)；查看原始=灰色(is-original)
  const hasMods = anyImageHasEdit();
  const buttons = document.querySelectorAll('.btn-toggle-view');
  buttons.forEach((btn) => {
    btn.textContent = '👁';
    btn.title = showEdited ? t('toggle.viewEdited') : t('toggle.viewOriginal');
    btn.setAttribute('aria-label', btn.title);
    btn.classList.toggle('is-original', !showEdited);
    btn.classList.toggle('is-active', showEdited && hasMods);
  });
}
function setShowEdited(value) {
  showEdited = value;
  updateViewToggleButtons();
  renderAll();
}

// 判断某字段是否被用户手动修改过（用于信息区高亮显示）
function hasEdit(im, field) {
  if (!im || !im.edits || !im.edits[field]) return false;
  const e = im.edits[field];
  return !!e.editedBy && e.value !== null && e.value !== undefined;
}

// 判断某字段是否被用户清除（editedBy='user' 且 value=null）
// 清除的字段在导出时会从 EXIF 删除；查看修改后信息时以删除线深红显示
function isCleared(im, field) {
  if (!im || !im.edits || !im.edits[field]) return false;
  const e = im.edits[field];
  return !!e.editedBy && (e.value === null || e.value === undefined);
}

// ====================================================================
// 工具函数
// ====================================================================
function applyDataI18n(root = document) {
  // 解析形如 "key|foo:bar|count:3" 的 options 字符串，支持模板插值
  const parseOpts = (raw) => {
    if (!raw) return {};
    const opts = {};
    raw.split('|').forEach((seg) => {
      const idx = seg.indexOf(':');
      if (idx <= 0) return;
      const k = seg.slice(0, idx).trim();
      let v = seg.slice(idx + 1).trim();
      // 尝试转成数字，保持字符串兜底
      const n = Number(v);
      if (v !== '' && !Number.isNaN(n) && String(n) === v) v = n;
      opts[k] = v;
    });
    return opts;
  };

  // 文本内容
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const raw = el.getAttribute('data-i18n');
    if (!raw) return;
    const [key, rest] = raw.split('|');
    if (!key) return;
    const opts = parseOpts(rest);
    // 如果存在对应 i18n key，用翻译；否则保持原文本（避免被清成 key）
    const translated = t(key, opts);
    if (translated && translated !== key) {
      // 如果该元素没有子元素，直接替换 textContent
      // 如果有子元素（如<input>或<span>），只更新第一个文本节点，不销毁子元素
      const hasChildElements = Array.from(el.childNodes).some((n) => n.nodeType === 1);
      if (!hasChildElements) {
        el.textContent = translated;
      } else {
        // 找到第一个文本节点并更新它；若没有文本节点则在开头插入一个
        let textNode = null;
        for (let i = 0; i < el.childNodes.length; i++) {
          if (el.childNodes[i].nodeType === 3) {
            textNode = el.childNodes[i];
            break;
          }
        }
        if (textNode) {
          textNode.nodeValue = translated;
        } else {
          el.insertBefore(document.createTextNode(translated), el.firstChild);
        }
      }
    }
  });
  // aria-label
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const raw = el.getAttribute('data-i18n-aria');
    if (!raw) return;
    const [key, rest] = raw.split('|');
    if (!key) return;
    const val = t(key, parseOpts(rest));
    if (val && val !== key) el.setAttribute('aria-label', val);
  });
  // placeholder
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const raw = el.getAttribute('data-i18n-placeholder');
    if (!raw) return;
    const [key, rest] = raw.split('|');
    if (!key) return;
    const val = t(key, parseOpts(rest));
    if (val && val !== key) el.setAttribute('placeholder', val);
  });
  // title (hover tooltip)
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const raw = el.getAttribute('data-i18n-title');
    if (!raw) return;
    const [key, rest] = raw.split('|');
    if (!key) return;
    const val = t(key, parseOpts(rest));
    if (val && val !== key) el.setAttribute('title', val);
  });
}

function initSettingsControls() {
  // Language selector: custom dropdown with inline SVG flags
  const langSelector = document.getElementById('lang-selector');
  const langButton = document.getElementById('lang-button');
  const langMenu = document.getElementById('lang-menu');
  const langFlagEl = document.getElementById('lang-flag');
  const langLabelEl = document.getElementById('lang-label');

  // Inline SVG flags (cross-platform, no emoji font dependency)
  function makeFlagSVG(code) {
    switch (code) {
      case 'en':
        return '<svg viewBox="0 0 30 20" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#00247D"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="3"/><path d="M0 0L30 20M30 0L0 20" stroke="#CF142B" stroke-width="1.5"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="4"/><path d="M15 0v20M0 10h30" stroke="#CF142B" stroke-width="2"/></svg>';
      case 'zh-CN':
        return '<svg viewBox="0 0 30 20" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#DE2910"/><circle cx="7" cy="7" r="2.8" fill="#FFDE00"/><circle cx="14" cy="4" r="1.1" fill="#FFDE00"/><circle cx="16.5" cy="7" r="1.1" fill="#FFDE00"/><circle cx="15" cy="10.5" r="1.1" fill="#FFDE00"/><circle cx="12" cy="10.5" r="1.1" fill="#FFDE00"/></svg>';
      case 'ja':
        return '<svg viewBox="0 0 30 20" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#ffffff"/><circle cx="15" cy="10" r="5" fill="#BC002D"/></svg>';
      case 'zh-TW':
        return '<svg viewBox="0 0 30 20" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#2b3446"/><rect x="0" y="0" width="30" height="4" fill="#4a90e2"/><text x="15" y="15" font-size="9" font-weight="700" text-anchor="middle" fill="#fff" font-family="system-ui,-apple-system,sans-serif">繁</text></svg>';
      case 'ar':
        return '<svg viewBox="0 0 30 20" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#006c35"/><text x="15" y="14" font-size="8" font-weight="700" text-anchor="middle" fill="#fff" font-family="system-ui,-apple-system,sans-serif">ع</text></svg>';
      case 'de':
        return '<svg viewBox="0 0 30 20" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="6.7" fill="#000"/><rect y="6.7" width="30" height="6.6" fill="#DD0000"/><rect y="13.3" width="30" height="6.7" fill="#FFCE00"/></svg>';
      case 'es':
        return '<svg viewBox="0 0 30 20" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/></svg>';
      case 'fr':
        return '<svg viewBox="0 0 30 20" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect width="10" height="20" fill="#002395"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ED2939"/></svg>';
      case 'pt':
        return '<svg viewBox="0 0 30 20" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#006600"/><rect x="0" y="0" width="30" height="20" fill="#FF0000"/><rect x="0" y="0" width="12" height="20" fill="#006600"/></svg>';
      case 'ko':
        return '<svg viewBox="0 0 30 20" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#fff"/><path d="M 10 10 A 5 5 0 0 1 20 10 Z" fill="#C60C30"/><path d="M 10 10 A 5 5 0 0 0 20 10 Z" fill="#003478"/></svg>';
      case 'ru':
        return '<svg viewBox="0 0 30 20" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="6.7" fill="#fff"/><rect y="6.7" width="30" height="6.6" fill="#0039A6"/><rect y="13.3" width="30" height="6.7" fill="#D52B1E"/></svg>';
      case 'it':
        return '<svg viewBox="0 0 30 20" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect width="10" height="20" fill="#009246"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#CE2B37"/></svg>';
      default:
        return '<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#ccc"/></svg>';
    }
  }

  function setButtonDisplay(lang) {
    if (!langButton || !langFlagEl || !langLabelEl) return;
    langFlagEl.innerHTML = makeFlagSVG(lang.code);
    langLabelEl.textContent = lang.label;
  }

  if (langSelector && langButton && langMenu) {
    // initial display
    const currentCode = currentLanguage();
    const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === currentCode) || SUPPORTED_LANGUAGES[0];
    setButtonDisplay(currentLang);

    // build menu
    // 显示顺序逻辑：
    // 1) 当前语言 → 置顶（第一）
    // 2) 英语 (en) → 固定在第二（如果不是当前语言）
    // 3) 简体中文 (zh-CN) → 固定在第三（如果不是当前语言或英语）
    // 4) 其它语言按固定稳定顺序：繁体中文、日语、韩语、德语、西班牙语、法语、葡萄牙语、意大利语、俄语、阿拉伯语
    function buildMenu() {
      langMenu.innerHTML = '';
      const curCode = currentLanguage();

      // 固定顺序基准
      const FIRST_LANG = 'en';             // 固定第二
      const CHINESE_LANG = 'zh-CN';        // 固定第三
      const REST_ORDER = [
        'zh-TW', 'ja', 'ko',
        'de', 'es', 'fr', 'pt', 'it', 'ru',
        'ar',
      ];

      // 收集
      const byCode = new Map(SUPPORTED_LANGUAGES.map((l) => [l.code, l]));
      const ordered = [];
      const pushed = new Set();
      const push = (code) => {
        if (!byCode.has(code) || pushed.has(code)) return;
        ordered.push(byCode.get(code));
        pushed.add(code);
      };

      push(curCode);                 // 1) 当前语言
      push(FIRST_LANG);               // 2) 英语
      push(CHINESE_LANG);             // 3) 简体中文
      REST_ORDER.forEach(push);      // 4) 其它（按预设稳定顺序）

      ordered.forEach((lang) => {
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'lang-option' + (lang.code === curCode ? ' is-selected' : '');
        opt.dataset.value = lang.code;
        opt.setAttribute('role', 'option');
        if (lang.code === curCode) opt.setAttribute('aria-selected', 'true');

        const flagSpan = document.createElement('span');
        flagSpan.className = 'lang-flag';
        flagSpan.innerHTML = makeFlagSVG(lang.code);
        opt.appendChild(flagSpan);

        const label = document.createElement('span');
        label.className = 'lang-label';
        label.textContent = lang.label;
        opt.appendChild(label);

        const check = document.createElement('span');
        check.className = 'lang-check';
        check.textContent = '✓';
        opt.appendChild(check);

        opt.addEventListener('click', () => {
          const targetLang = lang.code;
          const applyLang = (targetCode) => {
            const target = SUPPORTED_LANGUAGES.find((l) => l.code === targetCode) || SUPPORTED_LANGUAGES[0];
            setButtonDisplay(target);
            buildMenu(); // 重建菜单以更新选中标记与顺序
            langMenu.hidden = true;
            langSelector.classList.remove('is-open');
            applyDataI18n();
            renderAll();
            renderPresetSelect();
            updateViewToggleButtons(); // 同步查看模式按钮 title (不触发 renderAll, 避免重复)
          };
          changeLanguage(targetLang).then(() => {
            applyLang(targetLang);
          }).catch(() => {
            changeLanguage(FALLBACK_LANGUAGE).finally(() => applyLang(FALLBACK_LANGUAGE));
          });
        });
        langMenu.appendChild(opt);
      });
    }
    buildMenu();

    // toggle menu
    langButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = langMenu.hidden;
      langMenu.hidden = !isHidden;
      langSelector.classList.toggle('is-open', isHidden);
      langSelector.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    });

    // click outside closes menu
    document.addEventListener('click', (e) => {
      if (langMenu.hidden) return;
      if (!langSelector.contains(e.target)) {
        langMenu.hidden = true;
        langSelector.classList.remove('is-open');
        langSelector.setAttribute('aria-expanded', 'false');
      }
    });
    // Escape closes menu / modals (按优先级: 确认弹窗 > 预设弹窗 > 语言菜单)
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (modalConfirm && !modalConfirm.hidden) {
        // 触发 Cancel, 复用 showConfirm 的 cancel 逻辑以正确 resolve Promise
        if (btnConfirmCancel) btnConfirmCancel.click();
      } else if (modalPreset && !modalPreset.hidden) {
        modalPreset.hidden = true;
        if (typeof resetPresetForm === 'function') resetPresetForm(true);
      } else if (!langMenu.hidden) {
        langMenu.hidden = true;
        langSelector.classList.remove('is-open');
        langSelector.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Theme selector: 3-button segmented control
  const themeButtons = document.querySelectorAll('.theme-btn');
  if (themeButtons.length) {
    const updateActive = () => {
      const current = getStoredTheme();
      themeButtons.forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.themeValue === current);
      });
    };
    updateActive();

    themeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.themeValue;
        setTheme(val);
        updateActive();
      });
    });
  }
}

function parseExifDate(val) {
  if (!val) return null;
  const m = String(val).trim().match(/^(\d{4})[:\-](\d{2})[:\-](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const sec = m[6] || '00';
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}:${sec}` };
}
function dtToExif(dateStr, timeStr) {
  if (!dateStr && !timeStr) return null;
  const d = dateStr || '0000:00:00';
  const t = timeStr || '00:00';
  const tNorm = /^\d{2}:\d{2}:\d{2}$/.test(t) ? t : `${t}:00`;
  const dNorm = d.replace(/-/g, ':');
  return `${dNorm} ${tNorm}`;
}
function formatGps(lat, lng) {
  if (lat == null || lng == null) return '';
  const ns = Number(lat) >= 0 ? 'N' : 'S';
  const ew = Number(lng) >= 0 ? 'E' : 'W';
  return `${Math.abs(Number(lat)).toFixed(4)}°${ns}, ${Math.abs(Number(lng)).toFixed(4)}°${ew}`;
}
function classifyExifError(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase();
  if (/wrong jpeg data/.test(s) || /not a valid jpeg/.test(s) || /invalid jpeg/.test(s)) {
    return { key: 'notValidJpeg', warn: false, symbol: '!' };
  }
  if (/invalid file data/.test(s) || /invalid file format/.test(s) || /unsupported format/.test(s)) {
    return { key: 'notImageFile', warn: true, symbol: '?' };
  }
  return { key: 'exifFailed', warn: false, symbol: '!' };
}
function hasAnyEdit(im) {
  if (!im || !im.edits) return false;
  const e = im.edits;
  return !!(e.dateTimeOriginal && e.dateTimeOriginal.editedBy)
      || !!(e.gpsLat && e.gpsLat.editedBy)
      || !!(e.gpsLng && e.gpsLng.editedBy)
      || !!(e.make && e.make.editedBy)
      || !!(e.model && e.model.editedBy)
      || !!(e.software && e.software.editedBy);
}
// 检查是否任意一张图片存在修改（含清除）；用于眼睛图标着色
function anyImageHasEdit() {
  return store.images.some(hasAnyEdit);
}
function hasAnyLocation(im) {
  if (!im || !im.edits || !im.summary) return false;
  const lat = im.edits.gpsLat.editedBy ? im.edits.gpsLat.value : im.summary.gpsLat;
  const lng = im.edits.gpsLng.editedBy ? im.edits.gpsLng.value : im.summary.gpsLng;
  return lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));
}
function showConfirm(text) {
  return new Promise((resolve) => {
    confirmText.textContent = text;
    modalConfirm.hidden = false;
    const okH = () => {
      modalConfirm.hidden = true;
      cleanup();
      resolve(true);
    };
    const cancelH = () => {
      modalConfirm.hidden = true;
      cleanup();
      resolve(false);
    };
    const overlayH = (e) => {
      if (e.target === modalConfirm) cancelH();
    };
    const cleanup = () => {
      btnConfirmOk.removeEventListener('click', okH);
      btnConfirmCancel.removeEventListener('click', cancelH);
      modalConfirm.removeEventListener('click', overlayH);
    };
    btnConfirmOk.addEventListener('click', okH);
    btnConfirmCancel.addEventListener('click', cancelH);
    modalConfirm.addEventListener('click', overlayH);
  });
}

// 字段分组
const fieldGroupMap = {
  dateTimeOriginal: ['dateTimeOriginal'],
  gps: ['gpsLat', 'gpsLng'],
  equip: ['make', 'model'],
  software: ['software'],
};
function groupHasEdits(im, groupField) {
  const fields = fieldGroupMap[groupField] || [groupField];
  return fields.some((f) => im.edits[f] && im.edits[f].editedBy && im.edits[f].value !== null);
}

// 根据 showEdited 状态读取字段的"展示值"
// - showEdited=true 且用户有编辑 → 使用 edits 中保存的值
// - showEdited=false 或字段未被修改 → 使用 summary 中的原始值
function getDisplayValue(im, field) {
  if (!im || !field) return null;
  const edit = im.edits && im.edits[field];
  const hasEdit = edit && edit.editedBy && edit.value !== null && edit.value !== undefined;
  if (showEdited && hasEdit) return edit.value;
  const raw = im.summary && im.summary[field];
  return raw;
}

// ====================================================================
// 渲染
// ====================================================================
function renderAll() {
  const imgs = store.images;
  const count = imgs.length;
  imageCountEl.textContent = count ? t('header.loadedCount', { count }) : t('header.notLoaded');
  listCountEl.textContent = String(count);
  panelList.hidden = count === 0;
  panelEdit.hidden = count === 0;
  panelExport.hidden = count === 0;

  // 选图区自动收缩：加载图片后大虚线框变成纤细的「+继续添加」条
  const panelPicker = document.getElementById('panel-picker');
  if (panelPicker) panelPicker.classList.toggle('is-compact', count > 0);

  // ------ 折叠状态 ------
  // 图片数量变化时：>5 默认折叠；<=5 默认不折叠
  if (collapseToggle) {
    if (count > 5) {
      collapseToggle.hidden = false;
      if (count !== previousCount) isCollapsed = true;
    } else {
      collapseToggle.hidden = true;
      if (count !== previousCount) isCollapsed = false;
    }
    const textEl = collapseToggle.querySelector('.collapse-text');
    const iconEl = collapseToggle.querySelector('.collapse-icon');
    if (textEl) textEl.textContent = isCollapsed ? t('collapse.expand', { count }) : t('collapse.collapse');
    if (iconEl) iconEl.textContent = isCollapsed ? '▼' : '▲';
    collapseToggle.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
  }
  panelList.classList.toggle('is-collapsed', isCollapsed);
  previousCount = count;

  // ------ 缩略图列表 ------
  thumbListEl.innerHTML = '';
  // 折叠时：若无选中项显示第一张；有选中项显示选中项；其余隐藏
  const showFallbackId = isCollapsed && !store.selectedId ? imgs[0] && imgs[0].id : null;
  for (const im of imgs) {
    if (isCollapsed && store.selectedId !== im.id && showFallbackId !== im.id) continue;

    const item = document.createElement('div');
    item.className = 'thumb-item' + (store.selectedId === im.id ? ' is-selected' : '');
    item.dataset.id = im.id;

    const thumb = document.createElement('img');
    thumb.className = 'thumb';
    if (im.summary.thumbnail) thumb.src = im.summary.thumbnail;
    item.appendChild(thumb);

    const info = document.createElement('div');
    info.className = 'thumb-info';
    const title = document.createElement('div');
    title.className = 'title';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'file-name-text';
    nameSpan.textContent = im.summary.fileName || im.file.name;
    title.appendChild(nameSpan);

    // 文件名右侧图标：错误标签 · POI · 已修改
    const icons = document.createElement('span');
    icons.className = 'file-name-icons';

    if (im.summary.error) {
      const cls = classifyExifError(im.summary.error);
      const et = document.createElement('span');
      et.className = 'error-tag' + (cls && cls.warn ? ' is-warn' : '');
      et.tabIndex = 0;
      et.setAttribute('role', 'note');
      et.textContent = cls ? cls.symbol : '!';
      const tip = document.createElement('span');
      tip.className = 'error-tooltip';
      if (cls) {
        tip.textContent = t('error.' + cls.key);
      } else {
        tip.textContent = String(im.summary.error);
      }
      et.appendChild(tip);
      et.addEventListener('click', (ev) => {
        ev.stopPropagation();
        et.classList.toggle('is-open');
      });
      icons.appendChild(et);
    }
    if (hasAnyLocation(im)) {
      const poi = document.createElement('span');
      poi.className = 'icon icon-poi';
      poi.textContent = '📍';
      poi.setAttribute('title', t('meta.hasLocation'));
      icons.appendChild(poi);
    }
    if (hasAnyEdit(im)) {
      const mod = document.createElement('span');
      mod.className = 'icon icon-modified';
      mod.textContent = '✎';
      mod.setAttribute('title', t('meta.hasEdit'));
      icons.appendChild(mod);
    }
    if (icons.childNodes.length > 0) title.appendChild(icons);
    info.appendChild(title);

    // 行 2: 大小 · 像素数（同一行，窄屏各自换行）
    const sub = document.createElement('div');
    sub.className = 'sub';
    const parts = [];
    if (im.summary.fileSize) parts.push(`<span class="item">${humanSize(im.summary.fileSize)}</span>`);
    if (im.summary.width && im.summary.height) parts.push(`<span class="item">${im.summary.width}×${im.summary.height}</span>`);
    sub.innerHTML = parts.join('');
    if (parts.length) info.appendChild(sub);

    // 行 3: 日期 · 定位 · 品牌型号（窄屏各自换行）
    const sub2 = document.createElement('div');
    sub2.className = 'sub sub-break';
    const parts2 = [];
    const dateVal = getDisplayValue(im, 'dateTimeOriginal');
    if (dateVal) {
      const dateModified = showEdited && hasEdit(im, 'dateTimeOriginal');
      const dateCleared = showEdited && isCleared(im, 'dateTimeOriginal');
      const cls = dateModified ? ' is-modified' : (dateCleared ? ' is-cleared' : '');
      parts2.push(`<span class="item${cls}">${formatExifDate(dateVal).slice(0, 16)}</span>`);
    }
    const gpsLatVal = getDisplayValue(im, 'gpsLat');
    const gpsLngVal = getDisplayValue(im, 'gpsLng');
    const gpsDisplay = formatGps(gpsLatVal, gpsLngVal);
    if (gpsDisplay) {
      const gpsModified = showEdited && (hasEdit(im, 'gpsLat') || hasEdit(im, 'gpsLng'));
      const gpsCleared = showEdited && (isCleared(im, 'gpsLat') || isCleared(im, 'gpsLng'));
      const cls = gpsModified ? ' is-modified' : (gpsCleared ? ' is-cleared' : '');
      parts2.push(`<span class="item gps${cls}">${gpsDisplay}</span>`);
    }
    const makeVal = getDisplayValue(im, 'make');
    const modelVal = getDisplayValue(im, 'model');
    const equipDisplay = [makeVal, modelVal].filter(Boolean).join(' ');
    if (equipDisplay) {
      const equipModified = showEdited && (hasEdit(im, 'make') || hasEdit(im, 'model'));
      const equipCleared = showEdited && (isCleared(im, 'make') || isCleared(im, 'model'));
      const cls = equipModified ? ' is-modified' : (equipCleared ? ' is-cleared' : '');
      parts2.push(`<span class="item${cls}">${equipDisplay}</span>`);
    }
    sub2.innerHTML = parts2.join('');
    if (sub2.innerHTML !== '') info.appendChild(sub2);

    item.appendChild(info);

    const del = document.createElement('button');
    del.className = 'del-btn';
    del.type = 'button';
    del.textContent = '×';
    del.setAttribute('aria-label', t('thumb.remove'));
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      store.removeImage(im.id);
    });
    item.appendChild(del);

    item.addEventListener('click', () => {
      store.selectImage(im.id);
      if (store.mode !== 'single') store.setMode('single');
    });
    thumbListEl.appendChild(item);
  }

  // ------ 浏览模式编辑器内容 ------
  const selected = imgs.find((im) => im.id === store.selectedId);
  if (selected && store.mode === 'single') {
    singleHintEl.hidden = true;
    singleEditorEl.hidden = false;

    // 切换图片时重置预设下拉与滑块 (避免残留上一张的预设状态)
    if (lastRenderedSelectedId !== selected.id) {
      if (singlePresetSelect) singlePresetSelect.value = '';
      if (singlePresetOffsetSlider) singlePresetOffsetSlider.value = '0';
      if (singlePresetOffsetView) singlePresetOffsetView.textContent = '0';
      lastRenderedSelectedId = selected.id;
    }

    singleThumbEl.innerHTML = '';
    const img = document.createElement('img');
    if (selected.summary.thumbnail) img.src = selected.summary.thumbnail;
    singleThumbEl.appendChild(img);

    // 浏览模式信息区
    // 行1: 文件名（跨两栏）
    // 行2: 尺寸 · 像素数（跨两栏）
    // 行3: 日期时间（左） | 曝光参数（右）
    // 行4: 位置（左） | 焦距参数（右）
    // 行5: 品牌型号（左） | 闪光灯（右）
    // 注: 没有内容时用占位保持对齐
    singleMetaEl.className = 'meta meta-grid';
    singleMetaEl.innerHTML = '';

    const addCell = (classes, text, buildFn) => {
      const cell = document.createElement('div');
      const isEmpty = (text === '' || text.trim() === '') && !buildFn;
      cell.className = 'meta-cell ' + classes + (isEmpty ? ' is-empty' : '');
      if (isEmpty) {
        cell.style.visibility = 'hidden';
      } else if (typeof buildFn === 'function') {
        buildFn(cell);
      } else {
        cell.textContent = text;
      }
      singleMetaEl.appendChild(cell);
    };

    // 行1: 文件名 + 错误/POI/修改 图标
    addCell('title row-span', selected.summary.fileName || selected.file.name, (cell) => {
      const nameSpan = document.createElement('span');
      nameSpan.className = 'file-name-text';
      nameSpan.textContent = selected.summary.fileName || selected.file.name;
      cell.appendChild(nameSpan);

      const icons = document.createElement('span');
      icons.className = 'file-name-icons';

      if (selected.summary.error) {
        const cls = classifyExifError(selected.summary.error);
        const et = document.createElement('span');
        et.className = 'error-tag' + (cls && cls.warn ? ' is-warn' : '');
        et.tabIndex = 0;
        et.textContent = cls ? cls.symbol : '!';
        const tip = document.createElement('span');
        tip.className = 'error-tooltip';
        tip.textContent = cls ? t('error.' + cls.key) : String(selected.summary.error);
        et.appendChild(tip);
        et.addEventListener('click', (ev) => {
          ev.stopPropagation();
          et.classList.toggle('is-open');
        });
        icons.appendChild(et);
      }
      if (hasAnyLocation(selected)) {
        const poi = document.createElement('span');
        poi.className = 'icon icon-poi';
        poi.textContent = '📍';
        poi.setAttribute('title', t('meta.hasLocation'));
        icons.appendChild(poi);
      }
      if (hasAnyEdit(selected)) {
        const mod = document.createElement('span');
        mod.className = 'icon icon-modified';
        mod.textContent = '✎';
        mod.setAttribute('title', t('meta.hasEdit'));
        icons.appendChild(mod);
      }
      if (icons.childNodes.length > 0) cell.appendChild(icons);
    });

    // 行2: 尺寸 · 像素数
    const sizeParts = [];
    if (selected.summary.fileSize) sizeParts.push(humanSize(selected.summary.fileSize));
    if (selected.summary.width && selected.summary.height) sizeParts.push(`${selected.summary.width}×${selected.summary.height}`);
    if (sizeParts.length) addCell('row-span', sizeParts.join(' · '));
    else addCell('row-span', ' ');

    // 行3 左: 日期时间
    const dateVal2 = getDisplayValue(selected, 'dateTimeOriginal');
    const dateMod = showEdited && hasEdit(selected, 'dateTimeOriginal');
    const dateClr = showEdited && isCleared(selected, 'dateTimeOriginal');
    addCell('row3 col1' + (dateMod ? ' is-modified' : (dateClr ? ' is-cleared' : '')), dateVal2 ? `📅 ${formatExifDate(dateVal2)}` : '');

    // 行4 左: 位置
    const latV2 = getDisplayValue(selected, 'gpsLat');
    const lngV2 = getDisplayValue(selected, 'gpsLng');
    const gpsMod = showEdited && (hasEdit(selected, 'gpsLat') || hasEdit(selected, 'gpsLng'));
    const gpsClr = showEdited && (isCleared(selected, 'gpsLat') || isCleared(selected, 'gpsLng'));
    addCell('gps row4 col1' + (gpsMod ? ' is-modified' : (gpsClr ? ' is-cleared' : '')), (latV2 != null && lngV2 != null) ? `📍 ${formatGps(latV2, lngV2)}` : '');

    // 行5 左: 品牌型号
    const makeV2 = getDisplayValue(selected, 'make');
    const modelV2 = getDisplayValue(selected, 'model');
    const equipMod = showEdited && (hasEdit(selected, 'make') || hasEdit(selected, 'model'));
    const equipClr = showEdited && (isCleared(selected, 'make') || isCleared(selected, 'model'));
    addCell('row5 col1' + (equipMod ? ' is-modified' : (equipClr ? ' is-cleared' : '')), (makeV2 || modelV2) ? `📷 ${[makeV2, modelV2].filter(Boolean).join(' ')}` : '');

    // 行3 右: 曝光参数（f/X.X · 1/XXXs · ISOXXX · X.X EV, 无中文标签
    const expBits = [];
    if (selected.summary.fNumber) {
      // "F1.6" → "f/1.6"
      const rawF = String(selected.summary.fNumber);
      const numericF = rawF.replace(/^[Ff]/, '').trim();
      expBits.push(`f/${numericF}`);
    }
    if (selected.summary.exposureTime) expBits.push(selected.summary.exposureTime);
    if (selected.summary.isoSpeedRatings) expBits.push(selected.summary.isoSpeedRatings);
    if (selected.summary.exposureBias) expBits.push(selected.summary.exposureBias);
    addCell('row3 col2', expBits.join(' · '));

    // 行4 右: 焦距参数（XXX mm（等效焦距 YYY mm）→ 用数字值 + i18n 模板
    const focalCell = (() => {
      const fl = selected.summary.focalLength;       // 数字，如 5.3
      const fl35 = selected.summary.focalLengthIn35mmFilm; // 数字，如 24
      if (!fl && !fl35) return '';
      if (fl && fl35) {
        // "5.3 mm（等效 24 mm）" 等
        return t('meta.focalMmCombo', { fl, fl35 });
      }
      if (fl) return t('meta.focalMm', { value: fl });
      return t('meta.focalEquivOnly', { fl35 });
    })();
    addCell('row4 col2', focalCell);

    // 行5 右: 闪光灯（用 EXIF flash code → 翻译表映射）
    let flashCell = '';
    if (selected.summary.flashCode != null) {
      const code = String(selected.summary.flashCode);
      const mapped = t(`flashDescription.${code}`);
      if (mapped && mapped !== `flashDescription.${code}`) {
        flashCell = mapped;
      } else {
        // 翻译表中没有该 code → 按最低位判断是否闪光，走通用翻译键
        const fired = (selected.summary.flashCode & 0x01) === 1;
        flashCell = t(fired ? 'flashDescription.1' : 'flashDescription.0');
      }
    }
    addCell('row5 col2', flashCell);

    // 填入输入框
    const rawDate = selected.edits.dateTimeOriginal.editedBy ? selected.edits.dateTimeOriginal.value : selected.summary.dateTimeOriginal;
    const parsed = parseExifDate(rawDate);
    if (singleInputs.dateTimeOriginal) singleInputs.dateTimeOriginal.value = parsed ? parsed.date : '';
    if (singleInputs.dateTimeOriginalTime) singleInputs.dateTimeOriginalTime.value = parsed ? parsed.time : '';
    if (singleInputs.gpsLat) singleInputs.gpsLat.value = selected.edits.gpsLat.editedBy ? String(selected.edits.gpsLat.value)
        : (selected.summary.gpsLat != null ? String(selected.summary.gpsLat) : '');
    if (singleInputs.gpsLng) singleInputs.gpsLng.value = selected.edits.gpsLng.editedBy ? String(selected.edits.gpsLng.value)
        : (selected.summary.gpsLng != null ? String(selected.summary.gpsLng) : '');
    if (singleInputs.make) singleInputs.make.value = selected.edits.make.editedBy ? selected.edits.make.value : (selected.summary.make || '');
    if (singleInputs.model) singleInputs.model.value = selected.edits.model.editedBy ? selected.edits.model.value : (selected.summary.model || '');
    if (singleInputs.software) singleInputs.software.value = selected.edits.software.editedBy ? selected.edits.software.value : (selected.summary.software || '');

    // 指示灯 & 高亮
    updateSingleFieldHighlight(selected);
  } else if (store.mode === 'single') {
    singleHintEl.hidden = false;
    singleEditorEl.hidden = true;
  }

  document.getElementById('mode-single').hidden = store.mode !== 'single';
  document.getElementById('mode-batch').hidden = store.mode !== 'batch';
  modeBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.mode === store.mode));

  if (store.mode === 'batch') updateBatchApplyButtons();

  // 导航按钮文本
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  if (prevBtn) prevBtn.textContent = t('action.prev');
  if (nextBtn) nextBtn.textContent = t('action.next');

  // 同步眼睛按钮状态（编辑状态变化时实时更新）
  updateViewToggleButtons();
}

function updateSingleFieldHighlight(im) {
  document.querySelectorAll('#single-editor [data-dot]').forEach((dot) => {
    const group = dot.dataset.dot;
    dot.hidden = !groupHasEdits(im, group);
  });
  document.querySelectorAll('#single-editor .field').forEach((fld) => {
    const name = fld.dataset.field;
    if (groupHasEdits(im, name)) fld.classList.add('is-modified');
    else fld.classList.remove('is-modified');
  });
}

// ====================================================================
// 预设下拉渲染
// ====================================================================
function renderPresetSelect() {
  const presets = listPresets();
  const dropdowns = [singlePresetSelect, batchPresetSelect].filter(Boolean);
  dropdowns.forEach((sel) => {
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = '';
    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = t('preset.quickSelect');
    sel.appendChild(opt0);
    for (const p of presets) {
      const displayName = getPresetDisplayName(p, t);
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = `${displayName} (${Number(p.lat).toFixed(3)}, ${Number(p.lng).toFixed(3)} ±${p.offsetMeters}m)`;
      sel.appendChild(o);
    }
    if (prev && presets.find((p) => p.id === prev)) {
      sel.value = prev;
    }
  });
}

// 当下拉框中当前选中的预设被改动后,把最新值回填到输入框与滑块
function syncActivePresetInputs() {
  // 单图模式：仅同步滑块/数值显示与输入框，不重新应用预设到图片（避免随机偏移）
  if (singlePresetSelect && singlePresetSelect.value) {
    const preset = listPresets().find((p) => p.id === singlePresetSelect.value);
    if (preset) {
      if (singlePresetOffsetSlider) singlePresetOffsetSlider.value = String(preset.offsetMeters);
      if (singlePresetOffsetView) singlePresetOffsetView.textContent = String(preset.offsetMeters);
      if (singleInputs.gpsLat) singleInputs.gpsLat.value = String(preset.lat);
      if (singleInputs.gpsLng) singleInputs.gpsLng.value = String(preset.lng);
    }
  }
  // 批量模式
  if (batchPresetSelect && batchPresetSelect.value) {
    const preset = listPresets().find((p) => p.id === batchPresetSelect.value);
    if (preset) {
      if (batchPresetOffsetSlider) batchPresetOffsetSlider.value = String(preset.offsetMeters);
      if (batchPresetOffsetView) batchPresetOffsetView.textContent = String(preset.offsetMeters);
      if (batchInputs.gpsLat) batchInputs.gpsLat.value = String(preset.lat);
      if (batchInputs.gpsLng) batchInputs.gpsLng.value = String(preset.lng);
      if (batchPresetInfo) batchPresetInfo.textContent = t('batch.presetFilled', { name: getPresetDisplayName(preset, t), offset: preset.offsetMeters });
      updateBatchApplyButtons();
    }
  }
  // 全局渲染刷新图片信息区
  if (typeof renderAll === 'function') renderAll();
}

function renderPresetList() {
  const presets = listPresets();
  presetListEl.innerHTML = '';
  const lastIdx = presets.length - 1;
  for (let i = 0; i < presets.length; i++) {
    const p = presets[i];
    const li = document.createElement('li');

    const left = document.createElement('div');
    left.className = 'preset-info';
    const name = document.createElement('div');
    name.className = 'preset-name';
    name.textContent = getPresetDisplayName(p, t);
    const sub = document.createElement('div');
    sub.className = 'preset-sub';
    sub.textContent = `(${Number(p.lat).toFixed(5)}, ${Number(p.lng).toFixed(5)}) · ±${p.offsetMeters}m`;
    left.appendChild(name);
    left.appendChild(sub);

    const right = document.createElement('div');
    right.className = 'preset-actions';

    // 上移 / 下移（紧凑图标按钮）
    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'preset-action-btn';
    upBtn.textContent = '▲';
    upBtn.setAttribute('aria-label', t('preset.moveUp', { defaultValue: 'Move up' }));
    if (i === 0) upBtn.disabled = true;
    upBtn.addEventListener('click', () => {
      movePresetUp(p.id);
      renderPresetSelect();
      renderPresetList();
      syncActivePresetInputs();
    });

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.className = 'preset-action-btn';
    downBtn.textContent = '▼';
    downBtn.setAttribute('aria-label', t('preset.moveDown', { defaultValue: 'Move down' }));
    if (i === lastIdx) downBtn.disabled = true;
    downBtn.addEventListener('click', () => {
      movePresetDown(p.id);
      renderPresetSelect();
      renderPresetList();
      syncActivePresetInputs();
    });

    // 编辑按钮（图标）
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'preset-action-btn';
    editBtn.textContent = '✎';
    editBtn.setAttribute('aria-label', t('common.edit'));
    editBtn.addEventListener('click', () => {
      editPresetInForm(p);
      if (modalPreset) {
        modalPreset.hidden = false;
        // 确保编辑表单可见：滚动 modal-card 到底部（表单在列表下方）
        const card = modalPreset.querySelector('.modal-card');
        if (card) card.scrollTop = card.scrollHeight;
        if (presetNameInput) presetNameInput.focus();
      }
    });

    // 删除按钮（图标 + 红色强调色）
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'preset-action-btn btn-danger';
    delBtn.textContent = '🗑';
    delBtn.setAttribute('aria-label', t('common.delete'));
    delBtn.addEventListener('click', async () => {
      const ok = await showConfirm(t('preset.deleteConfirm', { name: getPresetDisplayName(p, t) }));
      if (ok) {
        deletePreset(p.id);
        // 如果删除的是当前选中预设,先清下拉框
        if (singlePresetSelect && singlePresetSelect.value === p.id) {
          singlePresetSelect.value = '';
        }
        if (batchPresetSelect && batchPresetSelect.value === p.id) {
          batchPresetSelect.value = '';
        }
        renderPresetSelect();
        renderPresetList();
        syncActivePresetInputs();
      }
    });

    right.appendChild(upBtn);
    right.appendChild(downBtn);
    right.appendChild(editBtn);
    right.appendChild(delBtn);
    li.appendChild(left);
    li.appendChild(right);
    presetListEl.appendChild(li);
  }
}

let editingPresetId = null;
let editingPresetOriginalName = '';
function editPresetInForm(p) {
  editingPresetId = p.id;
  const displayName = getPresetDisplayName(p, t);
  editingPresetOriginalName = displayName;
  if (presetNameInput) presetNameInput.value = displayName;
  if (presetLatInput) presetLatInput.value = Number(p.lat);
  if (presetLngInput) presetLngInput.value = Number(p.lng);
  if (presetOffsetInput) presetOffsetInput.value = String(Number(p.offsetMeters));
  if (presetOffsetVal) presetOffsetVal.textContent = String(Number(p.offsetMeters));
  const header = document.getElementById('preset-form-title');
  if (header) {
    header.textContent = t('preset.editTitle') + ' · ' + displayName;
    header.dataset.i18n = '';
  }
}
function resetPresetForm(resetEditingId = true) {
  if (resetEditingId) editingPresetId = null;
  editingPresetOriginalName = '';
  const header = document.getElementById('preset-form-title');
  if (header) {
    header.textContent = t('preset.addTitle');
    header.dataset.i18n = 'preset.addTitle';
  }
  if (presetForm) presetForm.reset();
  if (presetOffsetInput && presetOffsetVal) presetOffsetVal.textContent = presetOffsetInput.value;
}

// ====================================================================
// 导航
// ====================================================================
function selectRelative(delta) {
  const imgs = store.images;
  if (!imgs.length) return;
  let idx = imgs.findIndex((im) => im.id === store.selectedId);
  if (idx < 0) idx = 0;
  const newIdx = (idx + delta + imgs.length) % imgs.length;
  store.selectImage(imgs[newIdx].id);
}

// ====================================================================
// 事件绑定
// ====================================================================

// ---- 选图 / 清空 ----
fileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  imageCountEl.textContent = t('header.parsing', { count: files.length });
  await store.addFiles(files);
  fileInput.value = '';
});
btnClear.addEventListener('click', async () => {
  const ok = await showConfirm(t('action.clearAll'));
  if (ok) store.clearAll();
});

// ---- 拖拽上传（全局） ----
let dragCounter = 0;
const dropOverlay = document.getElementById('drop-overlay');

window.addEventListener('dragenter', (e) => {
  if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return;
  e.preventDefault();
  dragCounter++;
  if (dropOverlay) dropOverlay.hidden = false;
});

window.addEventListener('dragover', (e) => {
  if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

window.addEventListener('dragleave', (e) => {
  if (!e.dataTransfer) return;
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    if (dropOverlay) dropOverlay.hidden = true;
  }
});

window.addEventListener('drop', async (e) => {
  if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return;
  e.preventDefault();
  dragCounter = 0;
  if (dropOverlay) dropOverlay.hidden = true;
  const files = Array.from(e.dataTransfer.files || []);
  if (!files.length) return;
  imageCountEl.textContent = t('header.parsing', { count: files.length });
  await store.addFiles(files);
});

// ---- 模式切换 ----
modeBtns.forEach((btn) => btn.addEventListener('click', () => store.setMode(btn.dataset.mode)));

// ---- 查看模式切换（两处按钮同步） ----
document.querySelectorAll('.btn-toggle-view').forEach((btn) => {
  btn.addEventListener('click', () => {
    setShowEdited(!showEdited);
  });
});

// ---- 缩略图列表折叠 ----
if (collapseToggle) {
  collapseToggle.addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    renderAll();
  });
}

// ---- 上下一张 ----
if (btnPrev) btnPrev.addEventListener('click', () => selectRelative(-1));
if (btnNext) btnNext.addEventListener('click', () => selectRelative(1));
document.addEventListener('keydown', (e) => {
  if (singleEditorEl && singleEditorEl.hidden) return;
  if (store.mode !== 'single') return;
  if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); selectRelative(-1); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); selectRelative(1); }
});

// ---- 浏览模式: 输入框变化 → 写入 edits ----
function attachSingleInput(field, input) {
  if (!input) return;
  const apply = () => {
    const id = store.selectedId;
    if (!id) return;
    let v = input.value;
    if (v === '' || v == null) {
      store.setEdit(id, field, null);
      return;
    }
    if (field === 'gpsLat' || field === 'gpsLng') v = Number(v);
    if (field === 'dateTimeOriginal') {
      // 使用 date+time 合成
      const d = singleInputs.dateTimeOriginal.value;
      const t = singleInputs.dateTimeOriginalTime ? singleInputs.dateTimeOriginalTime.value : '';
      if (!d && !t) {
        store.setEdit(id, 'dateTimeOriginal', null);
        return;
      }
      v = dtToExif(d, t);
      store.setEdit(id, 'dateTimeOriginal', v);
      return;
    }
    if (field === 'dateTimeOriginalTime') {
      const d = singleInputs.dateTimeOriginal ? singleInputs.dateTimeOriginal.value : '';
      const t = singleInputs.dateTimeOriginalTime.value;
      if (!d && !t) {
        store.setEdit(id, 'dateTimeOriginal', null);
        return;
      }
      v = dtToExif(d, t);
      store.setEdit(id, 'dateTimeOriginal', v);
      return;
    }
    store.setEdit(id, field, v);
  };
  input.addEventListener('change', apply);
  input.addEventListener('input', () => {
    const selected = store.images.find((im) => im.id === store.selectedId);
    if (!selected) return;
    const fldEl = input.closest('.field');
    if (!fldEl) return;
    // 仅在输入框变化时更新"实时"的 modified 视觉; 完整状态在 change 或 渲染时更新
    if (fldEl.dataset.field === 'dateTimeOriginal') {
      const d = singleInputs.dateTimeOriginal.value;
      const t = singleInputs.dateTimeOriginalTime.value;
      if (!d && !t) {
        fldEl.classList.remove('is-modified');
        return;
      }
      const newVal = dtToExif(d, t);
      const summaryVal = selected.summary.dateTimeOriginal;
      if (summaryVal && newVal && String(newVal) === String(summaryVal)) fldEl.classList.remove('is-modified');
      else fldEl.classList.add('is-modified');
    }
  });
}
for (const [field, input] of Object.entries(singleInputs)) attachSingleInput(field, input);

// ---- 浏览模式: 逐项重置 ----
singleResetButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = store.selectedId;
    if (!id) return;
    const im = store.images.find((x) => x.id === id);
    if (!im) return;
    const groupField = btn.dataset.resetSingle;
    const fields = fieldGroupMap[groupField] || [groupField];
    for (const f of fields) {
      im.edits[f] = { value: null, editedBy: null };
    }
    // GPS 组: 重置预设选择为不预设
    if (groupField === 'gps') {
      if (singlePresetSelect) singlePresetSelect.value = '';
    }
    renderAll();
  });
});

// ---- 浏览模式: 输入框内的小清除按钮 (data-clear-single) ----
document.querySelectorAll('[data-clear-single]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const field = btn.dataset.clearSingle;
    const id = store.selectedId;
    if (!id) return;

    // 找关联输入框并清空
    const input = document.querySelector(`[data-single="${field}"]`);
    if (input) input.value = '';

    // 写入 edits: 清空 = 从 EXIF 删除该字段 (editedBy:'user')
    const im = store.images.find((x) => x.id === id);
    if (!im) return;

    // dateTimeOriginal / dateTimeOriginalTime 联动: 清空时间视为清空整组
    if (field === 'dateTimeOriginal' || field === 'dateTimeOriginalTime') {
      im.edits.dateTimeOriginal = { value: null, editedBy: 'user' };
      // 同步清空另一个输入框
      const other = field === 'dateTimeOriginal'
        ? document.querySelector('[data-single="dateTimeOriginalTime"]')
        : document.querySelector('[data-single="dateTimeOriginal"]');
      if (other) other.value = '';
    } else {
      im.edits[field] = { value: null, editedBy: 'user' };
    }
    // 清空 GPS 时同步清空预设下拉
    if (field === 'gpsLat' || field === 'gpsLng') {
      if (singlePresetSelect) singlePresetSelect.value = '';
    }
    renderAll();
  });
});

// ---- 浏览模式: 预设下拉 ----
if (singlePresetSelect) {
  singlePresetSelect.addEventListener('change', () => {
    const id = store.selectedId;
    const presetId = singlePresetSelect.value;
    if (!presetId) {
      // 用户切回"不预设"
      return;
    }
    const preset = listPresets().find((p) => p.id === presetId);
    if (!preset) return;
    // 选了预设 → 填充值
    if (singlePresetOffsetSlider) singlePresetOffsetSlider.value = String(preset.offsetMeters);
    if (singlePresetOffsetView) singlePresetOffsetView.textContent = String(preset.offsetMeters);

    // 把带随机偏移的坐标应用到图片,并把经纬度输入框回填
    if (id) {
      const im = store.images.find((x) => x.id === id);
      if (im) {
        const offsetMeters = Number(singlePresetOffsetSlider ? singlePresetOffsetSlider.value : preset.offsetMeters);
        const p = { ...preset, offsetMeters };
        im.edits = applyPresetToImage(p, im.edits);
        if (singleInputs.gpsLat) singleInputs.gpsLat.value = String(im.edits.gpsLat.value);
        if (singleInputs.gpsLng) singleInputs.gpsLng.value = String(im.edits.gpsLng.value);
        renderAll();
      }
    }
  });
}
// 拖动 offset 滑块 → 重新随机偏移 (仅在已选预设时触发)
if (singlePresetOffsetSlider) {
  singlePresetOffsetSlider.addEventListener('input', () => {
    if (singlePresetOffsetView) singlePresetOffsetView.textContent = singlePresetOffsetSlider.value;
    const presetId = singlePresetSelect ? singlePresetSelect.value : '';
    if (!presetId) return;
    const id = store.selectedId;
    if (!id) return;
    const preset = listPresets().find((p) => p.id === presetId);
    if (!preset) return;
    const offsetMeters = Number(singlePresetOffsetSlider.value);
    const im = store.images.find((x) => x.id === id);
    if (!im) return;
    const p = { ...preset, offsetMeters };
    im.edits = applyPresetToImage(p, im.edits);
    if (singleInputs.gpsLat) singleInputs.gpsLat.value = String(im.edits.gpsLat.value);
    if (singleInputs.gpsLng) singleInputs.gpsLng.value = String(im.edits.gpsLng.value);
    renderAll();
  });
}

if (btnManagePresetSingle) {
  btnManagePresetSingle.addEventListener('click', () => {
    renderPresetList();
    modalPreset.hidden = false;
  });
}

// ---- 浏览模式: 重置整张 ----
if (btnSingleReset) {
  btnSingleReset.addEventListener('click', () => {
    const id = store.selectedId;
    if (!id) return;
    const im = store.images.find((x) => x.id === id);
    if (!im) return;
    for (const k of ['dateTimeOriginal', 'gpsLat', 'gpsLng', 'make', 'model', 'software']) {
      im.edits[k] = { value: null, editedBy: null };
    }
    // 重置所有预设 UI
    if (singlePresetSelect) singlePresetSelect.value = '';
    renderAll();
  });
}

// ---- 批量模式: 应用按钮状态（空 = 不修改） ----
function hasBatchValue(groupField) {
  if (groupField === 'dateTimeOriginal') {
    const d = batchInputs.dateTimeOriginal ? batchInputs.dateTimeOriginal.value : '';
    const t = batchInputs.dateTimeOriginalTime ? batchInputs.dateTimeOriginalTime.value : '';
    return !!(d || t);
  }
  if (groupField === 'gps') {
    const lat = batchInputs.gpsLat ? batchInputs.gpsLat.value : '';
    const lng = batchInputs.gpsLng ? batchInputs.gpsLng.value : '';
    return (lat !== '' && !isNaN(Number(lat))) || (lng !== '' && !isNaN(Number(lng)));
  }
  if (groupField === 'equip') {
    const mk = batchInputs.make ? batchInputs.make.value : '';
    const md = batchInputs.model ? batchInputs.model.value : '';
    return (mk && mk.trim() !== '') || (md && md.trim() !== '');
  }
  if (groupField === 'timeShift') {
    const yr = document.getElementById('shift-years')?.value || '';
    const mo = document.getElementById('shift-months')?.value || '';
    const dy = document.getElementById('shift-days')?.value || '';
    const hr = document.getElementById('shift-hours')?.value || '';
    const mi = document.getElementById('shift-minutes')?.value || '';
    const sc = document.getElementById('shift-seconds')?.value || '';
    return !!(yr || mo || dy || hr || mi || sc);
  }
  const v = batchInputs[groupField] ? batchInputs[groupField].value : '';
  return v !== '' && v != null;
}
function updateBatchApplyButtons() {
  batchApplyButtons.forEach((btn) => {
    const fld = btn.dataset.batchApply;
    btn.disabled = !hasBatchValue(fld);
  });
  // 时间平移的独立按钮
  const btnShift = document.getElementById('btn-batch-shift-apply');
  if (btnShift) btnShift.disabled = !hasBatchValue('timeShift');
}
for (const inp of Object.values(batchInputs)) {
  if (!inp) continue;
  inp.addEventListener('input', updateBatchApplyButtons);
  inp.addEventListener('change', updateBatchApplyButtons);
}
// 时间平移的数字输入也触发状态更新
['shift-years', 'shift-months', 'shift-days', 'shift-hours', 'shift-minutes', 'shift-seconds'].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', updateBatchApplyButtons);
  el.addEventListener('change', updateBatchApplyButtons);
});

// ---- 批量模式: "应用到全部"按钮 ----
batchApplyButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const groupField = btn.dataset.batchApply;
    if (!groupField) return;
    if (groupField === 'dateTimeOriginal') {
      // 支持只填日期或只填时间：空项不修改
      const d = batchInputs.dateTimeOriginal ? batchInputs.dateTimeOriginal.value : '';
      const t = batchInputs.dateTimeOriginalTime ? batchInputs.dateTimeOriginalTime.value : '';
      if (!d && !t) return;
      for (const im of store.images) {
        // 基于该图片的当前值（用户编辑的或原始的）做局部更新
        const base = im.edits.dateTimeOriginal.editedBy ? im.edits.dateTimeOriginal.value : im.summary.dateTimeOriginal;
        let parsed = { date: '', time: '' };
        if (base) {
          const pp = parseExifDate(base);
          if (pp) parsed = pp;
        }
        const newDate = d || parsed.date;
        const newTime = t || parsed.time || '00:00:00';
        // 无日期来源时跳过该图片，不写入非法的 0000:00:00
        if (newDate) {
          im.edits.dateTimeOriginal = { value: dtToExif(newDate, newTime), editedBy: 'user' };
        }
      }
      renderAll();
      return;
    }
    if (groupField === 'gps') {
      const latRaw = batchInputs.gpsLat ? batchInputs.gpsLat.value : '';
      const lngRaw = batchInputs.gpsLng ? batchInputs.gpsLng.value : '';
      const offsetRaw = batchPresetOffsetSlider ? batchPresetOffsetSlider.value : '0';
      // 至少一项有值才处理
      const latValid = latRaw !== '' && !isNaN(Number(latRaw));
      const lngValid = lngRaw !== '' && !isNaN(Number(lngRaw));
      if (!latValid && !lngValid) return;
      const baseLat = latValid ? Number(latRaw) : 0;
      const baseLng = lngValid ? Number(lngRaw) : 0;
      const offsetMeters = Number(offsetRaw) || 0;
      // 仅当两字段都有效时才应用预设（含随机偏移）；部分填充时只写用户填写的字段，不应用偏移
      if (latValid && lngValid) {
        for (const im of store.images) {
          im.edits = applyPresetToImage({ lat: baseLat, lng: baseLng, offsetMeters }, im.edits);
        }
      } else if (latValid) {
        for (const im of store.images) {
          im.edits.gpsLat = { value: baseLat, editedBy: 'user' };
        }
      } else {
        for (const im of store.images) {
          im.edits.gpsLng = { value: baseLng, editedBy: 'user' };
        }
      }
      renderAll();
      if (batchPresetInfo) {
        shiftMsgToken++; // 使待执行的时间平移消息恢复失效
        batchPresetInfo.textContent = t('batch.gpsApplied', { count: store.images.length, offset: offsetMeters });
      }
      return;
    }
    if (groupField === 'equip') {
      const makeV = batchInputs.make ? batchInputs.make.value.trim() : '';
      const modelV = batchInputs.model ? batchInputs.model.value.trim() : '';
      if (!makeV && !modelV) return;
      const values = {};
      if (makeV) values.make = makeV;
      if (modelV) values.model = modelV;
      store.applyFieldGroupToAll(values);
      return;
    }
    const inp = batchInputs[groupField];
    let raw = inp ? inp.value : '';
    if (raw == null || raw === '') return;
    store.applyFieldValueToAll(groupField, raw);
  });
});

// ---- 批量模式: "清空全部照片的该字段"按钮 ----
document.querySelectorAll('[data-batch-clear-all]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const groupField = btn.dataset.batchClearAll;
    if (!groupField) return;
    if (groupField === 'dateTimeOriginal') {
      for (const im of store.images) im.edits.dateTimeOriginal = { value: null, editedBy: 'user' };
    } else if (groupField === 'gps') {
      for (const im of store.images) {
        im.edits.gpsLat = { value: null, editedBy: 'user' };
        im.edits.gpsLng = { value: null, editedBy: 'user' };
      }
    } else if (groupField === 'equip') {
      for (const im of store.images) {
        im.edits.make = { value: null, editedBy: 'user' };
        im.edits.model = { value: null, editedBy: 'user' };
      }
    } else {
      // software 等
      const fld = groupField;
      for (const im of store.images) im.edits[fld] = { value: null, editedBy: 'user' };
    }
    renderAll();
  });
});

// ---- 批量模式: 时间平移：对每张图片独立加/减 年/月/日/时/分/秒 ----
// 空输入 = 该字段不参与平移（而非 0）；符号总是参与；仅当所有数字输入都为空时禁用。
const btnBatchShiftApply = document.getElementById('btn-batch-shift-apply');
if (btnBatchShiftApply) {
  btnBatchShiftApply.addEventListener('click', () => {
    const signEl = document.getElementById('shift-sign');
    const yearsEl = document.getElementById('shift-years');
    const monthsEl = document.getElementById('shift-months');
    const daysEl = document.getElementById('shift-days');
    const hoursEl = document.getElementById('shift-hours');
    const minutesEl = document.getElementById('shift-minutes');
    const secondsEl = document.getElementById('shift-seconds');

    const dir = signEl && signEl.value ? Number(signEl.value) : 1;
    const yrsRaw = yearsEl ? yearsEl.value : '';
    const mosRaw = monthsEl ? monthsEl.value : '';
    const dysRaw = daysEl ? daysEl.value : '';
    const hrsRaw = hoursEl ? hoursEl.value : '';
    const misRaw = minutesEl ? minutesEl.value : '';
    const scsRaw = secondsEl ? secondsEl.value : '';

    const yrs = yrsRaw !== '' ? Number(yrsRaw) : 0;
    const mos = mosRaw !== '' ? Number(mosRaw) : 0;
    const dys = dysRaw !== '' ? Number(dysRaw) : 0;
    const hrs = hrsRaw !== '' ? Number(hrsRaw) : 0;
    const mis = misRaw !== '' ? Number(misRaw) : 0;
    const scs = scsRaw !== '' ? Number(scsRaw) : 0;

    const hasAny = yrsRaw !== '' || mosRaw !== '' || dysRaw !== '' || hrsRaw !== '' || misRaw !== '' || scsRaw !== '';
    if (!hasAny) return;

    const doYear = yrsRaw !== '';
    const doMonth = mosRaw !== '';
    const doDay = dysRaw !== '';
    const doHms = hrsRaw !== '' || misRaw !== '' || scsRaw !== '';
    const deltaMs = (hrs * 3600 + mis * 60 + scs) * 1000;

    let applied = 0;
    for (const im of store.images) {
      const raw = im.edits.dateTimeOriginal.editedBy ? im.edits.dateTimeOriginal.value : im.summary.dateTimeOriginal;
      if (!raw) continue;
      const p = parseExifDate(raw);
      if (!p) continue;
      const original = new Date(`${p.date}T${p.time}`);
      if (Number.isNaN(original.getTime())) continue;

      const shifted = new Date(original.getTime());
      if (doYear) shifted.setFullYear(shifted.getFullYear() + dir * yrs);
      if (doMonth) shifted.setMonth(shifted.getMonth() + dir * mos);
      if (doDay) shifted.setDate(shifted.getDate() + dir * dys);
      if (doHms) shifted.setTime(shifted.getTime() + dir * deltaMs);

      const yyyy = String(shifted.getFullYear()).padStart(4, '0');
      const mm = String(shifted.getMonth() + 1).padStart(2, '0');
      const dd = String(shifted.getDate()).padStart(2, '0');
      const hh = String(shifted.getHours()).padStart(2, '0');
      const mi = String(shifted.getMinutes()).padStart(2, '0');
      const ss = String(shifted.getSeconds()).padStart(2, '0');
      im.edits.dateTimeOriginal = { value: `${yyyy}:${mm}:${dd} ${hh}:${mi}:${ss}`, editedBy: 'user-shift' };
      applied += 1;
    }
    renderAll();
    if (applied > 0) {
      const signStr = dir >= 0 ? '+' : '−';
      const parts = [];
      if (doYear) parts.push(`${yrs}${t('batch.shiftYears')}`);
      if (doMonth) parts.push(`${mos}${t('batch.shiftMonths')}`);
      if (doDay) parts.push(`${dys}${t('batch.shiftDays')}`);
      if (hrsRaw !== '') parts.push(`${hrs}${t('batch.shiftHours')}`);
      if (misRaw !== '') parts.push(`${mis}${t('batch.shiftMinutes')}`);
      if (scsRaw !== '') parts.push(`${scs}${t('batch.shiftSeconds')}`);
      const delta = signStr + (parts.length ? parts.join(' ') : '0');
      const msg = t('batch.shiftApplied', { count: applied, delta });
      const infoEl = document.getElementById('batch-preset-info');
      if (infoEl) {
        const myToken = ++shiftMsgToken;
        const orig = infoEl.textContent;
        infoEl.textContent = msg;
        setTimeout(() => { if (myToken === shiftMsgToken) infoEl.textContent = orig; }, 2500);
      } else {
        alert(msg);
      }
    }
  });
}

// ---- 批量模式: 预设下拉 → 只填入输入框 ----
if (batchPresetSelect) {
  batchPresetSelect.addEventListener('change', () => {
    const presetId = batchPresetSelect.value;
    if (!presetId) return;
    const preset = listPresets().find((p) => p.id === presetId);
    if (!preset) return;
    if (batchPresetOffsetSlider) {
      batchPresetOffsetSlider.value = String(preset.offsetMeters);
      if (batchPresetOffsetView) batchPresetOffsetView.textContent = String(preset.offsetMeters);
    }
    if (batchInputs.gpsLat) batchInputs.gpsLat.value = String(preset.lat);
    if (batchInputs.gpsLng) batchInputs.gpsLng.value = String(preset.lng);
    if (batchPresetInfo) batchPresetInfo.textContent = t('batch.presetFilled', { name: getPresetDisplayName(preset, t), offset: preset.offsetMeters });
    updateBatchApplyButtons();
  });
}

// ---- 批量模式: 拖动 offset 滑块 → 只更新数值显示 ----
if (batchPresetOffsetSlider) {
  batchPresetOffsetSlider.addEventListener('input', () => {
    if (batchPresetOffsetView) batchPresetOffsetView.textContent = batchPresetOffsetSlider.value;
  });
}

if (btnManagePreset) {
  btnManagePreset.addEventListener('click', () => {
    renderPresetList();
    modalPreset.hidden = false;
  });
}

// ---- 批量模式: 逐项重置（只清空输入框，不修改照片数据） ----
// 照片数据的清除由"清空全部"按钮（data-batch-clear-all）负责
batchResetButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const groupField = btn.dataset.batchReset;
    if (!groupField) return;
    if (groupField === 'timeShift') {
      const signEl = document.getElementById('shift-sign');
      const shiftY = document.getElementById('shift-years');
      const shiftMo = document.getElementById('shift-months');
      const shiftD = document.getElementById('shift-days');
      const shiftH = document.getElementById('shift-hours');
      const shiftMi = document.getElementById('shift-minutes');
      const shiftS = document.getElementById('shift-seconds');
      if (signEl) signEl.value = '1';
      if (shiftY) shiftY.value = '';
      if (shiftMo) shiftMo.value = '';
      if (shiftD) shiftD.value = '';
      if (shiftH) shiftH.value = '';
      if (shiftMi) shiftMi.value = '';
      if (shiftS) shiftS.value = '';
      updateBatchApplyButtons();
      return;
    }
    // 非 timeShift 栏：清空输入框 + 重置相关 UI 状态
    if (groupField === 'dateTimeOriginal') {
      if (batchInputs.dateTimeOriginal) batchInputs.dateTimeOriginal.value = '';
      if (batchInputs.dateTimeOriginalTime) batchInputs.dateTimeOriginalTime.value = '';
    } else if (groupField === 'gps') {
      if (batchInputs.gpsLat) batchInputs.gpsLat.value = '';
      if (batchInputs.gpsLng) batchInputs.gpsLng.value = '';
      if (batchPresetSelect) batchPresetSelect.value = '';
      if (batchPresetOffsetSlider) batchPresetOffsetSlider.value = '0';
      if (batchPresetOffsetView) batchPresetOffsetView.textContent = '0';
      if (batchPresetInfo) batchPresetInfo.textContent = t('batch.gpsPresetInfo');
    } else if (groupField === 'equip') {
      if (batchInputs.make) batchInputs.make.value = '';
      if (batchInputs.model) batchInputs.model.value = '';
    } else {
      const inp = batchInputs[groupField];
      if (inp) inp.value = '';
    }
    updateBatchApplyButtons();
  });
});

// ---- 批量模式: 输入框内的小清除按钮 (data-clear-batch) ----
document.querySelectorAll('[data-clear-batch]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const field = btn.dataset.clearBatch;
    const input = document.querySelector(`[data-batch="${field}"]`);
    if (input) input.value = '';
    // dateTimeOriginal / dateTimeOriginalTime 联动
    if (field === 'dateTimeOriginal' || field === 'dateTimeOriginalTime') {
      const other = field === 'dateTimeOriginal'
        ? document.querySelector('[data-batch="dateTimeOriginalTime"]')
        : document.querySelector('[data-batch="dateTimeOriginal"]');
      if (other) other.value = '';
    }
    // 清空 GPS 时同步清空预设下拉
    if (field === 'gpsLat' || field === 'gpsLng') {
      if (batchPresetSelect) batchPresetSelect.value = '';
    }
    updateBatchApplyButtons();
  });
});

// ---- 预设管理弹窗 ----
if (btnPresetClose) {
  btnPresetClose.addEventListener('click', () => {
    modalPreset.hidden = true;
    resetPresetForm(true);
  });
}
if (presetOffsetInput && presetOffsetVal) {
  presetOffsetInput.addEventListener('input', () => { presetOffsetVal.textContent = presetOffsetInput.value; });
}
// ---- 预设管理: 清空表单 ----
const btnPresetClear = document.getElementById('btn-preset-clear');
if (btnPresetClear) {
  btnPresetClear.addEventListener('click', () => {
    resetPresetForm(true);
  });
}
if (presetForm) {
  presetForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // 只有当用户改动了名称时才在 payload 中带 name
    // 默认预设若名称未改动 → name 不持久化 → 仍随语言切换
    // 用户自建预设 → 总是带 name（提交时非空则使用非空值，否则 fallback 到 'Untitled'）
    const currentName = presetNameInput ? presetNameInput.value.trim() : '';
    const isNewPreset = editingPresetId === null || editingPresetId === undefined;
    const nameChanged = (currentName !== editingPresetOriginalName);
    const payload = {
      id: editingPresetId,
      lat: Number(presetLatInput.value),
      lng: Number(presetLngInput.value),
      offsetMeters: Number(presetOffsetInput.value),
    };
    if (isNewPreset || nameChanged) {
      payload.name = currentName;
    }
    savePreset(payload);
    resetPresetForm(true);
    renderPresetSelect();
    renderPresetList();
    syncActivePresetInputs();
  });
}
if (modalPreset) {
  modalPreset.addEventListener('click', (e) => {
    if (e.target === modalPreset) {
      modalPreset.hidden = true;
      resetPresetForm(true);
    }
  });
}
if (modalConfirm) {
  // 遮罩点击由 showConfirm 内部处理 (resolve false), 此处无需重复绑定
}

// ---- 导出 ----
function showProgress(percent, text) {
  progressWrap.hidden = false;
  progressFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  if (text) progressText.textContent = text;
}
function hideProgress() {
  progressWrap.hidden = true;
  progressFill.style.width = '0%';
  progressText.textContent = '';
}
if (btnExportOne) {
  btnExportOne.addEventListener('click', async () => {
    const selected = store.images.find((im) => im.id === store.selectedId);
    if (!selected) {
      alert(t('error.selectOne'));
      return;
    }
    btnExportOne.classList.add('is-loading');
    btnExportOne.disabled = true;
    if (btnExportZip) btnExportZip.disabled = true;
    try {
      await exportOneByOne([selected], (p) => {
        showProgress(p.percent || 0, `${p.name || ''} (${Math.round(p.percent)}%)`);
      });
      showProgress(100, t('action.completed'));
      setTimeout(() => hideProgress(), 1200);
    } catch (err) {
      alert(t('error.exportFail', { message: (err && err.message ? err.message : err) }));
      hideProgress();
    } finally {
      btnExportOne.classList.remove('is-loading');
      btnExportOne.disabled = false;
      if (btnExportZip) btnExportZip.disabled = false;
    }
  });
}
if (btnExportZip) {
  btnExportZip.addEventListener('click', async () => {
    if (store.images.length === 0) return;
    btnExportZip.classList.add('is-loading');
    btnExportZip.disabled = true;
    if (btnExportOne) btnExportOne.disabled = true;
    try {
      await exportZip(store.images, (p) => {
        showProgress(p.percent || 0, t('action.packing', { percent: Math.round(p.percent) }));
      });
      showProgress(100, t('action.completed'));
      setTimeout(() => hideProgress(), 1200);
    } catch (err) {
      alert(t('error.exportFail', { message: (err && err.message ? err.message : err) }));
      hideProgress();
    } finally {
      btnExportZip.classList.remove('is-loading');
      btnExportZip.disabled = false;
      if (btnExportOne) btnExportOne.disabled = false;
    }
  });
}

// ====================================================================
// 启动
// ====================================================================
store.subscribe(() => renderAll());

initTheme();
initSettingsControls();
applyDataI18n();
renderAll();
renderPresetSelect();
updateBatchApplyButtons();

// Android: 启动时申请权限（通知 + 存储）
requestAndroidPermissions();
// 初始设置查看模式（眼睛图标状态）
document.querySelectorAll('.btn-toggle-view').forEach((btn) => {
  btn.textContent = '👁';
  btn.title = t('toggle.viewEdited');
});

setTimeout(() => {
  applyDataI18n();
  renderAll();
  renderPresetSelect();
  updateBatchApplyButtons();
}, 0);
