<template>
  <section class="batch-editor">
    <header class="batch-editor__header">
      <h2 class="batch-editor__title">{{ t('batch.title') }}</h2>
      <span class="batch-editor__count">{{ images.length }} {{ t('images.count') }}</span>
    </header>

    <p v-if="images.length === 0" class="batch-editor__empty">
      {{ t('batch.emptyHint') }}
    </p>

    <template v-else>
      <!-- DateTimeOriginal -->
      <div class="batch-editor__group">
        <label class="batch-editor__label">{{ t('edit.dateTimeOriginal') }}</label>
        <div class="batch-editor__row">
          <input
            type="date"
            class="batch-editor__input"
            v-model="batchValues.dateTimeOriginalDate"
          />
          <input
            type="time"
            step="1"
            class="batch-editor__input"
            v-model="batchValues.dateTimeOriginalTime"
          />
        </div>
        <div class="batch-editor__actions">
          <button
            type="button"
            class="batch-editor__btn batch-editor__btn--primary"
            :disabled="!hasBatchDateTime"
            @click="applyDateTime"
          >{{ t('batch.applyToAll') }}</button>
          <button
            type="button"
            class="batch-editor__btn"
            @click="clearField('dateTimeOriginal')"
          >✖ {{ t('batch.clearAll') }}</button>
          <button
            type="button"
            class="batch-editor__btn"
            @click="resetField('dateTimeOriginal')"
          >↺ {{ t('batch.reset') }}</button>
        </div>
      </div>

      <!-- GPS -->
      <div class="batch-editor__group">
        <label class="batch-editor__label">{{ t('edit.gps') }}</label>
        <div class="batch-editor__row">
          <input
            type="number"
            step="any"
            class="batch-editor__input"
            placeholder="Latitude"
            v-model="batchValues.gpsLat"
          />
          <input
            type="number"
            step="any"
            class="batch-editor__input"
            placeholder="Longitude"
            v-model="batchValues.gpsLng"
          />
        </div>
        <div class="batch-editor__actions">
          <button
            type="button"
            class="batch-editor__btn batch-editor__btn--primary"
            :disabled="!hasBatchGps"
            @click="applyGps"
          >{{ t('batch.applyToAll') }}</button>
          <button
            type="button"
            class="batch-editor__btn"
            @click="clearField('gpsLat')"
          >✖ {{ t('batch.clearAll') }}</button>
          <button
            type="button"
            class="batch-editor__btn"
            @click="resetField('gpsLat')"
          >↺ {{ t('batch.reset') }}</button>
        </div>
      </div>

      <!-- Make -->
      <div class="batch-editor__group">
        <label class="batch-editor__label">{{ t('edit.make') }}</label>
        <div class="batch-editor__row">
          <input
            type="text"
            class="batch-editor__input"
            v-model="batchValues.make"
          />
        </div>
        <div class="batch-editor__actions">
          <button
            type="button"
            class="batch-editor__btn batch-editor__btn--primary"
            :disabled="batchValues.make === ''"
            @click="applyField('make', batchValues.make)"
          >{{ t('batch.applyToAll') }}</button>
          <button
            type="button"
            class="batch-editor__btn"
            @click="clearField('make')"
          >✖ {{ t('batch.clearAll') }}</button>
          <button
            type="button"
            class="batch-editor__btn"
            @click="resetField('make')"
          >↺ {{ t('batch.reset') }}</button>
        </div>
      </div>

      <!-- Model -->
      <div class="batch-editor__group">
        <label class="batch-editor__label">{{ t('edit.model') }}</label>
        <div class="batch-editor__row">
          <input
            type="text"
            class="batch-editor__input"
            v-model="batchValues.model"
          />
        </div>
        <div class="batch-editor__actions">
          <button
            type="button"
            class="batch-editor__btn batch-editor__btn--primary"
            :disabled="batchValues.model === ''"
            @click="applyField('model', batchValues.model)"
          >{{ t('batch.applyToAll') }}</button>
          <button
            type="button"
            class="batch-editor__btn"
            @click="clearField('model')"
          >✖ {{ t('batch.clearAll') }}</button>
          <button
            type="button"
            class="batch-editor__btn"
            @click="resetField('model')"
          >↺ {{ t('batch.reset') }}</button>
        </div>
      </div>

      <!-- Software -->
      <div class="batch-editor__group">
        <label class="batch-editor__label">{{ t('edit.software') }}</label>
        <div class="batch-editor__row">
          <input
            type="text"
            class="batch-editor__input"
            v-model="batchValues.software"
          />
        </div>
        <div class="batch-editor__actions">
          <button
            type="button"
            class="batch-editor__btn batch-editor__btn--primary"
            :disabled="batchValues.software === ''"
            @click="applyField('software', batchValues.software)"
          >{{ t('batch.applyToAll') }}</button>
          <button
            type="button"
            class="batch-editor__btn"
            @click="clearField('software')"
          >✖ {{ t('batch.clearAll') }}</button>
          <button
            type="button"
            class="batch-editor__btn"
            @click="resetField('software')"
          >↺ {{ t('batch.reset') }}</button>
        </div>
      </div>

      <!-- Time shift section -->
      <div class="batch-editor__group batch-editor__time-shift">
        <label class="batch-editor__label">{{ t('batch.timeShift') }}</label>
        <div class="batch-editor__row">
          <select v-model.number="timeShift.sign" class="batch-editor__select">
            <option :value="1">+</option>
            <option :value="-1">−</option>
          </select>
          <input type="number" min="0" placeholder="Y" v-model.number="timeShift.years" class="batch-editor__input" />
          <input type="number" min="0" placeholder="M" v-model.number="timeShift.months" class="batch-editor__input" />
          <input type="number" min="0" placeholder="D" v-model.number="timeShift.days" class="batch-editor__input" />
          <input type="number" min="0" placeholder="h" v-model.number="timeShift.hours" class="batch-editor__input" />
          <input type="number" min="0" placeholder="m" v-model.number="timeShift.minutes" class="batch-editor__input" />
          <input type="number" min="0" placeholder="s" v-model.number="timeShift.seconds" class="batch-editor__input" />
        </div>
        <div class="batch-editor__actions">
          <button
            type="button"
            class="batch-editor__btn batch-editor__btn--primary"
            :disabled="!hasTimeShift"
            @click="applyTimeShift"
          >{{ t('batch.applyTimeShift') }}</button>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, inject, reactive } from 'vue';
import { parseExifDate, dtToExif, t } from '../../../core/index.js';

const props = defineProps({
  images: { type: Array, default: () => [] },
});

const store = inject('imageStore');

// Local batch input values; empty string means "do not modify".
const batchValues = reactive({
  dateTimeOriginalDate: '',
  dateTimeOriginalTime: '',
  gpsLat: '',
  gpsLng: '',
  make: '',
  model: '',
  software: '',
});

const timeShift = reactive({
  sign: 1,
  years: 0, months: 0, days: 0,
  hours: 0, minutes: 0, seconds: 0,
});

const hasBatchDateTime = computed(() =>
  batchValues.dateTimeOriginalDate !== '' || batchValues.dateTimeOriginalTime !== ''
);
const hasBatchGps = computed(() =>
  batchValues.gpsLat !== '' || batchValues.gpsLng !== ''
);
const hasTimeShift = computed(() =>
  timeShift.years || timeShift.months || timeShift.days ||
  timeShift.hours || timeShift.minutes || timeShift.seconds
);

function applyDateTime() {
  if (!hasBatchDateTime.value) return;
  // Combine date+time into EXIF format; reuse first image's existing value as fallback.
  const first = props.images[0];
  const fallback = first && first.edits && first.edits.dateTimeOriginal;
  const fbRaw = (fallback && fallback.editedBy ? fallback.value : (first && first.summary && first.summary.dateTimeOriginal)) || '';
  const parsed = parseExifDate(fbRaw) || { date: '', time: '00:00:00' };
  const date = batchValues.dateTimeOriginalDate || parsed.date;
  const time = batchValues.dateTimeOriginalTime || parsed.time;
  const combined = dtToExif(date, time);
  store.applyFieldValueToAll('dateTimeOriginal', combined);
}

function applyGps() {
  if (!hasBatchGps.value) return;
  const map = {};
  if (batchValues.gpsLat !== '') map.gpsLat = Number(batchValues.gpsLat);
  if (batchValues.gpsLng !== '') map.gpsLng = Number(batchValues.gpsLng);
  store.applyFieldGroupToAll(map);
}

function applyField(field, value) {
  if (value === '') return;
  store.applyFieldValueToAll(field, value);
}

function clearField(field) {
  store.applyFieldValueToAll(field, null);
}

function resetField(field) {
  // Reset: clear user edits for this field on every image.
  for (const im of props.images) {
    const raw = im.summary && im.summary[field];
    if (raw !== undefined && raw !== null) {
      store.setEdit(im.id, field, raw);
    } else {
      store.setEdit(im.id, field, null);
    }
  }
}

function applyTimeShift() {
  if (!hasTimeShift.value) return;
  const sign = timeShift.sign;
  for (const im of props.images) {
    const edit = im.edits && im.edits.dateTimeOriginal;
    const baseVal = edit && edit.editedBy ? edit.value : (im.summary && im.summary.dateTimeOriginal);
    if (!baseVal) continue;
    const parsed = parseExifDate(baseVal);
    if (!parsed) continue;
    const shifted = shiftDateTime(parsed, timeShift, sign);
    if (shifted) {
      store.setEdit(im.id, 'dateTimeOriginal', shifted);
    }
  }
}

function shiftDateTime(parsed, ts, sign) {
  const d = new Date(`${parsed.date}T${parsed.time}`);
  if (isNaN(d.getTime())) return null;
  if (ts.years) d.setFullYear(d.getFullYear() + sign * ts.years);
  if (ts.months) d.setMonth(d.getMonth() + sign * ts.months);
  if (ts.days) d.setDate(d.getDate() + sign * ts.days);
  if (ts.hours) d.setHours(d.getHours() + sign * ts.hours);
  if (ts.minutes) d.setMinutes(d.getMinutes() + sign * ts.minutes);
  if (ts.seconds) d.setSeconds(d.getSeconds() + sign * ts.seconds);
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())}`;
  const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `${dateStr} ${timeStr}`;
}
</script>

<style scoped>
.batch-editor {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border, #e4e6eb);
  border-radius: 10px;
  padding: 12px;
}
.batch-editor__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.batch-editor__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.batch-editor__count {
  font-size: 12px;
  color: var(--app-fg, #888);
}
.batch-editor__empty {
  padding: 16px 8px;
  text-align: center;
  color: var(--app-fg, #888);
  font-size: 14px;
}
.batch-editor__group {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--border, #e4e6eb);
}
.batch-editor__group:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}
.batch-editor__label {
  display: block;
  font-size: 12px;
  color: var(--app-fg, #666);
  margin-bottom: 4px;
}
.batch-editor__row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.batch-editor__input {
  flex: 1 1 80px;
  min-height: 36px;
  padding: 0 8px;
  border: 1px solid var(--border, #d0d4dc);
  border-radius: 6px;
  background: var(--card-bg, #fff);
  color: inherit;
  font-size: 14px;
}
.batch-editor__select {
  min-height: 36px;
  padding: 0 8px;
  border: 1px solid var(--border, #d0d4dc);
  border-radius: 6px;
  background: var(--card-bg, #fff);
  color: inherit;
}
.batch-editor__actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.batch-editor__btn {
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid var(--border, #d0d4dc);
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font-size: 13px;
  cursor: pointer;
}
.batch-editor__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.batch-editor__btn--primary {
  background: #2f6feb;
  border-color: #2f6feb;
  color: #fff;
}
.batch-editor__btn--primary:disabled {
  background: var(--border, #ccc);
  border-color: var(--border, #ccc);
  color: var(--app-fg, #888);
}
.batch-editor__time-shift .batch-editor__input {
  flex: 1 1 50px;
  min-width: 50px;
}
</style>
