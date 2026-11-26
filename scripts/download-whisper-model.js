#!/usr/bin/env node
/**
 * Optional local helper: downloads ggml-tiny.en.bin for offline tooling / device tests.
 *
 * Production builds do **not** bundle this file. The app downloads the model on first
 * use of voice transcription (see services/voiceReport/whisperModelDownloader.ts).
 *
 * Size: ~74 MB. See services/voiceReport/MODEL.md.
 */
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'whisper');
const OUT_FILE = path.join(OUT_DIR, 'ggml-tiny.en.bin');
const HF_COMMIT = '5359861c739e955e79d9a303bcbc70fb988958b1';
const URL = `https://huggingface.co/ggerganov/whisper.cpp/resolve/${HF_COMMIT}/ggml-tiny.en.bin`;
const EXPECTED_SHA256 = '921e4cf8686fdd993dcd081a5da5b6c365bfde1162e72b08d75ac75289920b1f';
const EXPECTED_BYTES = 77_704_715;

fs.mkdirSync(OUT_DIR, { recursive: true });

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

if (fs.existsSync(OUT_FILE) && fs.statSync(OUT_FILE).size === EXPECTED_BYTES) {
  const digest = sha256File(OUT_FILE);
  if (digest === EXPECTED_SHA256) {
    console.log(`Whisper model already present (${(EXPECTED_BYTES / 1e6).toFixed(1)} MB, checksum OK)`);
    process.exit(0);
  }
  console.warn('Existing file failed checksum — re-downloading…');
}

console.log('Downloading ggml-tiny.en.bin (optional local copy; not bundled in production)…');

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
        const hash = crypto.createHash('sha256');
        res.on('data', (chunk) => hash.update(chunk));
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            const digest = hash.digest('hex');
            if (digest !== EXPECTED_SHA256) {
              fs.unlinkSync(tmp);
              reject(new Error(`SHA-256 mismatch: got ${digest}`));
              return;
            }
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
    console.log('Note: production apps download this on first voice use; do not require() it into the bundle.');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
