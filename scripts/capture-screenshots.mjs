#!/usr/bin/env node
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCREENSHOTS_DIR = join(__dirname, '..', 'docs', 'ipad-screenshots');

const SIZES = [
  { name: 'ipad-12.9-portrait', width: 1024, height: 1366 },
  { name: 'ipad-11-portrait', width: 834, height: 1194 },
  { name: 'ipad-12.9-landscape', width: 1366, height: 1024 },
  { name: 'ipad-11-landscape', width: 1194, height: 834 },
  { name: 'iphone', width: 393, height: 852 },
];

const SCREENS = [
  { name: 'paywall', path: '/paywall', desc: 'Paywall' },
  { name: 'onboarding', path: '/', desc: 'App entry point' },
];

const COLOR_MODES = ['light', 'dark'];

async function setupSampleData(page) {
  // Seed minimal sample data via AsyncStorage/localStorage
  await page.evaluate(() => {
    const sampleJob = {
      id: 'JOB1',
      title: 'Kitchen Refit',
      customerName: 'John Smith',
      address: '123 Main St',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    
    const sampleDoc = {
      id: 'DOC1',
      jobId: 'JOB1',
      kind: 'quote',
      number: 'QUO-0022',
      status: 'draft',
      totalPence: 450000,
      createdAt: new Date().toISOString(),
    };
    
    localStorage.setItem('tradesreport.sampleJob', JSON.stringify(sampleJob));
    localStorage.setItem('tradesreport.sampleDoc', JSON.stringify(sampleDoc));
  });
}

async function captureScreenshot(page, screen, size, colorMode) {
  const filename = `${screen.name}__${size.name}__${colorMode}.png`;
  const path = join(SCREENSHOTS_DIR, filename);
  
  console.log(`Capturing: ${filename}`);
  
  await page.setViewportSize({ width: size.width, height: size.height });
  
  // Set color scheme
  await page.emulateMedia({ colorScheme: colorMode });
  
  // Navigate to the screen
  try {
    await page.goto(`http://localhost:8081${screen.path}`, { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });
  } catch (err) {
    console.warn(`Warning: Could not load ${screen.path}, skipping`);
    return false;
  }
  
  // Wait a bit for animations
  await page.waitForTimeout(1000);
  
  // Take screenshot
  await page.screenshot({ path, fullPage: false });
  
  return true;
}

async function main() {
  console.log('Starting screenshot capture...');
  console.log(`Screenshots will be saved to: ${SCREENSHOTS_DIR}`);
  console.log('');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Wait for Expo web to be ready
  console.log('Waiting for Expo web server...');
  let retries = 0;
  while (retries < 30) {
    try {
      await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 5000 });
      break;
    } catch {
      retries++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  if (retries >= 30) {
    console.error('ERROR: Could not connect to Expo web server at http://localhost:8081');
    console.error('Please start the server with: npx expo start --web');
    await browser.close();
    process.exit(1);
  }
  
  console.log('Connected to Expo web!');
  console.log('');
  
  // Setup sample data
  await setupSampleData(page);
  
  let captured = 0;
  let skipped = 0;
  
  // Capture screenshots for each combination
  for (const colorMode of COLOR_MODES) {
    for (const size of SIZES) {
      for (const screen of SCREENS) {
        const success = await captureScreenshot(page, screen, size, colorMode);
        if (success) {
          captured++;
        } else {
          skipped++;
        }
      }
    }
  }
  
  await browser.close();
  
  console.log('');
  console.log('='.repeat(60));
  console.log(`Screenshot capture complete!`);
  console.log(`  Captured: ${captured}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Location: ${SCREENSHOTS_DIR}`);
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
