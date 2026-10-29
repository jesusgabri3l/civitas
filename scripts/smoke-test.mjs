// Headless smoke test (no interactive browser): serves `dist/` with `astro preview`, opens it in a Playwright
// Chromium with software WebGL (SwiftShader) and checks the app shell end to end.
//
// Usage: npm run build && npm run smoke
// Limit: SwiftShader runs on CPU. It validates behavior and memory bookkeeping, NOT real fps or GPU load.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = 4398;
const base = `http://localhost:${port}`;
const GL_ARGS = ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'];
const shots = join(root, '.smoke');
// ambientIdle=1: the globe's ambient animation (stars, auto-rotation) pauses after 1 s, so `idle()` can wait for it.
const QUICK = 'quality=medium&ambientIdle=1';
const problems = [];

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

const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && detail ? ` -> ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

function watch(page) {
  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error') problems.push(`console.error: ${text}`);
    // SwiftShader lacks KHR_parallel_shader_compile; three falls back to polling, so that warning is expected here.
    if (message.type() === 'warning' && /THREE\./.test(text) && !/KHR_parallel_shader_compile/.test(text)) problems.push(`three warning: ${text}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => problems.push(`failed request: ${request.url()}`));
  page.on('response', (response) => {
    if (response.status() >= 400) problems.push(`HTTP ${response.status()}: ${response.url()}`);
  });
}

const info = (page) => page.evaluate(() => window.__worldhub.info());
const appState = (page) => page.evaluate(() => window.__worldhub.state());
const ready = (page) =>
  page.waitForFunction(() => window.__worldhub?.info().activeStage, undefined, { timeout: 60000 });
const settled = (page, kind, city) =>
  page.waitForFunction(
    ([k, c]) => {
      const state = window.__worldhub.state();
      return state.kind === k && (c === undefined || state.city === c) && window.__worldhub.info().activeStage === (c ?? 'globe');
    },
    [kind, city],
    { timeout: 60000 },
  );
const idle = async (page) => {
  let last = -1;
  for (let i = 0; i < 40; i += 1) {
    const { frames } = await info(page);
    if (frames === last) return frames;
    last = frames;
    await page.waitForTimeout(250);
  }
  throw new Error('Engine never went idle');
};
// The nav is out of sight (visually hidden) until a keyboard user reaches it: so use the keyboard, like they do.
const click = async (page, name) => {
  await page.locator('.the-stage__nav').getByRole('link', { name, exact: true }).focus();
  await page.keyboard.press('Enter');
};

const hotspot = (page, city) => page.locator(`[data-hotspot="${city}"]`);
// The tooltip root is a 0x0 anchor: its label is the visible part.
const tooltip = (page, city) => page.locator(`${city ? `[data-tooltip="${city}"]` : '[data-tooltip]'} .the-overlay-tooltip__label`);
const tooltipRoot = (page, city) => page.locator(`[data-tooltip="${city}"]`);
const isVisuallyHidden = async (locator) => {
  const box = await locator.boundingBox();
  return !box || (box.width <= 1 && box.height <= 1);
};
const cameraOf = (page) => page.evaluate(() => {
  const { position } = window.__worldhub.engine.manager.active.camera;
  return { x: position.x, y: position.y, z: position.z };
});
const coordinatesOf = (page) => page.locator('[data-coordinates]').innerText();
const cursorOf = (page) => page.evaluate(() => getComputedStyle(document.querySelector('[data-stage-canvas]')).cursor);
const centerOf = async (locator) => {
  const box = await locator.boundingBox();
  return box && { x: box.x + box.width / 2, y: box.y + box.height / 2, width: box.width, height: box.height };
};
const stageStatus = async (page, city) => (await info(page)).stages[city];
const hotspotsReady = async (page) => {
  for (const city of ['athens', 'rome', 'paris']) await hotspot(page, city).waitFor({ state: 'visible', timeout: 20000 });
};

/** Pairwise distance between hotspot centers must be at least a touch target. */
async function checkHotspotSeparation(page, label) {
  const points = {};
  for (const city of ['athens', 'rome', 'paris']) points[city] = await centerOf(hotspot(page, city));
  const ids = Object.keys(points);
  let min = Infinity;
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) min = Math.min(min, Math.hypot(points[ids[i]].x - points[ids[j]].x, points[ids[i]].y - points[ids[j]].y));
  }
  const size = Math.min(...ids.map((id) => Math.min(points[id].width, points[id].height)));
  check(min >= 44, `${label}: hotspots at least 44px apart (min ${min.toFixed(0)}px)`);
  check(size >= 44, `${label}: hotspot tap target is at least 44px (${size.toFixed(0)}px)`);
}

async function globeChecks(page) {
  await idle(page);
  await hotspotsReady(page);
  await checkHotspotSeparation(page, 'desktop');
  check((await stageStatus(page, 'rome')) === 'idle', 'city stages are not loaded before any interest');

  // "Atlas de noche" layout: brand, live coordinates and a usage hint; no visible city list or nav.
  check((await page.locator('.the-overlay-brand').innerText()).trim() === 'WorldHub', 'brand shows WorldHub');
  check(/^\d+\.\d°[NS] \d+\.\d°[EW]$/.test(await coordinatesOf(page)), 'coordinates readout is formatted like 43.0°N 13.0°E', await coordinatesOf(page));
  check((await page.locator('[data-hint]').textContent()).trim() === 'Drag · Scroll to zoom', 'hint reads "Drag · Scroll to zoom" on desktop');
  check(await isVisuallyHidden(page.locator('.the-overlay-cities')), 'city list is visually hidden');
  check(await isVisuallyHidden(page.locator('.the-stage__nav')), 'nav is visually hidden');
  check(
    await page.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.check('italic 16px Fraunces') && document.fonts.check('12px "JetBrains Mono"');
    }),
    'Fraunces italic and JetBrains Mono are loaded (self-hosted)',
  );
  check((await cursorOf(page)) === 'grab', 'cursor is grab at rest', await cursorOf(page));

  // Hover opens the tooltip anchored to the hotspot and warms that city (load + warm), nothing else.
  await hotspot(page, 'rome').hover();
  await tooltip(page).first().waitFor({ timeout: 5000 });
  const label = tooltip(page, 'rome');
  const labelText = await label.textContent();
  check(/Rome/.test(labelText) && /ITALY/i.test(labelText) && /\d\d:\d\d/.test(labelText) && /Colosseum/.test(labelText) && /Visit/.test(labelText), 'tooltip shows name, country, local time, glimpse and Visit', labelText);
  check((await page.locator('.the-overlay-card').count()) === 0, 'the side card is gone');
  await page.waitForTimeout(450);
  const others = await hotspot(page, 'paris').evaluate((el) => Number(getComputedStyle(el).opacity));
  check(others < 0.6, 'hovering a hotspot dims the others', String(others));
  await page.waitForFunction(() => window.__worldhub.info().stages.rome === 'warm', undefined, { timeout: 30000 });
  check(true, 'opening the tooltip preloads (warms) that city stage');
  check((await stageStatus(page, 'paris')) === 'idle', 'only the opened city is preloaded');

  // The camera leans towards the pointer (sky parallax).
  await page.mouse.move(980, 60);
  await page.waitForTimeout(900);
  check(Math.abs((await cameraOf(page)).x) > 0.05, 'moving the pointer leans the camera (parallax)', JSON.stringify(await cameraOf(page)));
  await idle(page);

  // Flip by quadrant: the label opens towards the middle of the screen.
  const viewport = page.viewportSize();
  for (const city of ['athens', 'rome', 'paris']) {
    await hotspot(page, city).hover();
    await tooltip(page, city).waitFor({ timeout: 5000 });
    const at = await centerOf(hotspot(page, city));
    const expected = `${at.x / viewport.width < 0.5 ? 'right' : 'left'}-${at.y / viewport.height < 0.5 ? 'down' : 'up'}`;
    check((await tooltipRoot(page, city).getAttribute('data-placement')) === expected, `${city}: tooltip placement follows its quadrant (${expected})`);
  }

  // Visit goes through the router: no reload.
  await hotspot(page, 'rome').hover();
  await label.waitFor({ timeout: 5000 });
  await label.click();
  await settled(page, 'monument', 'rome');
  check(new URL(page.url()).pathname === '/rome', 'Visit navigates to /rome');
  check((await page.evaluate(() => window.__marker)) === 'same-document', 'Visit does not reload the page');
  check((await tooltip(page).count()) === 0, 'tooltip is gone once visiting');
  await page.goBack();
  await settled(page, 'globe');
  await idle(page);
  await hotspotsReady(page);
  check((await tooltip(page).count()) === 0, 'tooltip does not come back after Back');

  // Escape closes a pinned tooltip.
  await hotspot(page, 'paris').click();
  await tooltip(page, 'paris').waitFor({ timeout: 5000 });
  await page.keyboard.press('Escape');
  await tooltip(page, 'paris').waitFor({ state: 'detached', timeout: 5000 });
  check(true, 'Escape closes the tooltip');

  // Accessible list: reachable by keyboard, shows the tooltip and warms on focus, navigates without reload.
  const link = page.locator('.the-overlay-cities').getByRole('link', { name: /Athens/ });
  await link.focus();
  await tooltip(page, 'athens').waitFor({ timeout: 5000 });
  check(true, 'focusing a list item shows its tooltip on the globe');
  await page.waitForFunction(() => ['warm', 'active'].includes(window.__worldhub.info().stages.athens), undefined, { timeout: 30000 });
  check(true, 'focusing a list item preloads its city');
  await page.keyboard.press('Tab');
  await tooltip(page, 'athens').waitFor({ state: 'detached', timeout: 5000 });
  check(true, 'moving focus away closes the tooltip');
  await link.focus();
  await page.keyboard.press('Enter');
  await settled(page, 'monument', 'athens');
  check(new URL(page.url()).pathname === '/athens', 'list link navigates (keyboard)');
  check((await page.evaluate(() => window.__marker)) === 'same-document', 'list navigation does not reload');
  await page.goBack();
  await settled(page, 'globe');
  await idle(page);
  await hotspotsReady(page);

  // Drag rotates the globe (cursor grabbing), the readout follows, inertia ends and rendering goes idle again.
  const before = await centerOf(hotspot(page, 'rome'));
  const coordinatesBefore = await coordinatesOf(page);
  await page.mouse.move(300, 260);
  await page.mouse.down();
  check((await cursorOf(page)) === 'grabbing', 'cursor is grabbing while dragging', await cursorOf(page));
  await page.mouse.move(180, 260, { steps: 6 });
  await page.mouse.up();
  await idle(page);
  const after = await centerOf(hotspot(page, 'rome'));
  check(!after || Math.abs(after.x - before.x) > 20 || !(await hotspot(page, 'rome').isVisible()), 'dragging rotates the globe', JSON.stringify({ before, after }));
  check((await coordinatesOf(page)) !== coordinatesBefore, 'coordinates follow the view', `${coordinatesBefore} -> ${await coordinatesOf(page)}`);
  check((await cursorOf(page)) === 'grab', 'cursor goes back to grab');
  check((await page.locator('[data-hint]').count()) === 0, 'the hint disappears after the first interaction');
  const afterDragFrames = (await info(page)).frames;
  await page.waitForTimeout(500);
  check((await info(page)).frames === afterDragFrames, 'globe goes idle after the drag and inertia');

  // Zoom with the wheel: eased, and clamped at both ends.
  await page.mouse.move(500, 320);
  const startDistance = (await info(page)).cameraDistance;
  for (let i = 0; i < 40; i += 1) await page.mouse.wheel(0, -120);
  await idle(page);
  const closest = (await info(page)).cameraDistance;
  for (let i = 0; i < 20; i += 1) await page.mouse.wheel(0, -120);
  await idle(page);
  check(closest < startDistance - 0.5 && closest > 1.3, `wheel zooms in within limits (${startDistance.toFixed(2)} -> ${closest.toFixed(2)})`);
  check(Math.abs((await info(page)).cameraDistance - closest) < 1e-3, 'zoom in stops at its limit');
  for (let i = 0; i < 120; i += 1) await page.mouse.wheel(0, 120);
  await idle(page);
  const farthest = (await info(page)).cameraDistance;
  for (let i = 0; i < 20; i += 1) await page.mouse.wheel(0, 120);
  await idle(page);
  check(farthest > startDistance + 0.5 && farthest < 12, `wheel zooms out within limits (${farthest.toFixed(2)})`);
  check(Math.abs((await info(page)).cameraDistance - farthest) < 1e-3, 'zoom out stops at its limit');

  // Back to Europe (the intro replays on the next activation), then 10 rounds of tooltips: no GPU growth.
  await page.goto(`${base}/?${QUICK}`);
  await ready(page);
  await page.evaluate(() => { window.__marker = 'same-document'; });
  await idle(page);
  await hotspotsReady(page);
  await uploadShootingStar(page);
  const base0 = (await info(page)).memory;
  for (let i = 0; i < 10; i += 1) {
    for (const city of ['athens', 'rome', 'paris']) {
      await hotspot(page, city).click();
      await tooltip(page, city).waitFor({ timeout: 5000 });
    }
    await page.keyboard.press('Escape');
  }
  await page.waitForFunction(() => Object.values(window.__worldhub.info().stages).every((status) => status !== 'loading'), undefined, { timeout: 30000 });
  await idle(page);
  await page.evaluate(() => window.__worldhub.engine.manager.sleepInactive());
  await page.waitForTimeout(100);
  const after0 = (await info(page)).memory;
  check(after0.geometries === base0.geometries && after0.textures === base0.textures, 'no GPU growth after 30 tooltip openings', `base=${JSON.stringify(base0)} now=${JSON.stringify(after0)}`);
}

/**
 * The shooting star hides itself until its first launch (20 to 30 s in). Draw it once so its shader runs under
 * SwiftShader and its geometry is counted in the memory baseline.
 */
async function uploadShootingStar(page) {
  const found = await page.evaluate(() => {
    const mesh = window.__worldhub.engine.manager.active.scene.getObjectByName('shooting-star');
    if (!mesh) return false;
    mesh.visible = true;
    window.__worldhub.engine.invalidate();
    return true;
  });
  check(found, 'the globe has a shooting star mesh');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.__worldhub.engine.manager.active.scene.getObjectByName('shooting-star').visible = false;
    window.__worldhub.engine.invalidate();
  });
  await idle(page);
}

async function touchChecks(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  watch(page);
  await page.goto(`${base}/?quality=low&ambientIdle=1`);
  await ready(page);
  await page.evaluate(() => { window.__marker = 'same-document'; });
  await idle(page);
  await hotspotsReady(page);
  await checkHotspotSeparation(page, 'mobile 390x844');
  check((await page.locator('[data-hint]').textContent()).trim() === 'Pinch to zoom', 'hint reads "Pinch to zoom" on touch');
  await page.screenshot({ path: join(shots, 'mobile.png') });

  // First tap opens the tooltip (and warms the city), a second tap on its label goes in.
  await hotspot(page, 'rome').tap();
  await tooltip(page, 'rome').waitFor({ timeout: 5000 });
  check(true, 'first tap opens the tooltip on touch');
  await page.waitForFunction(() => window.__worldhub.info().stages.rome === 'warm', undefined, { timeout: 30000 });
  check(true, 'tap preloads the city on touch');
  const box = await tooltip(page, 'rome').boundingBox();
  check(box && box.x >= 0 && box.x + box.width <= 390, 'the label stays inside a 390px screen', JSON.stringify(box));
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(shots, 'mobile-tooltip.png') });
  await tooltip(page, 'rome').tap();
  await settled(page, 'monument', 'rome');
  check(new URL(page.url()).pathname === '/rome', 'tapping the label enters the city');
  check((await page.evaluate(() => window.__marker)) === 'same-document', 'tapping the label does not reload');
  await page.goBack();
  await settled(page, 'globe');
  await idle(page);
  await hotspotsReady(page);

  // Tapping the globe itself dismisses a pinned tooltip.
  await hotspot(page, 'paris').tap();
  await tooltip(page, 'paris').waitFor({ timeout: 5000 });
  await page.touchscreen.tap(30, 760);
  await tooltip(page, 'paris').waitFor({ state: 'detached', timeout: 5000 });
  check(true, 'tapping elsewhere dismisses the tooltip');
  const touchAction = await page.evaluate(() => getComputedStyle(document.querySelector('[data-stage-canvas]')).touchAction);
  check(touchAction === 'none', 'canvas owns touch gestures (pinch to zoom, touch-action: none)', touchAction);
  await context.close();
}

/** Real mobile policy (no ambientIdle override): ambient animation runs, then pauses after about 20 s. */
async function ambientPauseChecks(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  watch(page);
  await page.goto(`${base}/?quality=low`);
  await ready(page);
  const startedAt = Date.now();
  await hotspotsReady(page);
  const memoryBefore = (await info(page)).memory;
  await page.waitForTimeout(3500);
  const first = (await info(page)).frames;
  await page.waitForTimeout(3000);
  const second = (await info(page)).frames;
  check(second - first > 10, 'mobile: the globe keeps rendering while ambient animation runs', `${first} -> ${second}`);
  check((await info(page)).ambientActive === true, 'mobile: ambient is active right after load');

  let lastFrames = -1;
  while (Date.now() - startedAt < 45000) {
    const { frames } = await info(page);
    if (frames === lastFrames) break;
    lastFrames = frames;
    await page.waitForTimeout(500);
  }
  const pausedAfter = (Date.now() - startedAt) / 1000;
  check(pausedAfter > 15 && pausedAfter < 35, `mobile: rendering pauses after about 20 s without interaction (${pausedAfter.toFixed(1)} s)`);
  check((await info(page)).ambientActive === false, 'mobile: ambient reports paused');
  check((await page.locator('.the-overlay-hotspots--paused').count()) === 1, 'mobile: the hotspot rings pause too');
  const parked = (await info(page)).frames;
  await page.waitForTimeout(1500);
  check((await info(page)).frames === parked, 'mobile: no frames while paused');

  // Any interaction wakes it up.
  await page.touchscreen.tap(200, 600);
  await page.waitForFunction((n) => window.__worldhub.info().frames > n, parked, { timeout: 5000 });
  check((await info(page)).ambientActive === true, 'mobile: a tap resumes the ambient animation');
  const memoryAfter = (await info(page)).memory;
  check(memoryAfter.geometries === memoryBefore.geometries && memoryAfter.textures === memoryBefore.textures, 'mobile: no memory growth across a full ambient cycle', `${JSON.stringify(memoryBefore)} -> ${JSON.stringify(memoryAfter)}`);
  await context.close();
}

async function reducedMotionChecks(browser) {
  const context = await browser.newContext({ viewport: { width: 1000, height: 640 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  watch(page);
  await page.goto(`${base}/?quality=medium`);
  await ready(page);
  await hotspotsReady(page);
  const frames = (await info(page)).frames;
  await page.waitForTimeout(700);
  check((await info(page)).frames === frames, 'reduced motion: no intro spin, no twinkle, no auto-rotation: the globe is idle on arrival');
  check((await info(page)).ambientActive === false, 'reduced motion: ambient animation is off');
  const coordinates = await coordinatesOf(page);
  await page.mouse.move(980, 60);
  await page.waitForTimeout(700);
  check(Math.abs((await cameraOf(page)).x) < 1e-6, 'reduced motion: no parallax tilt');
  const settledFrames = (await info(page)).frames;
  await page.waitForTimeout(500);
  check((await info(page)).frames === settledFrames, 'reduced motion: still idle after moving the pointer');
  check((await coordinatesOf(page)) === coordinates, 'reduced motion: the globe does not drift');
  const before = await centerOf(hotspot(page, 'rome'));
  await page.mouse.move(300, 260);
  await page.mouse.down();
  await page.mouse.move(200, 260, { steps: 5 });
  await page.mouse.up();
  const framesAtRelease = (await info(page)).frames;
  await page.waitForTimeout(500);
  const afterRelease = (await info(page)).frames;
  await page.waitForTimeout(500);
  check((await info(page)).frames === afterRelease && afterRelease - framesAtRelease <= 3, 'reduced motion: no inertia after releasing a drag');
  const after = await centerOf(hotspot(page, 'rome')).catch(() => null);
  check(!after || Math.abs(after.x - before.x) > 10, 'reduced motion: dragging still rotates');
  await context.close();
}

/** Desktop captures (1440x900) for a human to look at. */
async function desktopShots(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  watch(page);
  await page.goto(`${base}/?${QUICK}`);
  await ready(page);
  await idle(page);
  await hotspotsReady(page);
  await page.screenshot({ path: join(shots, 'desktop.png') });
  await hotspot(page, 'rome').hover();
  await tooltip(page, 'rome').waitFor({ timeout: 5000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(shots, 'desktop-tooltip.png') });
  await context.close();
}

async function main() {
  const server = spawn('npx', ['astro', 'preview', '--port', String(port)], { cwd: root, shell: true, stdio: 'ignore' });
  const browser = await chromium.launch({ executablePath: findChromium(), args: GL_ARGS });
  mkdirSync(shots, { recursive: true });
  try {
    await waitForServer(`${base}/`);
    const context = await browser.newContext({ viewport: { width: 1000, height: 640 } });
    const page = await context.newPage();
    watch(page);

    // Boot on `/` (quality locked so the adaptive governor does not interfere on a CPU renderer).
    await page.goto(`${base}/?${QUICK}`);
    await ready(page);
    await page.evaluate(() => { window.__marker = 'same-document'; });
    const first = await info(page);
    check(first.activeStage === 'globe', 'boots on the globe stage');
    check((await page.locator('html').getAttribute('lang')) === 'en', 'html lang is en');
    await idle(page);
    await uploadShootingStar(page);
    const baseMemory = (await info(page)).memory;
    console.log(`     base memory: geometries=${baseMemory.geometries} textures=${baseMemory.textures}`);

    // Render on demand: idle after the intro animation, no frames while nothing animates.
    const frames = await idle(page);
    await page.waitForTimeout(600);
    check((await info(page)).frames === frames, 'renders on demand: no frames while idle');

    // Globe: hotspots, tooltip, preload, Visit, accessible list, drag, zoom.
    await globeChecks(page);

    // Stage switch without reload, with back/forward.
    await click(page, 'Rome');
    await settled(page, 'monument', 'rome');
    check(new URL(page.url()).pathname === '/rome', 'click changes URL to /rome');
    check((await page.evaluate(() => window.__marker)) === 'same-document', 'no page reload on internal link');
    await click(page, 'Paris');
    await settled(page, 'monument', 'paris');
    await page.goBack();
    await settled(page, 'monument', 'rome');
    check(new URL(page.url()).pathname === '/rome', 'back returns to /rome');
    await page.goBack();
    await settled(page, 'globe');
    check(new URL(page.url()).pathname === '/', 'back returns to /');
    await page.goForward();
    await settled(page, 'monument', 'rome');
    check((await info(page)).activeStage === 'rome', 'forward shows rome again');
    check((await page.evaluate(() => window.__marker)) === 'same-document', 'still the same document after back/forward');
    const { stages } = await info(page);
    check(Object.values(stages).filter((status) => status === 'warm').length <= 2, 'warm stages respect the LRU limit', JSON.stringify(stages));

    // Pause with hidden tab, resume on visible.
    await idle(page);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const hiddenFrames = (await info(page)).frames;
    await page.evaluate(() => window.__worldhub.engine.invalidate());
    await page.waitForTimeout(500);
    check((await info(page)).frames === hiddenFrames, 'no frames while the tab is hidden');
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForFunction((n) => window.__worldhub.info().frames > n, hiddenFrames, { timeout: 10000 });
    check(true, 'renders again when the tab is visible');

    // Context loss and restore.
    await idle(page);
    await page.evaluate(() => {
      const gl = window.__worldhub.engine.renderer.getContext();
      window.__loseContext = gl.getExtension('WEBGL_lose_context');
      window.__loseContext.loseContext();
    });
    await page.waitForTimeout(300);
    const lostFrames = (await info(page)).frames;
    await page.evaluate(() => window.__worldhub.engine.invalidate());
    await page.waitForTimeout(300);
    check((await info(page)).frames === lostFrames, 'no frames while the context is lost');
    await page.evaluate(() => window.__loseContext.restoreContext());
    await page.waitForFunction((n) => window.__worldhub.info().frames > n, lostFrames, { timeout: 15000 });
    check(true, 'renders again after the context is restored');
    await click(page, 'Athens');
    await settled(page, 'monument', 'athens');
    check(true, 'stage switch works after context restore');

    // Leak check: 10 round trips through every stage, memory must not grow.
    await click(page, 'Globe');
    await settled(page, 'globe');
    const cycle = async () => {
      for (const name of ['Rome', 'Paris', 'Athens']) {
        await click(page, name);
        await settled(page, 'monument', name.toLowerCase());
        await click(page, 'Globe');
        await settled(page, 'globe');
      }
    };
    await cycle();
    await idle(page);
    const steady = (await info(page)).memory;
    for (let i = 0; i < 10; i += 1) await cycle();
    await idle(page);
    const after = (await info(page)).memory;
    console.log(`     steady: g=${steady.geometries} t=${steady.textures}  after 10 cycles: g=${after.geometries} t=${after.textures}`);
    check(after.geometries === steady.geometries && after.textures === steady.textures, 'no GPU growth after 10 round trips');
    await page.evaluate(() => window.__worldhub.engine.manager.sleepInactive());
    await page.waitForTimeout(100);
    const slept = (await info(page)).memory;
    console.log(`     all inactive asleep: g=${slept.geometries} t=${slept.textures}`);
    // The globe skips the G-buffer pass (no ambient occlusion), so the first city to render allocates that shared target: +1 texture.
    check(slept.geometries === baseMemory.geometries && slept.textures - baseMemory.textures <= 1 && slept.textures === steady.textures, 'memory returns to the base (plus the shared G-buffer) with inactive stages asleep', `base=${JSON.stringify(baseMemory)} now=${JSON.stringify(slept)}`);

    // Deep links.
    for (const [path, kind, city] of [['/paris', 'monument', 'paris'], ['/athens#info', 'info', 'athens'], ['/rome', 'monument', 'rome']]) {
      const deep = await context.newPage();
      watch(deep);
      const [pathname, hash = ''] = path.split('#');
      await deep.goto(`${base}${pathname}?quality=medium${hash && `#${hash}`}`);
      await ready(deep);
      const state = await appState(deep);
      check(state.kind === kind && state.city === city, `deep link ${path}`, JSON.stringify(state));
      check((await info(deep)).activeStage === city, `deep link ${path} renders its stage`);
      await deep.close();
    }
    const unknown = await context.newPage();
    watch(unknown);
    await unknown.goto(`${base}/?quality=low`);
    await ready(unknown);
    check((await info(unknown)).tier === 'low', 'low tier (no G-buffer, depth texture) renders');
    await click(unknown, 'Paris');
    await settled(unknown, 'monument', 'paris');
    check(true, 'low tier switches stage');
    await unknown.close();

    await desktopShots(browser);
    await touchChecks(browser);
    await reducedMotionChecks(browser);
    await ambientPauseChecks(browser);
  } finally {
    await browser.close();
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    else server.kill();
  }
}

main()
  .catch((error) => problems.push(`script error: ${error.stack ?? error}`))
  .finally(() => {
    if (problems.length) {
      console.error(`\n${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
      process.exit(1);
    }
    console.log('\nSmoke test OK');
  });
