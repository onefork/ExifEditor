// CLI output formatting helpers.
// These functions format EXIF data and presets for terminal display.

// Format a flash code into a human-readable string.
function formatFlash(flashCode) {
  if (flashCode == null) return null;
  // EXIF Flash field is a bitmask. Bit 0 (value 1) = flash fired.
  const fired = (flashCode & 1) === 1;
  if (flashCode === 0) return 'No flash';
  if (flashCode === 1) return 'Flash fired';
  if (fired) return `Flash fired (code: ${flashCode})`;
  return `No flash (code: ${flashCode})`;
}

// Format an EXIF summary into a readable terminal string table.
// deps: { humanSize, formatExifDate, formatGps }
export function formatExifSummary(summary, { humanSize, formatExifDate, formatGps } = {}) {
  if (!summary) return 'No data.';
  const lines = [];
  const labelWidth = 14;

  function row(label, value) {
    if (value == null || value === '' || value === false) return;
    lines.push(`${label.padEnd(labelWidth)} ${value}`);
  }

  row('File:', summary.fileName || '-');
  row('Size:', humanSize ? humanSize(summary.fileSize) : `${summary.fileSize || 0} B`);

  if (summary.width && summary.height) {
    row('Dimensions:', `${summary.width} x ${summary.height}`);
  }

  if (summary.dateTimeOriginal) {
    row('Date:', formatExifDate ? formatExifDate(summary.dateTimeOriginal) : summary.dateTimeOriginal);
  }

  if (summary.gpsLat != null && summary.gpsLng != null) {
    row('GPS:', formatGps ? formatGps(summary.gpsLat, summary.gpsLng) : `${summary.gpsLat}, ${summary.gpsLng}`);
  }

  row('Make:', summary.make);
  row('Model:', summary.model);
  row('Software:', summary.software);
  row('Exposure:', summary.exposureTime);
  row('F-Number:', summary.fNumber);
  row('ISO:', summary.isoSpeedRatings);
  row('Exp Bias:', summary.exposureBias);

  if (summary.focalLength != null) {
    row('Focal Length:', `${summary.focalLength} mm`);
  }
  if (summary.focalLengthIn35mmFilm != null) {
    row('Focal 35mm:', `${summary.focalLengthIn35mmFilm} mm`);
  }

  const flashStr = formatFlash(summary.flashCode);
  row('Flash:', flashStr);

  if (summary.orientation && summary.orientation !== 1) {
    row('Orientation:', summary.orientation);
  }

  if (summary.isJpeg === false) {
    row('Type:', 'Non-JPEG (EXIF not supported)');
  }

  if (summary.error) {
    row('Error:', summary.error);
  }

  return lines.join('\n');
}

// Format a list of presets for terminal display.
// deps: { getPresetDisplayName, t }
export function formatPresetList(presets, { getPresetDisplayName, t } = {}) {
  if (!presets || presets.length === 0) {
    const empty = t ? t('preset.empty') : null;
    return empty && empty !== 'preset.empty' ? empty : 'No presets found.';
  }
  const lines = [];
  presets.forEach((p, i) => {
    const name = getPresetDisplayName ? getPresetDisplayName(p, t) : (p.name || p.id);
    const offset = p.offsetMeters != null ? ` (offset: ${p.offsetMeters}m)` : '';
    lines.push(`${String(i + 1).padStart(2)}. ${name}${offset}`);
    lines.push(`    id: ${p.id}, lat: ${p.lat}, lng: ${p.lng}`);
  });
  return lines.join('\n');
}

// Format a progress bar string.
export function formatProgress(percent, name) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const filled = Math.floor(clamped / 5);
  const bar = '[' + '#'.repeat(filled).padEnd(20) + ']';
  return `${bar} ${clamped}%${name ? ' ' + name : ''}`;
}
