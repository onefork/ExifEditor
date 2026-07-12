<template>
  <div class="app" :data-theme="theme">
    <SettingsBar
      :language="language"
      :theme="theme"
      :mode="store.mode"
      @change-language="onChangeLanguage"
      @change-theme="onChangeTheme"
      @change-mode="onChangeMode"
    />
    <main class="app__main">
      <ImageList
        :images="images"
        :selected-id="store.selectedId"
        @select="onSelectImage"
        @add-files="onAddFiles"
        @remove="onRemoveImage"
        @clear="onClearAll"
      />
      <ExifEditor
        v-if="store.selectedId && store.mode === 'single'"
        :image="selectedImage"
      />
      <BatchEditor
        v-else-if="store.mode === 'batch'"
        :images="images"
      />
      <PresetManager />
      <ExportPanel
        :images="images"
        @export-one="onExportOne"
        @export-zip="onExportZip"
      />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, provide, ref } from 'vue';
import {
  changeLanguage,
  currentLanguage,
  onLanguageChanged,
  t,
} from '../../core/index.js';
import { getStoredTheme, setTheme } from '../../platform/web/dom-i18n.js';

import SettingsBar from './components/SettingsBar.vue';
import ImageList from './components/ImageList.vue';
import ExifEditor from './components/ExifEditor.vue';
import BatchEditor from './components/BatchEditor.vue';
import PresetManager from './components/PresetManager.vue';
import ExportPanel from './components/ExportPanel.vue';
import { useImageStore } from './composables/useImageStore.js';
import { useExporter } from './composables/useExporter.js';

const props = defineProps({
  readExif: { type: Function, required: true },
});

const { store, images } = useImageStore(props.readExif);
const { isExporting, progress, lastMessage, exportOne, exportZipAll } = useExporter();

const language = ref(currentLanguage());
const theme = ref(getStoredTheme());

// Reactively re-render t()-bound text when the core i18n language changes.
onLanguageChanged((lng) => {
  language.value = lng;
});

const selectedImage = computed(() =>
  images.value.find((im) => im.id === store.selectedId) || null
);

function onSelectImage(id) {
  store.selectImage(id);
}

async function onAddFiles(fileList) {
  await store.addFiles(fileList);
}

function onRemoveImage(id) {
  store.removeImage(id);
}

function onClearAll() {
  store.clearAll();
}

function onChangeMode(mode) {
  store.setMode(mode);
}

async function onChangeLanguage(code) {
  await changeLanguage(code);
  try { localStorage.setItem('exif-editor.language', code); } catch (_) { /* ignore */ }
  language.value = currentLanguage();
}

function onChangeTheme(code) {
  setTheme(code);
  theme.value = code;
}

function onExportOne() {
  exportOne(images.value);
}

function onExportZip() {
  exportZipAll(images.value);
}

// Expose shared values for child components via provide/inject pattern.
provide('t', t);
provide('language', language);
provide('imageStore', store);
provide('isExporting', isExporting);
provide('progress', progress);
provide('lastMessage', lastMessage);

onMounted(() => {
  // Re-sync language in case i18next resolved to a different value after init.
  language.value = currentLanguage();
});
</script>

<style scoped>
.app {
  min-height: 100vh;
  background: var(--app-bg, #f5f6f8);
  color: var(--app-fg, #1f2329);
  font-size: 16px;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}
.app__main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  max-width: 720px;
  margin: 0 auto;
}
:deep([data-theme='dark']) {
  --app-bg: #1a1d23;
  --app-fg: #e6e6e6;
  --card-bg: #2a2e36;
  --card-fg: #e6e6e6;
  --border: #3a3f4a;
}
</style>
