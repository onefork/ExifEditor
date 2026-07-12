<template>
  <section class="preset-manager">
    <header class="preset-manager__header">
      <h2 class="preset-manager__title">{{ t('preset.title') }}</h2>
      <button
        type="button"
        class="preset-manager__toggle"
        @click="showForm = !showForm"
      >{{ showForm ? t('preset.closeForm') : t('preset.addNew') }}</button>
    </header>

    <ul class="preset-manager__list">
      <li v-for="(p, idx) in presets" :key="p.id" class="preset-manager__item">
        <div class="preset-manager__reorder">
          <button
            type="button"
            class="preset-manager__icon-btn"
            :disabled="idx === 0"
            :title="t('preset.moveUp')"
            @click="onMoveUp(p.id)"
          >▲</button>
          <button
            type="button"
            class="preset-manager__icon-btn"
            :disabled="idx === presets.length - 1"
            :title="t('preset.moveDown')"
            @click="onMoveDown(p.id)"
          >▼</button>
        </div>
        <div class="preset-manager__item-main">
          <div class="preset-manager__item-name">{{ getPresetDisplayName(p, t) }}</div>
          <div class="preset-manager__item-coord">
            {{ p.lat.toFixed(4) }}, {{ p.lng.toFixed(4) }} · {{ p.offsetMeters }}m
          </div>
        </div>
        <div class="preset-manager__item-actions">
          <button
            type="button"
            class="preset-manager__icon-btn"
            :title="t('preset.edit')"
            @click="onEdit(p)"
          >✎</button>
          <button
            type="button"
            class="preset-manager__icon-btn preset-manager__icon-btn--danger"
            :title="t('preset.delete')"
            @click="onDelete(p.id)"
          >🗑</button>
        </div>
      </li>
    </ul>

    <form v-if="showForm" class="preset-manager__form" @submit.prevent="onSave">
      <div class="preset-manager__form-row">
        <label class="preset-manager__form-label">{{ t('preset.name') }}</label>
        <input
          type="text"
          class="preset-manager__form-input"
          v-model="form.name"
          required
        />
      </div>
      <div class="preset-manager__form-row">
        <label class="preset-manager__form-label">{{ t('preset.latitude') }}</label>
        <input
          type="number"
          step="any"
          class="preset-manager__form-input"
          v-model.number="form.lat"
          required
        />
      </div>
      <div class="preset-manager__form-row">
        <label class="preset-manager__form-label">{{ t('preset.longitude') }}</label>
        <input
          type="number"
          step="any"
          class="preset-manager__form-input"
          v-model.number="form.lng"
          required
        />
      </div>
      <div class="preset-manager__form-row">
        <label class="preset-manager__form-label">
          {{ t('preset.offset') }}: {{ form.offsetMeters }}m
        </label>
        <input
          type="range"
          min="0"
          max="5000"
          step="10"
          v-model.number="form.offsetMeters"
          class="preset-manager__form-slider"
        />
      </div>
      <div class="preset-manager__form-actions">
        <button type="submit" class="preset-manager__btn preset-manager__btn--primary">
          {{ editingId ? t('preset.update') : t('preset.save') }}
        </button>
        <button type="button" class="preset-manager__btn" @click="resetForm">
          {{ t('preset.cancel') }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { usePreset } from '../composables/usePreset.js';
import { t } from '../../../core/index.js';

const {
  presets,
  refresh,
  savePreset,
  deletePreset,
  movePresetUp,
  movePresetDown,
  getPresetDisplayName,
} = usePreset();

const showForm = ref(false);
const editingId = ref(null);
const form = reactive({
  name: '',
  lat: 0,
  lng: 0,
  offsetMeters: 300,
});

onMounted(refresh);

async function onMoveUp(id) {
  await movePresetUp(id);
  await refresh();
}

async function onMoveDown(id) {
  await movePresetDown(id);
  await refresh();
}

async function onDelete(id) {
  await deletePreset(id);
  await refresh();
}

function onEdit(preset) {
  editingId.value = preset.id;
  form.name = getPresetDisplayName(preset, t);
  form.lat = preset.lat;
  form.lng = preset.lng;
  form.offsetMeters = preset.offsetMeters || 0;
  showForm.value = true;
}

async function onSave() {
  const payload = {
    id: editingId.value || undefined,
    name: form.name,
    lat: Number(form.lat),
    lng: Number(form.lng),
    offsetMeters: Number(form.offsetMeters) || 0,
  };
  await savePreset(payload);
  await refresh();
  resetForm();
}

function resetForm() {
  editingId.value = null;
  form.name = '';
  form.lat = 0;
  form.lng = 0;
  form.offsetMeters = 300;
  showForm.value = false;
}
</script>

<style scoped>
.preset-manager {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border, #e4e6eb);
  border-radius: 10px;
  padding: 12px;
}
.preset-manager__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.preset-manager__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.preset-manager__toggle {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid var(--border, #d0d4dc);
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 13px;
}
.preset-manager__list {
  list-style: none;
  margin: 0 0 10px 0;
  padding: 0;
}
.preset-manager__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border, #f0f1f4);
}
.preset-manager__item:last-child {
  border-bottom: none;
}
.preset-manager__reorder {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.preset-manager__item-main {
  flex: 1;
  min-width: 0;
}
.preset-manager__item-name {
  font-size: 14px;
  font-weight: 500;
  word-break: break-all;
}
.preset-manager__item-coord {
  font-size: 12px;
  color: var(--app-fg, #888);
}
.preset-manager__item-actions {
  display: flex;
  gap: 4px;
}
.preset-manager__icon-btn {
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid var(--border, #d0d4dc);
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
}
.preset-manager__icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.preset-manager__icon-btn--danger {
  color: #d33;
}
.preset-manager__form {
  border-top: 1px solid var(--border, #e4e6eb);
  padding-top: 10px;
}
.preset-manager__form-row {
  margin-bottom: 8px;
}
.preset-manager__form-label {
  display: block;
  font-size: 12px;
  color: var(--app-fg, #666);
  margin-bottom: 4px;
}
.preset-manager__form-input {
  width: 100%;
  min-height: 36px;
  padding: 0 8px;
  border: 1px solid var(--border, #d0d4dc);
  border-radius: 6px;
  background: var(--card-bg, #fff);
  color: inherit;
  font-size: 14px;
  box-sizing: border-box;
}
.preset-manager__form-slider {
  width: 100%;
}
.preset-manager__form-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
.preset-manager__btn {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--border, #d0d4dc);
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
}
.preset-manager__btn--primary {
  background: #2f6feb;
  border-color: #2f6feb;
  color: #fff;
}
</style>
