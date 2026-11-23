#!/usr/bin/env node
/**
 * Downloads the bundled Whisper `tiny.en` GGML model into assets/whisper/.
 * Required before a native release build so transcription works offline
 * without a first-run model download.
 *
 * Size: ~75 MB. See services/voiceReport/MODEL.md.
 */
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'whisper');
const OUT_FILE = path.join(OUT_DIR, 'ggml-tiny.en.bin');
const URL =
  'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin';

fs.mkdirSync(OUT_DIR, { recursive: true });

if (fs.existsSync(OUT_FILE) && fs.statSync(OUT_FILE).size > 1_000_000) {
  console.log(`Whisper model already present (${(fs.statSync(OUT_FILE).size / 1e6).toFixed(1)} MB)`);
  process.exit(0);
}

console.log('Downloading ggml-tiny.en.bin…');

function follow(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (redirects > 5) {
            reject(new Error('Too many redirects'));
            return;
          }
          res.resume();
          resolve(follow(res.headers.location, redirects + 1));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const tmp = `${OUT_FILE}.partial`;
        const file = fs.createWriteStream(tmp);
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            fs.renameSync(tmp, OUT_FILE);
            resolve();
          });
        });
      })
      .on('error', reject);
  });
}

follow(URL)
  .then(() => {
    console.log(`Saved ${(fs.statSync(OUT_FILE).size / 1e6).toFixed(1)} MB → ${OUT_FILE}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
