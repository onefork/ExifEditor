// DOM-based i18n / theme operations for the Web platform.
// Extracted from src/i18n/index.js.
// Platform code — allowed to use document, window, localStorage.
// The pure translation logic lives in src/core/i18n.js; this module only
// handles DOM side-effects (document direction, theme attribute) and binds
// them to the core i18n module's language-change events.

const RTL_LANGS = new Set(['ar', 'fa', 'he', 'ur', 'ps', 'yi', 'sd', 'ug', 'dv']);

// 设置文档方向（RTL / LTR）与 lang 属性。
export function setDocumentDirection(lng) {
  if (!lng) return;
  const base = lng.split('-')[0];
  const isRTL = RTL_LANGS.has(lng) || RTL_LANGS.has(base);
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
}

// ---------- 主题管理 ----------
export const THEMES = [
  { code: 'light',  labelKey: 'settings.themeLight' },
  { code: 'dark',   labelKey: 'settings.themeDark' },
  { code: 'system', labelKey: 'settings.themeSystem' },
];
export const THEME_STORAGE_KEY = 'exif-editor.theme';
export const DEFAULT_THEME = 'system';

export function applyTheme(themeCode) {
  const root = document.documentElement;
  let effective = themeCode;
  if (effective === 'system') {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    effective = prefersDark ? 'dark' : 'light';
  }
  if (effective === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.setAttribute('data-theme', 'light');
  }
}

export function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
  } catch (_) {
    return DEFAULT_THEME;
  }
}

export function setTheme(themeCode) {
  const valid = THEMES.find((t) => t.code === themeCode);
  const code = valid ? themeCode : DEFAULT_THEME;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, code);
  } catch (_) { /* ignore */ }
  applyTheme(code);
}

export function initTheme() {
  applyTheme(getStoredTheme());
  // 当 theme 为 'system' 时，监听系统变化
  if (window.matchMedia) {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (getStoredTheme() === 'system') applyTheme('system');
    };
    if (mql.addEventListener) mql.addEventListener('change', handler);
    else if (mql.addListener) mql.addListener(handler); // 旧接口兼容
  }
}

// 将 DOM 方向同步绑定到核心 i18n 模块的语言切换事件。
// coreI18n 需提供 onLanguageChanged(callback) 与 currentLanguage()。
export function initDomI18n(coreI18n) {
  if (!coreI18n || typeof coreI18n.onLanguageChanged !== 'function') return;
  coreI18n.onLanguageChanged(setDocumentDirection);
  // 立即同步一次当前语言方向
  try {
    if (typeof coreI18n.currentLanguage === 'function') {
      setDocumentDirection(coreI18n.currentLanguage());
    }
  } catch (_) { /* ignore */ }
}

export default {
  setDocumentDirection,
  THEMES,
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
  applyTheme,
  getStoredTheme,
  setTheme,
  initTheme,
  initDomI18n,
};
