// scripts/capture.mjs — v2 Playwright screen-capture of the self-playing Selah demo.
// Produces 1080p .webm clips for the re-sequenced narrative:
//   run.webm      — the mechanism on the run (wall PHI4:13, peak ISA40:31)
//   ambient.webm  — the watch breathing dim, then the Psalm 23:4 ambient glow (opening ache)
//   who.webm      — a slow scroll of the "Not just athletes" section (human montage)
//   cooldown.webm — the cool-down glow + recap ("the words that carried you today")
//   lang.webm     — language switching over a live verse bloom
// Video only flushes to disk on context.close() — each clip gets its own context.
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
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.webm'));
  if (files.length) {
    const src = path.join(dir, files[0]);
    const dst = path.join(OUT, finalName);
    fs.renameSync(src, dst);
    console.log('  ->', finalName, (fs.statSync(dst).size / 1e6).toFixed(1) + ' MB');
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

// Block the auto-play loop and force a specific moment index of the run session,
// so we can capture a still, breathing ambient state.
const forceMoment = (idxToRender) => {
  // runs in the page realm; render()/WORKOUTS/stopAll are top-level script bindings
  try { window.loop = false; } catch (e) {}
  try { if (typeof stopAll === 'function') stopAll(); } catch (e) {}
  try { playing = true; } catch (e) {}            // block the delayed autoplay
  try { act = 'run'; } catch (e) {}
  try { ecgStart(); } catch (e) {}
  try { render(WORKOUTS.run[idxToRender], idxToRender); } catch (e) {}
};

const browser = await chromium.launch();

// ── Clip 1: full RUN loop (autoplay starts ~2.6s; steps @4.2s) + stills ──
{
  console.log('RUN loop + stills...');
  const { context, page, dir } = await newCtx(browser, 'run');
  const ss = async (name) =>
    page.screenshot({ path: path.join(OUT, 'stills', name + '.png') });
  await wait(1200);
  await ss('01-hero'); // breathing idle, before autoplay
  await wait(1400 + 460);
  await wait(11460 - 3060); await ss('02-warmup');
  await wait(4200); await ss('03-wall');   // breakthrough_wall bloom (PHI 4:13)
  await wait(4200); await ss('04-peak');   // peak_effort bloom (ISA 40:31)
  await wait(4200 * 3); await ss('05-cooldown');
  await wait(6000); await ss('06-recap');  // recap card after finish
  await wait(2000);
  await finishCtx(context, page, dir, 'run.webm');
}

// ── Clip 2: AMBIENT Psalm 23:4 glow (opening ache) ──
// Watch breathes dim/idle first, then the ambient steady_state whisper (PSA.23.4, teal).
{
  console.log('AMBIENT Psalm 23:4 glow...');
  const { context, page, dir } = await newCtx(browser, 'ambient');
  // block autoplay immediately so the watch just breathes in its idle "ready" state
  await page.evaluate(() => { try { playing = true; window.loop = false; } catch (e) {} });
  await wait(5000); // ~5s of quiet breathing idle
  // steady_state == run[1] -> PSA.23.4, "presence" theme, ambient whisper (wordless)
  await page.evaluate(() => {
    try { playing = true; act = 'run'; ecgStart(); render(WORKOUTS.run[1], 1); } catch (e) {}
  });
  await wait(9000); // hold on the Psalm 23:4 ambient glow
  await finishCtx(context, page, dir, 'ambient.webm');
}

// ── Clip 3: "Not just athletes" section — SLOW SCROLL for the human montage ──
{
  console.log('WHO section slow scroll...');
  const { context, page, dir } = await newCtx(browser, 'who');
  await page.evaluate(() => { try { playing = true; window.loop = false; } catch (e) {} });
  // find the top of the #who section
  const top = await page.evaluate(() => {
    const el = document.querySelector('#who');
    return el ? el.getBoundingClientRect().top + window.scrollY - 40 : 0;
  });
  const bottom = await page.evaluate(() => {
    const el = document.querySelector('#who');
    return el ? el.getBoundingClientRect().bottom + window.scrollY - window.innerHeight + 40 : 0;
  });
  await page.evaluate((y) => window.scrollTo(0, y), top);
  await wait(1500);
  const steps = 90;                 // smooth ~18s glide
  for (let i = 0; i <= steps; i++) {
    const y = top + ((bottom - top) * i) / steps;
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await wait(200);
  }
  await wait(1200);
  await finishCtx(context, page, dir, 'who.webm');
}

// ── Clip 4: COOL-DOWN glow + recap (close on grace) ──
{
  console.log('COOL-DOWN + recap...');
  const { context, page, dir } = await newCtx(browser, 'cooldown');
  await page.evaluate(() => { try { playing = true; window.loop = false; } catch (e) {} });
  await wait(600);
  // post_workout == run[8] -> 1CO.9.24, ambient cool-down glow (watch soft)
  await page.evaluate(() => {
    try {
      playing = true; act = 'run'; ecgStart();
      received = [
        { ref: 'PHI.4.13', name: 'Philippians 4:13' },
        { ref: 'ISA.40.31', name: 'Isaiah 40:31' },
        { ref: 'PSA.118.24', name: 'Psalm 118:24' },
      ];
      render(WORKOUTS.run[8], 8);
    } catch (e) {}
  });
  await wait(4500); // hold on the cool-down glow
  // then the recap card — "the words that carried you today"
  await page.evaluate(() => { try { finish(); } catch (e) {} });
  await wait(7000);
  await finishCtx(context, page, dir, 'cooldown.webm');
}

// ── Clip 5: LANGUAGE switching (tap chips during a live verse bloom) ──
{
  console.log('LANG switching...');
  const { context, page, dir } = await newCtx(browser, 'lang');
  await wait(11800); // let autoplay reach the first interrupt bloom (the wall)
  for (const l of ['es', 'sw', 'ko', 'pt', 'en']) {
    const chip = page.locator(`.chip[data-lang="${l}"]`).first();
    if (await chip.count()) { await chip.click().catch(() => {}); }
    await wait(2400);
  }
  await wait(2000);
  await finishCtx(context, page, dir, 'lang.webm');
}

// ── Clip 6: THE WHISPER — say a few words, the fitting verse is discerned (LIVE) ──
// The peak. Whisper "I'm scared" → Isaiah 41:10 blooms with real YouVersion text
// and the ● live badge lit. Uses the deployed proxy (real BSB + gloo-sim line).
{
  console.log('WHISPER moment (live)...');
  const { context, page, dir } = await newCtx(browser, 'whisper');
  await page.evaluate(() => { try { playing = true; window.loop = false; } catch (e) {} });
  await wait(2000); // let /health resolve so the live badge lights
  // establish a "wall" glow context (idx=3 → currentMoment=breakthrough_wall, whose
  // candidate set includes Isaiah 41:10), watch holds (dim), then whisper
  await page.evaluate(() => { try { act = 'run'; playing = true; idx = 3; ecgStart(); render(WORKOUTS.run[2], 2); } catch (e) {} });
  await wait(2200);
  await page.evaluate(() => { try { $('#face').style.opacity = '0.15'; } catch (e) {} }); // watch dims — listening
  await wait(1400);
  await page.evaluate(() => { try { discern("I'm scared"); } catch (e) {} });
  await wait(7000); // hold on the Isaiah 41:10 bloom + "you whispered" + ● live badge
  await finishCtx(context, page, dir, 'whisper.webm');
}

// ── Clip 7: LIVE badge close-up — a run bloom with the ● live · YouVersion badge ──
{
  console.log('LIVE badge close-up...');
  const { context, page, dir } = await newCtx(browser, 'live');
  await page.evaluate(() => { try { playing = true; window.loop = false; } catch (e) {} });
  await wait(2200); // /health → badge live
  await page.evaluate(() => { try { act = 'run'; ecgStart(); render(WORKOUTS.run[3], 3); } catch (e) {} }); // peak, ISA 40:31 real text streams in
  await wait(6500);
  await finishCtx(context, page, dir, 'live.webm');
}

await browser.close();
console.log('DONE -> capture/*.webm + capture/stills/*.png');
