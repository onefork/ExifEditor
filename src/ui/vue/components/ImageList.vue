<template>
  <section class="image-list">
    <div class="image-list__header">
      <button type="button" class="image-list__add" @click="triggerFileInput">
        + {{ t('images.add') }}
      </button>
      <span class="image-list__count">{{ images.length }} {{ t('images.count') }}</span>
      <button
        v-if="images.length > 0"
        type="button"
        class="image-list__clear"
        @click="emit('clear')"
      >{{ t('images.clearAll') }}</button>
    </div>

    <input
      ref="fileInputEl"
      type="file"
      accept="image/*"
      multiple
      class="image-list__file-input"
      @change="onFileChange"
    />

    <div v-if="images.length === 0" class="image-list__empty">
      {{ t('images.emptyHint') }}
    </div>

    <ul v-else class="image-list__grid">
      <li
        v-for="im in images"
        :key="im.id"
        class="image-list__item"
        :class="{ 'is-selected': im.id === selectedId, 'has-error': im.summary && im.summary.error }"
        @click="emit('select', im.id)"
      >
        <img
          v-if="im.summary && im.summary.thumbnail"
          :src="im.summary.thumbnail"
          :alt="im.summary.fileName"
          class="image-list__thumb"
        />
        <div v-else class="image-list__thumb image-list__thumb--placeholder">?</div>
        <div class="image-list__meta">
          <div class="image-list__name" :title="im.summary && im.summary.fileName">
            {{ im.summary && im.summary.fileName }}
          </div>
          <div class="image-list__size">
            {{ im.summary ? humanSize(im.summary.fileSize) : '' }}
          </div>
          <div v-if="im.summary && im.summary.error" class="image-list__error">
            {{ t('error.exifFailed') }}
          </div>
        </div>
        <button
          type="button"
          class="image-list__remove"
          :title="t('images.remove')"
          @click.stop="emit('remove', im.id)"
        >×</button>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { humanSize, t } from '../../../core/index.js';

defineProps({
  images: { type: Array, default: () => [] },
  selectedId: { type: [String, null], default: null },
});

const emit = defineEmits(['select', 'add-files', 'remove', 'clear']);

const fileInputEl = ref(null);

function triggerFileInput() {
  if (fileInputEl.value) fileInputEl.value.click();
}

function onFileChange(e) {
  const files = e.target.files;
  if (files && files.length) {
    emit('add-files', files);
  }
  // Reset so the same file can be re-picked later.
  e.target.value = '';
}
</script>

<style scoped>
.image-list {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border, #e4e6eb);
  border-radius: 10px;
  padding: 12px;
}
.image-list__header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.image-list__add {
  min-height: 36px;
  padding: 0 14px;
  border: none;
  border-radius: 6px;
  background: #2f6feb;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}
.image-list__count {
  font-size: 13px;
  color: var(--app-fg, #555);
}
.image-list__clear {
  margin-left: auto;
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid var(--border, #d0d4dc);
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.image-list__file-input {
  display: none;
}
.image-list__empty {
  padding: 24px 8px;
  text-align: center;
  color: var(--app-fg, #888);
  font-size: 14px;
}
.image-list__grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
}
.image-list__item {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 2px solid transparent;
  border-radius: 8px;
  background: var(--card-bg, #f8f9fb);
  cursor: pointer;
  overflow: hidden;
}
.image-list__item.is-selected {
  border-color: #2f6feb;
}
.image-list__item.has-error {
  border-color: #d33;
}
.image-list__thumb {
  width: 100%;
  height: 100px;
  object-fit: cover;
  background: #eee;
}
.image-list__thumb--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #888;
}
.image-list__meta {
  padding: 6px 8px;
  font-size: 12px;
}
.image-list__name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.image-list__size {
  color: var(--app-fg, #888);
}
.image-list__error {
  color: #d33;
  font-size: 11px;
  margin-top: 2px;
}
.image-list__remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}
</style>
