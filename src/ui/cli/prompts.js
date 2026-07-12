// Interactive CLI prompts using @inquirer/prompts.
// NOTE: @inquirer/prompts is NOT installed by default. This module is loaded
// lazily (via dynamic import) only when an interactive subcommand is invoked,
// so non-interactive commands (read, batch, export with flags) work without it.

import { select, input, confirm, number } from '@inquirer/prompts';

// Prompt the user to select a preset from a list.
// presets: array of preset objects
// deps: { getPresetDisplayName, t } — used to render display names
// Returns the selected preset object, or null if the user cancels.
export async function promptPresetSelection(presets, { getPresetDisplayName, t } = {}) {
  if (!presets || presets.length === 0) {
    console.log('No presets available.');
    return null;
  }

  const choices = presets.map((p) => {
    const name = getPresetDisplayName ? getPresetDisplayName(p, t) : (p.name || p.id);
    const offset = p.offsetMeters != null ? ` (offset: ${p.offsetMeters}m)` : '';
    return {
      name: `${name}${offset}`,
      value: p,
    };
  });
  choices.push({ name: '(cancel)', value: null });

  return select({
    message: 'Select a preset:',
    choices,
  });
}

// Prompt the user to edit preset fields.
// existing: the current preset object (or {} for a new preset)
// Returns { name, lat, lng, offsetMeters }
export async function promptEditFields(existing = {}) {
  const name = await input({
    message: 'Preset name:',
    default: existing.name || '',
    validate: (v) => (v.trim() ? true : 'Name is required'),
  });

  const lat = await number({
    message: 'Latitude (-90 to 90):',
    default: existing.lat != null ? existing.lat : undefined,
    validate: (v) => (v >= -90 && v <= 90 ? true : 'Latitude must be between -90 and 90'),
  });

  const lng = await number({
    message: 'Longitude (-180 to 180):',
    default: existing.lng != null ? existing.lng : undefined,
    validate: (v) => (v >= -180 && v <= 180 ? true : 'Longitude must be between -180 and 180'),
  });

  const offsetMeters = await number({
    message: 'Random offset in meters (0-5000):',
    default: existing.offsetMeters != null ? existing.offsetMeters : 200,
    validate: (v) => (v >= 0 && v <= 5000 ? true : 'Offset must be between 0 and 5000'),
  });

  return { name: name.trim(), lat, lng, offsetMeters };
}

// Ask the user to confirm overwriting an existing file.
export async function confirmOverwrite(filename) {
  return confirm({
    message: `File "${filename}" already exists. Overwrite?`,
    default: true,
  });
}
