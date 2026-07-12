<template>
  <section v-if="image" class="exif-editor">
    <header class="exif-editor__header">
      <img
        v-if="image.summary && image.summary.thumbnail"
        :src="image.summary.thumbnail"
        :alt="image.summary.fileName"
        class="exif-editor__thumb"
      />
      <div class="exif-editor__title">
        <div class="exif-editor__name">{{ image.summary && image.summary.fileName }}</div>
        <div class="exif-editor__sub">
          {{ image.summary ? humanSize(image.summary.fileSize) : '' }}
          <span v-if="image.summary && image.summary.width">
            · {{ image.summary.width }}×{{ image.summary.height }}
          </span>
        </div>
      </div>
    </header>

    <div class="exif-editor__group">
      <label class="exif-editor__label">{{ t('edit.dateTimeOriginal') }}</label>
      <div class="exif-editor__row">
        <input
          type="date"
          class="exif-editor__input"
          :value="datePart"
          @input="onDateInput($event, 'date')"
        />
        <input
          type="time"
          step="1"
          class="exif-editor__input"
          :value="timePart"
          @input="onDateInput($event, 'time')"
        />
        <button
          type="button"
          class="exif-editor__reset"
          :title="t('edit.reset')"
          @click="resetField('dateTimeOriginal')"
        >↺</button>
      </div>
    </div>

    <div class="exif-editor__group">
      <label class="exif-editor__label">{{ t('edit.gps') }}</label>
      <div class="exif-editor__row">
        <input
          type="number"
          step="any"
          class="exif-editor__input"
          placeholder="Latitude"
          :value="fieldValue('gpsLat')"
          @input="onFieldInput($event, 'gpsLat')"
        />
        <input
          type="number"
          step="any"
          class="exif-editor__input"
          placeholder="Longitude"
          :value="fieldValue('gpsLng')"
          @input="onFieldInput($event, 'gpsLng')"
        />
        <button
          type="button"
          class="exif-editor__reset"
          :title="t('edit.reset')"
          @click="resetGps"
        >↺</button>
      </div>

      <div class="exif-editor__row exif-editor__preset-row">
        <select
          v-model="selectedPresetId"
          class="exif-editor__select"
          @change="onApplyPreset"
        >
          <option value="">{{ t('preset.selectPlaceholder') }}</option>
          <option v-for="p in presets" :key="p.id" :value="p.id">
            {{ getPresetDisplayName(p, t) }}
          </option>
        </select>
        <label class="exif-editor__slider-label">
          {{ t('preset.offset') }}: {{ presetOffset }}m
        </label>
        <input
          type="range"
          min="0"
          max="5000"
          step="10"
          v-model.number="presetOffset"
          class="exif-editor__slider"
        />
      </div>
    </div>

    <div class="exif-editor__group">
      <label class="exif-editor__label">{{ t('edit.make') }}</label>
      <div class="exif-editor__row">
        <input
          type="text"
          class="exif-editor__input"
          :value="fieldValue('make')"
          @input="onFieldInput($event, 'make')"
        />
        <button
          type="button"
          class="exif-editor__reset"
          :title="t('edit.reset')"
          @click="resetField('make')"
        >↺</button>
      </div>
    </div>

    <div class="exif-editor__group">
      <label class="exif-editor__label">{{ t('edit.model') }}</label>
      <div class="exif-editor__row">
        <input
          type="text"
          class="exif-editor__input"
          :value="fieldValue('model')"
          @input="onFieldInput($event, 'model')"
        />
        <button
          type="button"
          class="exif-editor__reset"
          :title="t('edit.reset')"
          @click="resetField('model')"
        >↺</button>
      </div>
    </div>

    <div class="exif-editor__group">
      <label class="exif-editor__label">{{ t('edit.software') }}</label>
      <div class="exif-editor__row">
        <input
          type="text"
          class="exif-editor__input"
          :value="fieldValue('software')"
          @input="onFieldInput($event, 'software')"
        />
        <button
          type="button"
          class="exif-editor__reset"
          :title="t('edit.reset')"
          @click="resetField('software')"
        >↺</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, inject, onMounted, ref, watch } from 'vue';
import {
  parseExifDate,
  dtToExif,
  t,
} from '../../../core/index.js';
import { usePreset } from '../composables/usePreset.js';

const props = defineProps({
  image: { type: Object, required: true },
});

// The parent (App.vue) owns the global image store and provides it via
// inject('imageStore'). All editors share the same store instance.
const store = inject('imageStore');

const { presets, refresh, getPresetDisplayName, applyPresetToImage } = usePreset();
const selectedPresetId = ref('');
const presetOffset = ref(300);

onMounted(refresh);

// Watch image switch: refresh presets is unnecessary, but reset preset selection.
watch(() => props.image && props.image.id, () => {
  selectedPresetId.value = '';
});

function fieldValue(field) {
  const im = props.image;
  if (!im || !im.edits) return '';
  const e = im.edits[field];
  if (e && e.editedBy && e.value !== null && e.value !== undefined) return e.value;
  const raw = im.summary && im.summary[field];
  return raw == null ? '' : raw;
}

const datePart = computed(() => {
  const v = fieldValue('dateTimeOriginal');
  const parsed = parseExifDate(v);
  return parsed ? parsed.date : (typeof v === 'string' ? v.split(/[ T]/)[0] : '');
});
const timePart = computed(() => {
  const v = fieldValue('dateTimeOriginal');
  const parsed = parseExifDate(v);
  return parsed ? parsed.time : '';
});

function onDateInput(e, kind) {
  const cur = fieldValue('dateTimeOriginal') || '';
  const parsed = parseExifDate(cur) || { date: '', time: '00:00:00' };
  const date = kind === 'date' ? e.target.value : parsed.date;
  const time = kind === 'time' ? e.target.value : parsed.time;
  const combined = dtToExif(date, time);
  store.setEdit(props.image.id, 'dateTimeOriginal', combined);
}

function onFieldInput(e, field) {
  const v = e.target.value;
  store.setEdit(props.image.id, field, v === '' ? null : v);
}

function resetField(field) {
  store.setEdit(props.image.id, field, null);
}

function resetGps() {
  store.setEdit(props.image.id, 'gpsLat', null);
  store.setEdit(props.image.id, 'gpsLng', null);
}

function onApplyPreset() {
  if (!selectedPresetId.value) return;
  const preset = presets.value.find((p) => p.id === selectedPresetId.value);
  if (!preset) return;
  const presetWithOffset = { ...preset, offsetMeters: Number(presetOffset.value) || 0 };
  const newEdits = applyPresetToImage(presetWithOffset, props.image.edits || {});
  // Apply the GPS fields returned by applyPresetToImage back into the store.
  if (newEdits && newEdits.gpsLat) {
    store.setEdit(props.image.id, 'gpsLat', newEdits.gpsLat.value);
  }
  if (newEdits && newEdits.gpsLng) {
    store.setEdit(props.image.id, 'gpsLng', newEdits.gpsLng.value);
  }
}
</script>

<style scoped>
.exif-editor {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border, #e4e6eb);
  border-radius: 10px;
  padding: 12px;
}
.exif-editor__header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.exif-editor__thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 6px;
}
.exif-editor__name {
  font-weight: 600;
  font-size: 14px;
  word-break: break-all;
}
.exif-editor__sub {
  font-size: 12px;
  color: var(--app-fg, #888);
}
.exif-editor__group {
  margin-bottom: 12px;
}
.exif-editor__label {
  display: block;
  font-size: 12px;
  color: var(--app-fg, #666);
  margin-bottom: 4px;
}
.exif-editor__row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.exif-editor__input {
  flex: 1 1 120px;
  min-height: 36px;
  padding: 0 8px;
  border: 1px solid var(--border, #d0d4dc);
  border-radius: 6px;
  background: var(--card-bg, #fff);
  color: inherit;
  font-size: 14px;
}
.exif-editor__reset {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border, #d0d4dc);
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 16px;
}
.exif-editor__preset-row {
  margin-top: 6px;
  align-items: center;
}
.exif-editor__select {
  flex: 1 1 160px;
  min-height: 36px;
  padding: 0 8px;
  border: 1px solid var(--border, #d0d4dc);
  border-radius: 6px;
  background: var(--card-bg, #fff);
  color: inherit;
}
.exif-editor__slider-label {
  font-size: 12px;
  color: var(--app-fg, #666);
  white-space: nowrap;
}
.exif-editor__slider {
  flex: 1 1 120px;
  min-width: 100px;
}
</style>
