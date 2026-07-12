// CLI command definitions and handlers.
// Each command is { name, description, arguments, options, handler(deps, args) }.
// The handler receives the deps object (injected by app/cli.js) and the raw
// argv tail (array of strings after the command name).

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { basename, dirname, extname, join } from 'path';
import { formatExifSummary, formatPresetList, formatProgress } from './formatter.js';

// --- Argument parsing helper ---
// Splits argv into positional args and --key value options.
function parseArgs(args) {
  const positional = [];
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        options[key] = next;
        i++;
      } else {
        options[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, options };
}

// --- File-like wrapper for Node.js ---
// readExif/writeExif expect a File-like object with:
//   { name, size, lastModified, type, arrayBuffer(): Promise<ArrayBuffer> }
function createFileLike(filePath) {
  const buffer = readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return {
    name: basename(filePath),
    size: buffer.length,
    lastModified: 0,
    type: /\.jpe?g$/i.test(filePath) ? 'image/jpeg' : '',
    arrayBuffer: () => Promise.resolve(arrayBuffer),
  };
}

// Build the default output path: {stem}_exif.{ext}
function defaultOutputPath(filePath) {
  const dir = dirname(filePath);
  const ext = extname(filePath) || '.jpg';
  const base = basename(filePath, ext);
  return join(dir, `${base}_exif${ext}`);
}

// Shift an EXIF date string by N days and N hours.
// Uses parseExifDate/dtToExif from deps for conversion.
function shiftDateTime(originalExifDate, shiftDays, shiftHours, parseExifDate, dtToExif) {
  const parsed = parseExifDate(originalExifDate);
  if (!parsed) return null;
  const dt = new Date(`${parsed.date}T${parsed.time}`);
  if (isNaN(dt.getTime())) return null;
  if (shiftDays) dt.setDate(dt.getDate() + shiftDays);
  if (shiftHours) dt.setHours(dt.getHours() + shiftHours);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  const h = String(dt.getHours()).padStart(2, '0');
  const min = String(dt.getMinutes()).padStart(2, '0');
  const sec = String(dt.getSeconds()).padStart(2, '0');
  return dtToExif(`${y}-${m}-${d}`, `${h}:${min}:${sec}`);
}

// Progress callback that writes to stderr (keeps stdout clean for piping).
function makeProgressCallback() {
  return ({ percent, name }) => {
    process.stderr.write(`\r${formatProgress(percent, name)}`.slice(0, 80).padEnd(80));
  };
}

// --- Command: read <file> ---
async function handleRead(deps, args) {
  const { positional } = parseArgs(args);
  if (positional.length === 0) {
    console.error('Error: file path required.');
    console.error('Usage: exif-editor read <file>');
    process.exit(1);
  }
  const filePath = positional[0];
  const file = createFileLike(filePath);
  const summary = await deps.readExif(file);
  const output = formatExifSummary(summary, {
    humanSize: deps.humanSize,
    formatExifDate: deps.formatExifDate,
    formatGps: deps.formatGps,
  });
  console.log(output);
}

// --- Command: edit <file> [options] ---
async function handleEdit(deps, args) {
  const { positional, options } = parseArgs(args);
  if (positional.length === 0) {
    console.error('Error: file path required.');
    console.error('Usage: exif-editor edit <file> [--date YYYY:MM:DD] [--time HH:MM:SS] [--lat N] [--lng E] [--make X] [--model Y] [--software Z] [--output out.jpg]');
    process.exit(1);
  }
  const filePath = positional[0];
  const file = createFileLike(filePath);

  // Build edits object from CLI options.
  const edits = {};

  // Date/time: if only one of date/time is provided, read original to fill the other.
  if (options.date || options.time) {
    let dateStr = options.date;
    let timeStr = options.time;
    if ((dateStr && !timeStr) || (!dateStr && timeStr)) {
      const summary = await deps.readExif(file);
      if (summary.dateTimeOriginal) {
        const parsed = deps.parseExifDate(summary.dateTimeOriginal);
        if (parsed) {
          if (!dateStr) dateStr = parsed.date;
          if (!timeStr) timeStr = parsed.time;
        }
      }
    }
    edits.dateTimeOriginal = { value: deps.dtToExif(dateStr, timeStr), editedBy: 'user' };
  }

  if (options.lat !== undefined) {
    edits.gpsLat = { value: parseFloat(options.lat), editedBy: 'user' };
  }
  if (options.lng !== undefined) {
    edits.gpsLng = { value: parseFloat(options.lng), editedBy: 'user' };
  }
  if (options.make !== undefined) {
    edits.make = { value: options.make, editedBy: 'user' };
  }
  if (options.model !== undefined) {
    edits.model = { value: options.model, editedBy: 'user' };
  }
  if (options.software !== undefined) {
    edits.software = { value: options.software, editedBy: 'user' };
  }

  const blob = await deps.writeExif(file, edits);
  const outputPath = options.output || defaultOutputPath(filePath);

  // Save result to disk.
  const buffer = Buffer.from(await blob.arrayBuffer());

  if (existsSync(outputPath) && !options.output) {
    // For auto-generated names, overwrite silently. For explicit --output, also overwrite.
  }
  writeFileSync(outputPath, buffer);
  console.log(`Saved: ${outputPath}`);
}

// --- Command: batch <files...> [options] ---
async function handleBatch(deps, args) {
  const { positional, options } = parseArgs(args);
  if (positional.length === 0) {
    console.error('Error: at least one file required.');
    console.error('Usage: exif-editor batch <files...> [--shift-days N] [--shift-hours N] [--lat N] [--lng E] [--output-dir ./edited]');
    process.exit(1);
  }

  // Configure output directory if specified.
  if (options['output-dir'] && typeof deps.setOutputDir === 'function') {
    deps.setOutputDir(options['output-dir']);
  }

  const files = positional.map(createFileLike);
  const store = deps.createImageStore();
  await store.addFiles(files);
  const images = store.images;

  // Apply time shift.
  const shiftDays = options['shift-days'] ? parseInt(options['shift-days'], 10) : 0;
  const shiftHours = options['shift-hours'] ? parseInt(options['shift-hours'], 10) : 0;
  if (shiftDays || shiftHours) {
    for (const img of images) {
      const original = img.summary.dateTimeOriginal;
      if (original) {
        const shifted = shiftDateTime(original, shiftDays, shiftHours, deps.parseExifDate, deps.dtToExif);
        if (shifted) {
          store.setEdit(img.id, 'dateTimeOriginal', shifted);
        }
      }
    }
  }

  // Apply GPS coordinates.
  if (options.lat !== undefined) {
    store.applyFieldValueToAll('gpsLat', parseFloat(options.lat));
  }
  if (options.lng !== undefined) {
    store.applyFieldValueToAll('gpsLng', parseFloat(options.lng));
  }

  // Export one-by-one.
  const onProgress = makeProgressCallback();
  const results = await deps.exportOneByOne(images, onProgress);
  process.stderr.write('\n');

  const saved = results.filter((r) => !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  console.log(`Processed: ${saved} saved, ${skipped} skipped`);
}

// --- Command: presets [list|add|delete|edit] ---
async function handlePresets(deps, args) {
  const { positional } = parseArgs(args);
  const subcommand = positional[0] || 'list';

  if (subcommand === 'list') {
    const presets = await deps.listPresets();
    const output = formatPresetList(presets, {
      getPresetDisplayName: deps.getPresetDisplayName,
      t: deps.t,
    });
    console.log(output);
    return;
  }

  // Interactive subcommands — load prompts.js lazily so @inquirer/prompts
  // is only required when actually needed.
  const { promptPresetSelection, promptEditFields } = await import('./prompts.js');
  const promptDeps = { getPresetDisplayName: deps.getPresetDisplayName, t: deps.t };

  if (subcommand === 'add') {
    const fields = await promptEditFields({});
    const preset = await deps.savePreset({
      name: fields.name,
      lat: fields.lat,
      lng: fields.lng,
      offsetMeters: fields.offsetMeters,
    });
    console.log(`Saved preset: ${deps.getPresetDisplayName(preset, deps.t)}`);
  } else if (subcommand === 'delete') {
    const presets = await deps.listPresets();
    const selected = await promptPresetSelection(presets, promptDeps);
    if (selected) {
      await deps.deletePreset(selected.id);
      console.log(`Deleted: ${deps.getPresetDisplayName(selected, deps.t)}`);
    }
  } else if (subcommand === 'edit') {
    const presets = await deps.listPresets();
    const selected = await promptPresetSelection(presets, promptDeps);
    if (selected) {
      const fields = await promptEditFields(selected);
      const updated = await deps.savePreset({
        ...selected,
        name: fields.name,
        lat: fields.lat,
        lng: fields.lng,
        offsetMeters: fields.offsetMeters,
      });
      console.log(`Updated: ${deps.getPresetDisplayName(updated, deps.t)}`);
    }
  } else {
    console.error(`Unknown presets subcommand: ${subcommand}`);
    console.error('Usage: exif-editor presets [list|add|delete|edit]');
    process.exit(1);
  }
}

// --- Command: export <files...> [options] ---
async function handleExport(deps, args) {
  const { positional, options } = parseArgs(args);
  if (positional.length === 0) {
    console.error('Error: at least one file required.');
    console.error('Usage: exif-editor export <files...> [--format zip|individual] [--output-dir ./] [--preset <id>]');
    process.exit(1);
  }

  // Configure output directory if specified.
  if (options['output-dir'] && typeof deps.setOutputDir === 'function') {
    deps.setOutputDir(options['output-dir']);
  }

  const format = options.format || 'individual';
  const files = positional.map(createFileLike);
  const store = deps.createImageStore();
  await store.addFiles(files);
  const images = store.images;

  // Apply a preset if specified (by id).
  if (options.preset) {
    const presets = await deps.listPresets();
    const preset = presets.find((p) => p.id === options.preset);
    if (!preset) {
      console.error(`Preset not found: ${options.preset}`);
      process.exit(1);
    }
    for (const img of images) {
      img.edits = deps.applyPresetToImage(preset, img.edits);
    }
  }

  const onProgress = makeProgressCallback();

  if (format === 'zip') {
    await deps.exportZip(images, onProgress);
    process.stderr.write('\n');
    console.log('Exported: edited_images.zip');
  } else if (format === 'individual') {
    const results = await deps.exportOneByOne(images, onProgress);
    process.stderr.write('\n');
    const saved = results.filter((r) => !r.skipped).length;
    const skipped = results.filter((r) => r.skipped).length;
    console.log(`Processed: ${saved} saved, ${skipped} skipped`);
  } else {
    console.error(`Unknown format: ${format}. Use 'zip' or 'individual'.`);
    process.exit(1);
  }
}

// --- Command table ---
export const commands = [
  {
    name: 'read',
    description: 'Read and display EXIF info from a JPEG file',
    arguments: '<file>',
    options: [],
    handler: handleRead,
  },
  {
    name: 'edit',
    description: 'Edit EXIF and save',
    arguments: '<file>',
    options: [
      '--date YYYY:MM:DD',
      '--time HH:MM:SS',
      '--lat N',
      '--lng E',
      '--make X',
      '--model Y',
      '--software Z',
      '--output out.jpg',
    ],
    handler: handleEdit,
  },
  {
    name: 'batch',
    description: 'Batch edit multiple files',
    arguments: '<files...>',
    options: [
      '--shift-days N',
      '--shift-hours N',
      '--lat N',
      '--lng E',
      '--output-dir ./edited',
    ],
    handler: handleBatch,
  },
  {
    name: 'presets',
    description: 'Manage presets (list|add|delete|edit)',
    arguments: '[subcommand]',
    options: [],
    handler: handlePresets,
  },
  {
    name: 'export',
    description: 'Export with EXIF modifications',
    arguments: '<files...>',
    options: [
      '--format zip|individual',
      '--output-dir ./',
      '--preset <id>',
    ],
    handler: handleExport,
  },
];
