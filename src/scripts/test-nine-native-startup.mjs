#!/usr/bin/env node
// macOS native WebKit GPU restart during renderer creation (E257).
// node src/scripts/test-nine-native-startup.mjs --url=http://127.0.0.1:4184
// Only the fresh Playwright GPU process is killed; every pre-existing process is excluded.
import { webkit } from "./browser-playwright.mjs";
import { saveFixture } from '@wildshard/sdk/headless/scripts/debug-settings.mjs';
import { enterZone } from '@wildshard/sdk/headless/scripts/zone-entry.mjs'; // CHUNK-PARAM-REMOVAL CP20 (J522): no zone in any address
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';

if (process.platform !== 'darwin') throw new Error('This drill uses the macOS Playwright WebKit GPU process');
const base = process.argv.find((v) => v.startsWith('--url='))?.slice(6) ?? 'http://127.0.0.1:4184';
const gpuPids = () => execFileSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8' }).split('\n')
  .filter((line) => line.includes('ms-playwright/webkit') && line.includes('WebKit.GPU'))
  .map((line) => Number(line.trim().split(/\s+/)[0]));
const before = new Set(gpuPids());
const browser = await webkit.launch();
const native = { ownedPid: 0, killed: false };
const server = createServer((request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  if (request.url === '/restart' && native.ownedPid && !native.killed) {
    native.killed = true;
    process.kill(native.ownedPid, 'SIGKILL');
  }
  response.end('ok');
});
try {
  await new Promise((resolve) => { server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server port');
  const context = await browser.newContext({ viewport: { width: 402, height: 654 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await saveFixture(context, { scope: 'device', key: 'devMode', data: true }); // developer mode: EXPLORE WORLD is developer-only (E386)
  // QA 11-25 row 133: `wildshard dev` joins a dev world, which asks the device's Name once: the boot waits on the player
  await saveFixture(context, { scope: 'device', key: 'nameAsked', data: true });
  const reports = [];
  await context.route('**/api/errors', async (route) => {
    reports.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, body: '{}' });
  });
  await context.route(/https:\/\/[^/]+\.ingest\.[^/]+\/api\//, (route) => route.fulfill({ status: 200, body: '{}' }));
  const page = await context.newPage();
  // Start this browser's GPU process, then identify it before navigating to the game.
  const available = await page.evaluate(() => Boolean(document.createElement('canvas').getContext('webgl2')));
  if (!available) throw new Error('WebGL unavailable before the test');
  const fresh = gpuPids().filter((pid) => !before.has(pid));
  if (fresh.length !== 1) throw new Error(`Cannot exclusively identify this test's GPU process: ${fresh.join(', ')}`);
  native.ownedPid = fresh[0];
  await context.addInitScript((port) => {
    // oxlint-disable-next-line typescript/unbound-method -- native receiver supplied with Reflect.apply
    const get = HTMLCanvasElement.prototype.getContext;
    let once = false;
    HTMLCanvasElement.prototype.getContext = function getContext(...args) {
      const gl = Reflect.apply(get, this, args);
      if (this.id === 'game' && gl instanceof WebGL2RenderingContext && !once) {
        once = true;
        // Synchronize the native restart with creation, before Three reads precision. No GL
        // return values are fabricated. This synchronous request exists only in this drill.
        const request = new XMLHttpRequest();
        request.open('GET', `http://127.0.0.1:${port}/restart`, false);
        request.send();
      }
      return gl;
    };
  }, address.port);
  await enterZone(page, { zone: 'nine-dragon-stack', base, flags: 'nolock=1&mute=1&tier=phone&touch=1', waitUntil: 'domcontentloaded' });
  // the boot trace keeps its last 32 checkpoints, and a grid boot writes more than that: read the renderer's wait while it is there
  const waited = await page.waitForFunction(() => (localStorage.getItem('wildshard.save.v2@2.device') ?? '').includes('renderer:waiting'),
    null, { timeout: 30_000, polling: 50 }).then(() => true, () => false);
  await page.waitForFunction(() => Boolean(window.__wildshard?.world) || Boolean(document.querySelector('#wserr')), null, { timeout: 60_000 });
  // meta QA 11-25 row 152 (engine 15ecdf855): Nine's declared plan (its city, sets, movers' views, portal veil) installs
  // after the restart, before the drill leaves Nine for Explore. Leaving mid-install ends it ('left'), which is no refusal;
  // a plan that never installs, or refuses, fails the drill. A developer page marks each install's outcome.
  const plan = await page.waitForFunction(() => performance.getEntriesByName('wildshard.grid.data-stay').map((mark) => mark.detail)
    .find((stay) => stay?.kind === 'plan' && stay.instance === 'nine-dragon-stack' && stay.outcome !== 'left')?.outcome ?? null,
  null, { timeout: 60_000, polling: 100 }).then((handle) => handle.jsonValue(), () => 'missing');
  // meta EXPLORE-MODE EX1 (engine f7cc70dc5): the title has no EXPLORE WORLD; the HUD's own entry opens Explore's hub
  if (await page.evaluate(() => Boolean(window.__wildshard?.world))) {
    await page.evaluate(() => { window.__wildshard.world.hud.startExplore(); });
    await page.locator('.ws-x-card[data-m="world"]').click();
  }
  await page.waitForTimeout(3000);
  const state = await page.evaluate(() => ({
    world: Boolean(window.__wildshard?.world), lost: window.__wildshard?.world?.game.renderer.getContext().isContextLost(),
    exploring: Boolean(document.querySelector('.ws-x.show[data-mode="world"]')),
    error: document.querySelector('#wserr .msg')?.textContent ?? '',
  }));
  const okay = native.killed && waited && plan === 'installed' && state.world && !state.lost && state.exploring && !state.error && reports.length === 0;
  console.log(`${okay ? 'PASS' : 'FAIL'} native GPU restart: ${JSON.stringify({ killed: native.killed, waited, plan, reports: reports.length, ...state })}`);
  if (!okay) process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
