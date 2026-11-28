#!/usr/bin/env node
import { KEYCHAIN_ARGS } from './.kit/chromium-keychain.mjs';
import { harnessPins, saveFixture } from '@wildshard/sdk/headless/scripts/debug-settings.mjs';
// Reproduce the phone's null precision result or the Simulator's shaderSource failure during boot.
// Run with `pnpm exec wildshard dev src 4184` up (src/scripts/test-nine-gpu-boot.sh starts it and runs every fault):
// node src/scripts/test-nine-gpu-boot.mjs [--url=http://127.0.0.1:4184] [--only=webkit|chromium|all] [--fault=precision|shader|context|texture]
// A pass requires one failure, an error panel, no second load, and diagnostics in both reporting transports; the texture
// fault (a refused optional road map) instead requires the refusal heard, the world loaded and no card (meta QA 11-25 row 151).
import { chromium, webkit } from "./browser-playwright.mjs";
import { enterZone } from '@wildshard/sdk/headless/scripts/zone-entry.mjs'; // CHUNK-PARAM-REMOVAL CP20 (J522): no zone in any address

const option = (name, fallback) => process.argv.find((part) => part.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const base = option('url', 'http://127.0.0.1:4184').replace(/\/$/, '');
const only = option('only', 'webkit');
const fault = option('fault', 'shader');
if (!['shader', 'precision', 'context', 'texture'].includes(fault)) throw new Error(`Unknown fault: ${fault}`);
const engines = only === 'all' ? [['webkit', webkit], ['chromium', chromium]] : [[only, only === 'chromium' ? chromium : webkit]];
if (only !== 'all' && only !== 'webkit' && only !== 'chromium') throw new Error(`Unknown engine: ${only}`);

let failed = false;
for (const [name, engine] of engines) {
  const browser = await engine.launch(name === 'chromium' ? { args: [...KEYCHAIN_ARGS, '--use-angle=metal'] } : {});
  let page;
  try {
    const context = await browser.newContext({ viewport: { width: 402, height: 654 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await saveFixture(context, { scope: 'device', key: 'devMode', data: true }); // developer mode: EXPLORE WORLD is developer-only (E386)
    // QA 11-25 row 133: `wildshard dev` joins a dev world, which asks the device's Name once: the boot waits on the player
    await saveFixture(context, { scope: 'device', key: 'nameAsked', data: true });
    const reports = [];
    await context.route('**/api/errors', async (route) => {
      reports.push(route.request().postDataJSON());
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"id":"synthetic-test"}' });
    });
    // A local page never sends to Sentry (engine telemetry/browserErrors.ts, SENTRY-ZERO SZ2): an envelope caught here fails the drill
    const envelopes = [];
    await context.route(/https:\/\/[^/]+\.ingest\.[^/]+\/api\//, async (route) => {
      envelopes.push(route.request().postData() ?? '');
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    if (fault === 'texture') await harnessPins(context, { textures: 'ktx2' });
    await context.addInitScript((selectedFault) => {
      if (selectedFault === 'texture') {
        // Ask the actual driver to reject one upload; do not fabricate getError's result.
        // oxlint-disable-next-line typescript/unbound-method -- native receiver supplied with Reflect.apply
        const original = WebGL2RenderingContext.prototype.compressedTexSubImage2D;
        let injected = false;
        const uploads = { count: 0 };
        Object.defineProperty(window, '__nineBootUploads', { value: uploads });
        WebGL2RenderingContext.prototype.compressedTexSubImage2D = function compressedTexSubImage2D(...args) {
          // the grid boot uploads compressed textures as it assembles the cell, under its loading card, before the shaders
          // step (the page's own icons upload earlier, at admission). Meta QA 11-25 row 151: on `wildshard dev` the only
          // ones are the road's optional surface maps (sRGB ASTC 6x6, 37844): Nine's own textures are uncompressed until the
          // cook makes its packs. The engine checks a boot's uploads once a batch under the card, so the refused map is
          // heard (a warning naming the GL error) and the road falls back to its procedural maps, with no card.
          if (document.querySelector('.ws-load')?.dataset.step === 'assembly') uploads.count++;
          if (!injected && document.querySelector('.ws-load')?.dataset.step === 'assembly') {
            injected = true;
            args[6] = 0; // not a compressed texture format: INVALID_ENUM
            console.info('[gpu-boot-test] injected compressed upload failure');
          }
          Reflect.apply(original, this, args);
        };
        // what the boot's error reads under the card cost (row 151 measures it), and the page's warnings, as text
        // oxlint-disable-next-line typescript/unbound-method -- native receiver supplied with Reflect.apply
        const getError = WebGL2RenderingContext.prototype.getError;
        const reads = { count: 0, ms: 0 };
        Object.defineProperty(window, '__nineBootReads', { value: reads });
        WebGL2RenderingContext.prototype.getError = function timedGetError() {
          if (document.querySelector('.ws-load')?.dataset.step !== 'assembly') return Reflect.apply(getError, this, []);
          const start = performance.now(), code = Reflect.apply(getError, this, []);
          reads.count++; reads.ms += performance.now() - start;
          return code;
        };
        const warns = [];
        Object.defineProperty(window, '__nineWarns', { value: warns });
        const warn = console.warn.bind(console);
        // a part with no prototype has no string form: the drill's own reading must never throw into the page
        const text = (part) => { try { return part instanceof Error ? part.message : String(part); } catch { return '?'; } };
        console.warn = (...parts) => { warn(...parts); warns.push(parts.map(text).join(' ')); };
        return;
      }
      if (selectedFault === 'context') {
        // Lose the REAL context while getContext returns it; all WebGL queries now obey native
        // context-loss semantics. The old renderer constructor reproduces the phone's exact TypeError.
        // oxlint-disable-next-line typescript/unbound-method -- native receiver supplied with Reflect.apply
        const original = HTMLCanvasElement.prototype.getContext;
        let injected = false;
        HTMLCanvasElement.prototype.getContext = function getContext(...args) {
          const gl = Reflect.apply(original, this, args);
          if (!injected && this.id === 'game' && gl instanceof WebGL2RenderingContext) {
            const lose = gl.getExtension('WEBGL_lose_context');
            if (lose === null) throw new Error('Recovery test needs WEBGL_lose_context');
            injected = true;
            this.addEventListener('webglcontextlost', () => {
              // The APPLICATION must preventDefault to allow this restoration.
              setTimeout(() => { lose.restoreContext(); }, 750);
            }, { once: true });
            lose.loseContext();
            console.info('[gpu-boot-test] injected real context loss');
          }
          return gl;
        };
        return;
      }
      if (selectedFault === 'precision') {
        // oxlint-disable-next-line typescript/unbound-method -- invoked with the original WebGL receiver via call()
        const precision = WebGL2RenderingContext.prototype.getShaderPrecisionFormat;
        let injected = false;
        WebGL2RenderingContext.prototype.getShaderPrecisionFormat = function getShaderPrecisionFormat(...args) {
          if (!injected) {
            injected = true;
            console.info('[gpu-boot-test] injected precision failure');
          }
          // Keep capabilities unavailable through the bounded startup recovery window.
          precision.call(this, ...args);
          return null;
        };
        return;
      }
      // oxlint-disable-next-line typescript/unbound-method -- the native method is always invoked with its WebGL context via call()
      const original = WebGL2RenderingContext.prototype.shaderSource;
      let injected = false;
      WebGL2RenderingContext.prototype.shaderSource = function shaderSource(shader, source) {
        if (!injected && document.querySelector('.ws-load')?.dataset.step === 'shaders') {
          injected = true;
          console.info('[gpu-boot-test] injected shaderSource failure');
          throw new TypeError("Argument 1 ('shader') to WebGL2RenderingContext.shaderSource must be an instance of WebGLShader");
        }
        original.call(this, shader, source);
      };
    }, fault);
    page = await context.newPage();
    const navigations = [];
    let injections = 0;
    // enterZone stands on /version.json to write the tap: only the game's own documents count. A document is a navigation
    // request of the main frame: the page rewrites its own address in place (history, J522), which is no second load
    page.on('request', (request) => { if (request.isNavigationRequest() && request.frame() === page.mainFrame() && new URL(request.url()).pathname !== '/version.json') navigations.push(request.url()); });
    page.on('console', (message) => { if (message.text().includes('[gpu-boot-test] injected')) { injections++; console.log(`${name}: injected ${fault} failure`); } });
    page.on('pageerror', (error) => { console.log(`${name}: page error ${error.message.slice(0, 180)}`); });
    const entry = fault === 'context' ? '' : '&skipintro=1';
    await enterZone(page, { zone: 'nine-dragon-stack', base, flags: `nolock=1&mute=1&touch=1&tier=phone&sw=0${entry}`, waitUntil: 'domcontentloaded', timeout: 30_000 });
    if (fault === 'texture') {
      await page.waitForFunction(() => Boolean(window.__wildshard?.world) || Boolean(document.querySelector('#wserr, .ws-load-error')), null, { timeout: 90_000 });
      await page.waitForTimeout(1500); // a late card or a recovery navigation would have happened by now
      const state = await page.evaluate(() => ({
        world: Boolean(window.__wildshard?.world), error: Boolean(document.querySelector('#wserr, .ws-load-error')),
        heard: window.__nineWarns.some((line) => line.includes('road surface maps refused') && line.includes('Graphics error 1280 after compressed texture')),
        reads: window.__nineBootReads.count, readMs: Math.round(window.__nineBootReads.ms * 100) / 100,
        uploads: window.__nineBootUploads.count,
      }));
      const clean = navigations.length === 1 && state.world && !state.error && reports.length === 0 && envelopes.length === 0;
      // an engine whose GPU samples no ASTC keeps the road's procedural maps: nothing compressed uploads under the card,
      // so there is nothing to refuse, and the run only proves a clean boot
      const verdict = !clean ? 'FAIL' : state.uploads === 0 && injections === 0 ? 'SKIP' : injections === 1 && state.heard ? 'PASS' : 'FAIL';
      console.log(`${verdict} ${name}/texture: ${JSON.stringify({ injections, navigations, reports: reports.length, envelopes: envelopes.length, ...state })}`);
      if (verdict === 'FAIL') failed = true;
      continue;
    }
    if (fault === 'context') {
      // the boot trace keeps its last 32 checkpoints, and a grid boot writes more than that before Explore is stable: the
      // renderer's wait is read while it is still in the trace
      const waited = await page.waitForFunction(() => (localStorage.getItem('wildshard.save.v2@2.device') ?? '').includes('renderer:waiting'),
        null, { timeout: 30_000, polling: 50 }).then(() => true, () => false);
      await page.waitForFunction(() => Boolean(window.__wildshard?.world) || Boolean(document.querySelector('#wserr')), null, { timeout: 90_000 });
      // meta EXPLORE-MODE EX1 (engine f7cc70dc5): the title has no EXPLORE WORLD; the HUD's own entry opens Explore's hub
      await page.evaluate(() => { window.__wildshard.world.hud.startExplore(); });
      await page.locator('.ws-x-card[data-m="world"]').click();
      await page.waitForFunction(() => {
        const trace = (JSON.parse(localStorage.getItem('wildshard.save.v2@2.device') ?? '{}').keys?.['boot.trace']?.data ?? null);
        return trace?.status === 'ready' && trace.checkpoints?.some((point) => point.operation === 'explore:stable');
      }, null, { timeout: 25_000 });
      const state = await page.evaluate(() => ({
        world: Boolean(window.__wildshard?.world), exploring: Boolean(document.querySelector('.ws-x.show[data-mode="world"]')),
        lost: window.__wildshard?.world?.game.renderer.getContext().isContextLost(),
        calls: window.__wildshard?.world?.game.renderer.info.render.calls ?? 0,
        error: Boolean(document.querySelector('#wserr')),
        trace: JSON.stringify(JSON.parse(localStorage.getItem('wildshard.save.v2@2.device') ?? '{}').keys?.['boot.trace']?.data ?? null),
      }));
      const okay = injections === 1 && navigations.length === 1 && state.world && state.exploring &&
        state.lost === false && state.calls > 0 && !state.error && reports.length === 0 &&
        waited && state.trace.includes('"status":"ready"');
      console.log(`${okay ? 'PASS' : 'FAIL'} ${name}/context: ${JSON.stringify({ injections, navigations: navigations.length, waited, reports: reports.length, ...state, trace: undefined })}`);
      if (!okay) failed = true;
      continue;
    }
    // a context whose precision never comes back is waited on, not reloaded (engine core/webglStartup.ts): the boot's stuck
    // watch opens the fatal card after a minute (engine boot/stuckStep.ts STUCK_STEP_MS). A fault the shard load throws
    // gets the load-failure screen instead (engine ui/errorScreen.ts showLoadFailure: RELOAD, Copy diagnostics)
    await page.waitForSelector('#wserr[role="alertdialog"], .ws-load-error[role="alert"]', { timeout: fault === 'precision' ? 90_000 : 30_000 });
    await page.waitForTimeout(1500); // an automatic recovery navigation would have happened by now
    const state = await page.evaluate(() => ({
      card: document.querySelector('#wserr') === null ? 'load-failure' : 'fatal',
      error: document.querySelector('#wserr .msg')?.textContent ?? document.querySelector('.ws-load-error')?.textContent ?? '',
      detail: document.querySelector('#wserr .n')?.textContent ?? '',
      retry: Boolean(document.querySelector('#wserr button.here') ?? [...document.querySelectorAll('.ws-load-error button')].find((button) => button.textContent === 'RELOAD')),
      title: Boolean(document.querySelector('#wserr button.title')),
      url: location.href,
      loadAttempt: (JSON.parse(sessionStorage.getItem('wildshard.save.v2@2.session') ?? '{}').keys?.loadAttempt?.data ?? null)?.count ?? null,
    }));
    // one document, the zone's: a second is a recovery navigation (no address names the zone, J522)
    const otherNavigation = navigations.length !== 1;
    const expectedError = fault === 'precision' ? 'The game stopped loading at step "renderer"' : "WebGL2RenderingContext.shaderSource must be an instance of WebGLShader";
    const expectedOperation = fault === 'precision' ? 'renderer:waiting' : 'compile:before';
    const evidence = reports.some((report) => report.context?.bootDiagnostic?.includes(expectedOperation));
    const okay = injections === 1 && !otherNavigation && state.error.includes(expectedError) && state.detail === '' && state.retry && (state.card === 'load-failure' || state.title) && state.loadAttempt === 1 && evidence && envelopes.length === 0;
    console.log(`${okay ? 'PASS' : 'FAIL'} ${name}/${fault}: ${JSON.stringify({ injections, navigations, evidence, envelopes: envelopes.length, ...state, error: state.error.slice(0, 160) })}`);
    if (!okay) failed = true;
  } catch (error) {
    failed = true;
    console.error(`FAIL ${name}: ${String(error)}`);
    if (page) console.error(JSON.stringify(await page.evaluate(() => ({ url: location.href, step: document.querySelector('.ws-load')?.dataset.step, title: Boolean(document.querySelector('.ws-menu')), error: document.querySelector('#wserr .msg')?.textContent ?? '', world: Boolean(window.__wildshard?.world) })).catch(() => null)));
  } finally { await browser.close(); }
}
if (failed) process.exitCode = 1;
