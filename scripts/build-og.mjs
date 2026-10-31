// Share images (Open Graph): a 1200x630 JPEG of each page in its shareable moment, saved to public/og/<id>.jpg.
// Serves `dist/` with `astro preview`, opens each page in a headless Chromium (software WebGL, like the smoke test), puts the
// maquette in its moment, hides the page chrome and lays the monument name and "Civitas" over it, in the face and accent of the city.
//
// Usage: npm run build && npm run og && npm run build   (the second build copies the new JPEGs into dist/)
// The cities come from the folders of src/cities/; each one needs its moment in MOMENTS (without it, the first screen of the page).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'og');
const port = 4399;
const base = `http://localhost:${port}`;
const GL_ARGS = ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'];
const SIZE = { width: 1200, height: 630 };

/** The shareable moment of each monument: the chapter of the story (0 = start) and, in the Explore chapter, the view of the maquette. */
const MOMENTS = {
  athens: { chapter: 6, view: 'painted' }, // Explore, Painted
  rome: { chapter: 3 }, // AD 80, the games
  paris: { chapter: 6, view: 'sparkle' }, // Explore, Sparkle (forced)
};
const HOME = { name: 'Civitas', kicker: 'The world’s monuments', display: "'Fraunces', Georgia, serif", weight: 600, accent: '#e8a33d', atTop: true };

function findChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM) return process.env.PLAYWRIGHT_CHROMIUM;
  const dir = join(process.env.LOCALAPPDATA ?? '', 'ms-playwright');
  if (!existsSync(dir)) return undefined;
  const folder = readdirSync(dir).filter((name) => name.startsWith('chromium-')).sort().pop();
  const candidate = folder && join(dir, folder, 'chrome-win64', 'chrome.exe');
  return candidate && existsSync(candidate) ? candidate : undefined;
}

async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((done) => setTimeout(done, 300));
  }
  throw new Error(`Server did not answer at ${url}`);
}

const cityIds = () =>
  readdirSync(join(root, 'src', 'cities'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(root, 'src', 'cities', entry.name, 'meta.ts')))
    .map((entry) => entry.name);

const engineReady = (page) => page.waitForFunction(() => window.__civitas?.info().activeStage, undefined, { timeout: 90000 });

/** Waits until nothing moves: the camera stays put and no frame is drawn for a while. */
async function untilStill(page, { frames = true } = {}) {
  let last = '';
  let still = 0;
  for (let i = 0; i < 120 && still < 4; i += 1) {
    await page.waitForTimeout(400);
    const now = await page.evaluate(({ withFrames }) => {
      const { engine } = window.__civitas;
      const camera = engine.manager.active.camera.position;
      return [camera.x, camera.y, camera.z, withFrames ? engine.framesRendered : 0].map((n) => n.toFixed(3)).join(',');
    }, { withFrames: frames });
    still = now === last ? still + 1 : 0;
    last = now;
  }
}

/** Hides the page chrome and puts the title over the maquette. */
async function dress(page, { name, kicker, display, weight, accent, fontStyle, atTop = false }) {
  await page.evaluate(({ name, kicker, display, weight, accent, fontStyle, atTop }) => {
    const style = document.createElement('style');
    style.textContent = `
      html { scrollbar-width: none; }
      .the-stage__content, .the-stage__story, .the-stage__nav { visibility: hidden !important; }
      .og-frame { position: fixed; inset: 0; z-index: 50; display: flex; flex-direction: column; justify-content: flex-end;
        padding: 0 72px 64px; pointer-events: none;
        background: linear-gradient(90deg, rgba(8, 8, 12, 0.78) 0%, rgba(8, 8, 12, 0.5) 38%, rgba(8, 8, 12, 0) 66%); }
      .og-frame--top { justify-content: flex-start; padding: 64px 72px 0; background: none; }
      .og-frame--top .og-frame__kicker { order: 2; margin: 14px 0 0; }
      .og-frame__kicker { margin: 0 0 14px; font: 500 22px/1 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.32em;
        text-transform: uppercase; color: ${accent}; }
      .og-frame__name { margin: 0; max-width: 560px; font-family: ${display}; font-weight: ${weight}; font-style: ${fontStyle};
        font-size: 88px; line-height: 1.02; color: #ede7da; text-wrap: balance; }`;
    document.head.append(style);
    const frame = document.createElement('div');
    frame.className = atTop ? 'og-frame og-frame--top' : 'og-frame';
    frame.innerHTML = `<p class="og-frame__kicker"></p><p class="og-frame__name"></p>`;
    frame.querySelector('.og-frame__kicker').textContent = kicker;
    frame.querySelector('.og-frame__name').textContent = name;
    (document.querySelector('main') ?? document.body).append(frame);
  }, { name, kicker, display, weight, accent, fontStyle, atTop });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
}

async function shoot(page, id, file) {
  mkdirSync(outDir, { recursive: true });
  await page.screenshot({ path: file, type: 'jpeg', quality: 82 });
  console.log(`ok   ${id} -> public/og/${id}.jpg`);
}

async function shootCity(browser, id) {
  const context = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`${base}/${id}?quality=high`);
  await engineReady(page);
  await page.waitForFunction(() => window.__civitas.state().kind === 'monument', undefined, { timeout: 90000 });
  const moment = MOMENTS[id];
  if (!moment) console.warn(`warn ${id}: no moment in MOMENTS, using the first screen`);
  await page.evaluate(({ chapter, view }) => {
    const { engine } = window.__civitas;
    engine.setStory(chapter, 1);
    if (view) engine.setExplore(view, null);
  }, { chapter: moment?.chapter ?? 0, view: moment?.view ?? null });
  // The sparkle never stops flashing, so for it only the camera is awaited.
  await untilStill(page, { frames: moment?.view !== 'sparkle' });
  const look = await page.evaluate(() => {
    const main = document.querySelector('main');
    const style = getComputedStyle(main);
    const [, monument] = (document.querySelector('.the-stage__title')?.textContent ?? '').split(' · ');
    return {
      monument,
      display: style.getPropertyValue('--city-display').trim(),
      weight: style.getPropertyValue('--city-display-weight').trim() || '400',
      fontStyle: style.getPropertyValue('--city-display-style').trim() || 'normal',
      accent: style.getPropertyValue('--city-accent-strong').trim(),
    };
  });
  await dress(page, { ...look, name: look.monument, kicker: 'Civitas' });
  await shoot(page, id, join(outDir, `${id}.jpg`));
  await context.close();
}

async function shootHome(browser) {
  const context = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`${base}/?quality=high&ambientIdle=1`);
  await engineReady(page);
  await untilStill(page);
  await dress(page, { ...HOME, fontStyle: 'normal', kicker: HOME.kicker });
  await shoot(page, 'home', join(outDir, 'home.jpg'));
  await context.close();
}

async function main() {
  if (!existsSync(join(root, 'dist', 'index.html'))) throw new Error('No dist/ yet: run `npm run build` first.');
  const executablePath = findChromium();
  if (!executablePath) throw new Error('Playwright Chromium not found. Install it with: npx playwright-core install chromium');
  const server = spawn('npx', ['astro', 'preview', '--port', String(port)], { cwd: root, shell: true, stdio: 'ignore' });
  const browser = await chromium.launch({ executablePath, args: GL_ARGS });
  try {
    await waitForServer(`${base}/`);
    await shootHome(browser);
    for (const id of cityIds()) await shootCity(browser, id);
  } finally {
    await browser.close();
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    else server.kill();
  }
}

main().catch((error) => {
  console.error(error.stack ?? error);
  process.exit(1);
});
