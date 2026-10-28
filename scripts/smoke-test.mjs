// Headless smoke test (no interactive browser): serves `dist/` with `astro preview`, opens it in a Playwright
// Chromium with software WebGL (SwiftShader) and checks the app shell end to end.
//
// Usage: npm run build && npm run smoke
// Limit: SwiftShader runs on CPU. It validates behavior and memory bookkeeping, NOT real fps or GPU load.
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = 4398;
const base = `http://localhost:${port}`;
const GL_ARGS = ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'];
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
const click = (page, name) => page.locator('.the-stage__nav').getByRole('link', { name, exact: true }).click();

async function main() {
  const server = spawn('npx', ['astro', 'preview', '--port', String(port)], { cwd: root, shell: true, stdio: 'ignore' });
  const browser = await chromium.launch({ executablePath: findChromium(), args: GL_ARGS });
  try {
    await waitForServer(`${base}/`);
    const context = await browser.newContext({ viewport: { width: 1000, height: 640 } });
    const page = await context.newPage();
    watch(page);

    // Boot on `/` (quality locked so the adaptive governor does not interfere on a CPU renderer).
    await page.goto(`${base}/?quality=medium`);
    await ready(page);
    await page.evaluate(() => { window.__marker = 'same-document'; });
    const first = await info(page);
    check(first.activeStage === 'globe', 'boots on the globe stage');
    check((await page.locator('html').getAttribute('lang')) === 'en', 'html lang is en');
    await idle(page);
    const baseMemory = (await info(page)).memory;
    console.log(`     base memory: geometries=${baseMemory.geometries} textures=${baseMemory.textures}`);

    // Render on demand: idle after the intro animation, no frames while nothing animates.
    const frames = await idle(page);
    await page.waitForTimeout(600);
    check((await info(page)).frames === frames, 'renders on demand: no frames while idle');

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
    check(slept.geometries === baseMemory.geometries && slept.textures === baseMemory.textures, 'memory returns to the base with inactive stages asleep', `base=${JSON.stringify(baseMemory)} now=${JSON.stringify(slept)}`);

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
