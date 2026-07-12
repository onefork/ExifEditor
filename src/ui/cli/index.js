// Main CLI runner — parses process.argv, routes to the appropriate command,
// and calls core functions with the injected deps.

import { commands } from './commands.js';

export async function runCli(deps) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printHelp();
    return;
  }

  // Handle --help / -h at the top level.
  if (args[0] === '--help' || args[0] === '-h') {
    printHelp();
    return;
  }

  const [cmdName, ...rest] = args;
  const cmd = commands.find((c) => c.name === cmdName);

  if (!cmd) {
    console.error(`Unknown command: ${cmdName}`);
    console.error('');
    printHelp();
    process.exit(1);
  }

  await cmd.handler(deps, rest);
}

function printHelp() {
  console.log('Usage: exif-editor <command> [options]');
  console.log('');
  console.log('Commands:');
  commands.forEach((c) => {
    const cmd = c.arguments ? `${c.name} ${c.arguments}` : c.name;
    console.log(`  ${cmd.padEnd(28)} ${c.description}`);
  });
  console.log('');
  console.log('Options:');
  console.log('  --help, -h                   Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  exif-editor read photo.jpg');
  console.log('  exif-editor edit photo.jpg --date 2024:01:01 --time 12:00:00 --output out.jpg');
  console.log('  exif-editor batch *.jpg --shift-hours 2 --output-dir ./edited');
  console.log('  exif-editor presets list');
  console.log('  exif-editor export *.jpg --format zip --output-dir ./out');
}
