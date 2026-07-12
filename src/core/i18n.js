// Pure i18n logic — ZERO platform dependencies.
// No DOM, browser storage, or browser global APIs are used here.
// DOM operations (setDocumentDirection, applyTheme, etc.) live in platform/web/dom-i18n.js.
// Language detection (i18next-browser-languagedetector) is handled by the entry layer,
// which detects the initial language and passes it into initI18n().
import i18next from 'i18next';

import en from './i18n/en.js';
import zhCN from './i18n/zh-CN.js';
import zhTW from './i18n/zh-TW.js';
import ja from './i18n/ja.js';
import ar from './i18n/ar.js';
import de from './i18n/de.js';
import es from './i18n/es.js';
import fr from './i18n/fr.js';
import pt from './i18n/pt.js';
import ko from './i18n/ko.js';
import ru from './i18n/ru.js';
import it from './i18n/it.js';

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

export const FALLBACK_LANGUAGE = 'en';

// 所有已注册的语言包表，用来"语言包找不到时回落到英文"
const RESOURCES = {
  en:      { translation: en },
  'zh-CN': { translation: zhCN },
  'zh-TW': { translation: zhTW },
  ja:      { translation: ja },
  ar:      { translation: ar },
  de:      { translation: de },
  es:      { translation: es },
  fr:      { translation: fr },
  pt:      { translation: pt },
  ko:      { translation: ko },
  ru:      { translation: ru },
  it:      { translation: it },
};

// RTL 语言列表
const RTL_LANGS = new Set(['ar', 'fa', 'he', 'ur', 'ps', 'yi', 'sd', 'ug', 'dv']);

// 纯函数：判断语言是否为 RTL。不操作 DOM。
export function isRTL(lng) {
  if (!lng) return false;
  const base = lng.split('-')[0];
  return RTL_LANGS.has(lng) || RTL_LANGS.has(base);
}

// ---------- i18next 初始化 ----------
// 不使用语言检测插件（它依赖浏览器存储与全局 API）。
// 入口层负责检测初始语言并传入 language 参数。
export function initI18n({ language } = {}) {
  return i18next.init({
    resources: RESOURCES,
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    lng: language || FALLBACK_LANGUAGE,
    interpolation: {
      escapeValue: false,
    },
    initImmediate: true,
  });
}

// 让平台层订阅语言切换事件，以更新 DOM 方向等。
// 核心层本身不在此处操作 DOM。
export function onLanguageChanged(callback) {
  i18next.on('languageChanged', callback);
}

// ---------- 便捷翻译封装 ----------
export function t(key, options) {
  const val = i18next.t(key, options);
  // 若翻译结果就是 key 本身（例如语言包彻底缺失该条目），再尝试英文包
  if (val === key) {
    const fallback = i18next.t(key, { ...(options || {}), lng: FALLBACK_LANGUAGE });
    if (fallback !== key) return fallback;
  }
  return val;
}

export function changeLanguage(code) {
  return i18next.changeLanguage(code);
}

export function currentLanguage() {
  // 不读取浏览器存储或全局 API。浏览器检测由 i18next-browser-languagedetector
  // 在平台层完成，或由入口层传入。此处仅反映 i18next 当前状态。
  return i18next.resolvedLanguage || i18next.language || FALLBACK_LANGUAGE;
}
