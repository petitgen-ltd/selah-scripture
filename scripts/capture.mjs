// scripts/capture.mjs — Playwright screen-capture of the self-playing Selah demo.
// Produces 1080p .webm clips (run loop, lift, hiit, language switching) + high-res stills.
// Video only flushes to disk on context.close() — that's why each clip gets its own context.
//
//   run:  node scripts/capture.mjs
//   (server must be up: cd app && python3 -m http.server 8099)
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const URL = process.env.SELAH_URL || 'http://localhost:8099/index.html';
const OUT = path.resolve('capture');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, 'stills'), { recursive: true });

const VIEW = { width: 1920, height: 1080 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function newCtx(browser, name) {
  const dir = path.join(OUT, name);
  fs.mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({
    viewport: VIEW,
    deviceScaleFactor: 1, // recordVideo captures at viewport res; keep 1:1 => true 1080p
    recordVideo: { dir, size: VIEW },
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  return { context, page, dir };
}

async function finishCtx(context, page, dir, finalName) {
  await context.close(); // flush webm
  // rename the single webm to a predictable filename
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.webm'));
  if (files.length) {
    const src = path.join(dir, files[0]);
    const dst = path.join(OUT, finalName);
    fs.renameSync(src, dst);
    console.log('  ->', finalName, (fs.statSync(dst).size / 1e6).toFixed(1) + ' MB');
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

const browser = await chromium.launch();

// ── Clip 1: full RUN loop (autoplay starts ~2.6s; 9 steps @ 4.2s + recap ≈ 41s) ──
// Also grab high-res stills of the key beats while this clip records.
{
  console.log('RUN loop + stills...');
  const { context, page, dir } = await newCtx(browser, 'run');
  const ss = async (name) =>
    page.screenshot({ path: path.join(OUT, 'stills', name + '.png') });
  await wait(1200);
  await ss('01-hero'); // hero, before autoplay
  await wait(1400 + 460); // autoplay @2.6s -> first render
  // step render times ≈ 2600 + 460 + i*4200
  await wait(11460 - 3060); await ss('02-warmup');
  await wait(4200); await ss('03-wall');   // breakthrough_wall bloom (PHI 4:13)
  await wait(4200); await ss('04-peak');   // peak_effort bloom (ISA 40:31)
  await wait(4200 * 3); await ss('05-cooldown');
  await wait(6000); await ss('06-recap');  // recap card after finish
  await wait(2000);
  await finishCtx(context, page, dir, 'run.webm');
}

// ── Clip 2: LIFT activity ──
{
  console.log('LIFT...');
  const { context, page, dir } = await newCtx(browser, 'lift');
  await wait(1200);
  await page.click('button[data-act="lift"]');
  await wait(30000); // lift = 9 steps @4.2s ≈ 34s; grab ~30s
  await finishCtx(context, page, dir, 'lift.webm');
}

// ── Clip 3: HIIT activity ──
{
  console.log('HIIT...');
  const { context, page, dir } = await newCtx(browser, 'hiit');
  await wait(1200);
  await page.click('button[data-act="hiit"]');
  await wait(28000);
  await finishCtx(context, page, dir, 'hiit.webm');
}

// ── Clip 4: LANGUAGE switching (tap chips during a live verse bloom) ──
{
  console.log('LANG switching...');
  const { context, page, dir } = await newCtx(browser, 'lang');
  // wait for autoplay to reach the first interrupt bloom (~the wall), then cycle langs
  await wait(11800);
  for (const l of ['es', 'sw', 'ko', 'pt', 'en']) {
    const chip = page.locator(`.chip[data-lang="${l}"]`).first();
    if (await chip.count()) { await chip.click().catch(() => {}); }
    await wait(2400);
  }
  await wait(2000);
  await finishCtx(context, page, dir, 'lang.webm');
}

await browser.close();
console.log('DONE -> capture/*.webm + capture/stills/*.png');
