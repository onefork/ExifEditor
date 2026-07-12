// i18n / 主题 统一初始化
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './en.js';
import zhCN from './zh-CN.js';
import zhTW from './zh-TW.js';
import ja from './ja.js';
import ar from './ar.js';
import de from './de.js';
import es from './es.js';
import fr from './fr.js';
import pt from './pt.js';
import ko from './ko.js';
import ru from './ru.js';
import it from './it.js';

// 支持的语言列表（包含 RTL 语言）
export const SUPPORTED_LANGUAGES = [
  { code: 'en',    label: 'English',          dir: 'ltr' },
  { code: 'zh-CN', label: '简体中文',           dir: 'ltr' },
  { code: 'zh-TW', label: '繁體中文',           dir: 'ltr' },
  { code: 'ja',    label: '日本語',             dir: 'ltr' },
  { code: 'ko',    label: '한국어',             dir: 'ltr' },
  { code: 'de',    label: 'Deutsch',           dir: 'ltr' },
  { code: 'fr',    label: 'Français',          dir: 'ltr' },
  { code: 'es',    label: 'Español',           dir: 'ltr' },
  { code: 'pt',    label: 'Português',         dir: 'ltr' },
  { code: 'it',    label: 'Italiano',          dir: 'ltr' },
  { code: 'ru',    label: 'Русский',           dir: 'ltr' },
  { code: 'ar',    label: 'العربية',            dir: 'rtl' },
];
const FALLBACK_LANG = 'en';

// 所有已注册的语言包表，用来"语言包找不到时回落到英文"
const RESOURCES = {
  en:     { translation: en },
  'zh-CN': { translation: zhCN },
  'zh-TW': { translation: zhTW },
  ja:     { translation: ja },
  ar:     { translation: ar },
  de:     { translation: de },
  es:     { translation: es },
  fr:     { translation: fr },
  pt:     { translation: pt },
  ko:     { translation: ko },
  ru:     { translation: ru },
  it:     { translation: it },
};

// RTL 语言列表
const RTL_LANGS = new Set(['ar', 'fa', 'he', 'ur', 'ps', 'yi', 'sd', 'ug', 'dv']);

// 设置文档方向（RTL / LTR）
function setDocumentDirection(lng) {
  if (!lng) return;
  const base = lng.split('-')[0];
  const isRTL = RTL_LANGS.has(lng) || RTL_LANGS.has(base);
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
}

// ---------- i18next 初始化 ----------
i18next
  .use(LanguageDetector)
  .init({
    resources: RESOURCES,
    fallbackLng: FALLBACK_LANG,  // 任何缺失都回落到英文
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    detection: {
      // 优先顺序：localStorage → 浏览器 navigator.language → 系统 HTML lang
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'exif-editor.language',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // 纯 HTML, 无框架做自动转义
    },
    initImmediate: true,
  })
  .then(() => {
    // 初始化方向：优先取 localStorage，其次取浏览器推荐语言
    const lng = i18next.resolvedLanguage || i18next.language || FALLBACK_LANG;
    setDocumentDirection(lng);
  })
  .catch((err) => {
    // 初始化失败时强行切回英文
    console.warn('[i18n] init failed, forced fallback to English', err);
    try {
      i18next.changeLanguage(FALLBACK_LANG);
      setDocumentDirection(FALLBACK_LANG);
    } catch (_) { /* ignore */ }
  });

// 语言切换时再次"兜底"：目标语言不存在则落回英文
i18next.on('languageChanged', (lng) => {
  if (!lng) return;
  setDocumentDirection(lng);
  const base = lng.split('-')[0];
  const exists = RESOURCES[lng] || RESOURCES[base];
  if (!exists && lng !== FALLBACK_LANG) {
    // 防止无限循环
    if (!i18next.isChangingLanguage) {
      i18next.changeLanguage(FALLBACK_LANG);
    }
  }
});

// ---------- 主题管理 ----------
export const THEMES = [
  { code: 'light',  labelKey: 'settings.themeLight' },
  { code: 'dark',   labelKey: 'settings.themeDark' },
  { code: 'system', labelKey: 'settings.themeSystem' },
];
const THEME_STORAGE_KEY = 'exif-editor.theme';
const DEFAULT_THEME = 'system';

function applyTheme(themeCode) {
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

// ---------- 便捷翻译封装 ----------
export function t(key, options) {
  const val = i18next.t(key, options);
  // 若翻译结果就是 key 本身（例如语言包彻底缺失该条目），再尝试英文包
  if (val === key) {
    const fallback = i18next.t(key, { ...(options || {}), lng: FALLBACK_LANG });
    if (fallback !== key) return fallback;
  }
  return val;
}

export function changeLanguage(code) {
  return i18next.changeLanguage(code);
}
export function currentLanguage() {
  // 优先从 localStorage 读用户显式选择的值
  try {
    const stored = localStorage.getItem('exif-editor.language');
    if (stored) return stored;
  } catch (_) { /* ignore */ }
  // 回退：i18next 检测到的语言（浏览器推荐）→ 默认英文
  if (i18next.resolvedLanguage) return i18next.resolvedLanguage;
  // 极端情况：i18next 尚未初始化完成，直接从浏览器读取
  if (typeof navigator !== 'undefined' && navigator.language) {
    const browserLang = navigator.language;
    // 检查是否在支持的语言列表中
    const match = SUPPORTED_LANGUAGES.find(
      (l) => l.code === browserLang || l.code === browserLang.split('-')[0]
    );
    if (match) return match.code;
  }
  return FALLBACK_LANG;
}
export const FALLBACK_LANGUAGE = FALLBACK_LANG;
