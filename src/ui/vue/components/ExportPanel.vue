<template>
  <section class="export-panel">
    <header class="export-panel__header">
      <h2 class="export-panel__title">{{ t('export.title') }}</h2>
      <span class="export-panel__count">{{ images.length }} {{ t('images.count') }}</span>
    </header>

    <div class="export-panel__actions">
      <button
        type="button"
        class="export-panel__btn export-panel__btn--primary"
        :disabled="images.length === 0 || isExporting"
        @click="emit('export-one')"
      >{{ t('export.oneByOne') }}</button>
      <button
        type="button"
        class="export-panel__btn export-panel__btn--primary"
        :disabled="images.length === 0 || isExporting"
        @click="emit('export-zip')"
      >{{ t('export.zip') }}</button>
    </div>

    <div v-if="isExporting" class="export-panel__progress">
      <div class="export-panel__progress-bar">
        <div
          class="export-panel__progress-fill"
          :style="{ width: progress + '%' }"
        ></div>
      </div>
      <div class="export-panel__progress-text">
        {{ Math.round(progress) }}%
        <span v-if="lastMessage">· {{ lastMessage }}</span>
      </div>
    </div>

    <p v-else-if="images.length === 0" class="export-panel__hint">
      {{ t('export.emptyHint') }}
    </p>
  </section>
</template>

<script setup>
import { inject } from 'vue';
import { t } from '../../../core/index.js';

defineProps({
  images: { type: Array, default: () => [] },
});

const emit = defineEmits(['export-one', 'export-zip']);

// App.vue wires the useExporter composable's state into these via inject so
// the panel can reflect progress without prop-drilling.
const isExporting = inject('isExporting', { value: false });
const progress = inject('progress', { value: 0 });
const lastMessage = inject('lastMessage', { value: '' });
</script>

<style scoped>
.export-panel {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border, #e4e6eb);
  border-radius: 10px;
  padding: 12px;
}
.export-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.export-panel__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.export-panel__count {
  font-size: 12px;
  color: var(--app-fg, #888);
}
.export-panel__actions {
  display: flex;
  gap: 8px;
}
.export-panel__btn {
  flex: 1;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--border, #d0d4dc);
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
}
.export-panel__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.export-panel__btn--primary {
  background: #2f6feb;
  border-color: #2f6feb;
  color: #fff;
}
.export-panel__btn--primary:disabled {
  background: var(--border, #ccc);
  border-color: var(--border, #ccc);
  color: var(--app-fg, #888);
}
.export-panel__progress {
  margin-top: 10px;
}
.export-panel__progress-bar {
  width: 100%;
  height: 8px;
  background: var(--border, #e4e6eb);
  border-radius: 4px;
  overflow: hidden;
}
.export-panel__progress-fill {
  height: 100%;
  background: #2f6feb;
  transition: width 0.15s ease;
}
.export-panel__progress-text {
  font-size: 12px;
  color: var(--app-fg, #666);
  margin-top: 4px;
}
.export-panel__hint {
  margin-top: 8px;
  font-size: 13px;
  color: var(--app-fg, #888);
  text-align: center;
}
</style>
