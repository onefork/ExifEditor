<template>
  <header class="settings-bar">
    <div class="settings-bar__group">
      <label class="settings-bar__label">{{ t('settings.language') }}</label>
      <select
        class="settings-bar__select"
        :value="language"
        @change="onChangeLanguage"
      >
        <option v-for="lang in SUPPORTED_LANGUAGES" :key="lang.code" :value="lang.code">
          <span class="settings-bar__flag">{{ flagEmoji(lang.code) }}</span>
          {{ lang.label }}
        </option>
      </select>
    </div>

    <div class="settings-bar__group">
      <label class="settings-bar__label">{{ t('settings.theme') }}</label>
      <select
        class="settings-bar__select"
        :value="theme"
        @change="onChangeTheme"
      >
        <option v-for="th in THEMES" :key="th.code" :value="th.code">
          {{ t(th.labelKey) }}
        </option>
      </select>
    </div>

    <div class="settings-bar__group">
      <label class="settings-bar__label">{{ t('settings.mode') }}</label>
      <div class="settings-bar__segmented">
        <button
          type="button"
          class="settings-bar__seg-btn"
          :class="{ 'is-active': mode === 'single' }"
          @click="emit('change-mode', 'single')"
        >{{ t('settings.modeSingle') }}</button>
        <button
          type="button"
          class="settings-bar__seg-btn"
          :class="{ 'is-active': mode === 'batch' }"
          @click="emit('change-mode', 'batch')"
        >{{ t('settings.modeBatch') }}</button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { SUPPORTED_LANGUAGES, t } from '../../../core/index.js';
import { THEMES } from '../../../platform/web/dom-i18n.js';

defineProps({
  language: { type: String, default: 'en' },
  theme: { type: String, default: 'system' },
  mode: { type: String, default: 'single' },
});

const emit = defineEmits(['change-language', 'change-theme', 'change-mode']);

function onChangeLanguage(e) {
  emit('change-language', e.target.value);
}

function onChangeTheme(e) {
  emit('change-theme', e.target.value);
}

// Map a language code to a flag emoji for inline display in the dropdown.
function flagEmoji(code) {
  const base = code.split('-')[0];
  const map = {
    en: '🇬🇧', 'zh-CN': '🇨🇳', 'zh-TW': '🇹🇼', ja: '🇯🇵', ko: '🇰🇷',
    de: '🇩🇪', fr: '🇫🇷', es: '🇪🇸', pt: '🇵🇹', it: '🇮🇹', ru: '🇷🇺', ar: '🇸🇦',
  };
  return map[code] || map[base] || '🌐';
}
</script>

<style scoped>
.settings-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--card-bg, #fff);
  border-bottom: 1px solid var(--border, #e4e6eb);
  position: sticky;
  top: 0;
  z-index: 10;
}
.settings-bar__group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.settings-bar__label {
  font-size: 13px;
  color: var(--app-fg, #555);
}
.settings-bar__select {
  min-height: 36px;
  padding: 0 8px;
  border: 1px solid var(--border, #d0d4dc);
  border-radius: 6px;
  background: var(--card-bg, #fff);
  color: var(--app-fg, inherit);
}
.settings-bar__segmented {
  display: inline-flex;
  border: 1px solid var(--border, #d0d4dc);
  border-radius: 6px;
  overflow: hidden;
}
.settings-bar__seg-btn {
  min-height: 36px;
  padding: 0 12px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
}
.settings-bar__seg-btn.is-active {
  background: #2f6feb;
  color: #fff;
}
.settings-bar__flag {
  margin-right: 6px;
}
</style>
