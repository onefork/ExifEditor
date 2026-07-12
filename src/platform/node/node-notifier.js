export const nodeNotifier = {
  notify(title, body) {
    console.log(`[${title}] ${body}`);
  },

  showProgress(percent) {
    // Print progress to stderr so it doesn't interfere with stdout output
    process.stderr.write(`\rProgress: ${percent}%`);
  },

  cancelProgress() {
    process.stderr.write('\n');
  },
};
