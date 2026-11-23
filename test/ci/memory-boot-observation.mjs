// On a timed-out SDK memory boot, report the last card and failed local
// reads before the published engine closes Chromium.
import { setTimeout } from 'node:timers/promises';
import { engineRequire } from '@wildshard/sdk/headless';

async function observe(page) {
  await page.addInitScript(() => {
    document.addEventListener('ws:control-ready', () => {
      document.documentElement.dataset.memoryProbeControl = 'ready';
      const step = globalThis.__bootMemoryStep;
      if (typeof step === 'function') {
        globalThis.__bootMemoryStep = () => document.querySelector('.ws-load') === null ? 'ready' : step();
      }
    }, { once: true });
  });
  const failedReads = new Set();
  page.on('response', response => {
    if (response.status() < 400 || failedReads.size >= 20) return;
    const url = new URL(response.url());
    if (url.hostname === '127.0.0.1') failedReads.add(`${String(response.status())} ${url.pathname}`);
  });
  const wait = page.waitForFunction.bind(page);
  page.waitForFunction = async (...args) => {
    // The v0.1.50 direct-entry probe waits on a Developer object. The
    // game's control event comes from gameplay with the frame gate open.
    if (String(args[0]).includes('window.__wildshard?.world?.game')) {
      args[0] = () => Boolean(document.querySelector('#wserr .msg')?.textContent) ||
        (document.querySelector('.ws-load') === null && document.documentElement.dataset.memoryProbeControl === 'ready');
    }
    try {
      return await wait(...args);
    } catch (error) {
      if (error.name === 'TimeoutError') {
        const snapshot = page.evaluate(() => {
          const loader = document.querySelector('.ws-load');
          return {
            path: location.pathname,
            step: loader?.getAttribute('data-step') ?? loader?.querySelector('[data-step]')?.getAttribute('data-step'),
            waiting: loader?.getAttribute('data-waiting'),
            last: [...(loader?.querySelectorAll('.ws-load-log li') ?? [])].slice(-6).map(item => item.textContent),
            card: document.querySelector('#wserr .msg')?.textContent,
            title: document.documentElement.classList.contains('title-first'),
            document: document.readyState,
            canvas: document.querySelector('canvas') !== null,
            game: Boolean(globalThis.__wildshard?.world?.game),
            control: document.documentElement.dataset.memoryProbeControl,
          };
        }).catch(() => null);
        const boot = await Promise.race([snapshot, setTimeout(2000, null, { ref: false })]);
        console.error('Nine memory boot:', JSON.stringify({ boot, failedReads: [...failedReads] }));
      }
      throw error;
    }
  };
  return page;
}

// The launcher imports memory-product in this process after the preload runs.
if (process.argv[1]?.endsWith('/bin/wildshard.mjs') && process.argv[2] === 'memory') {
  const engine = engineRequire;
  const { chromium } = engine('playwright');
  if (process.platform === 'linux') {
    // Use the software renderer that engine Ring 1 selects on hosted Linux.
    const launch = chromium.launchServer.bind(chromium);
    chromium.launchServer = options => launch({
      ...options,
      args: [...options.args.filter(arg => !arg.startsWith('--use-angle=')),
        '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
  }
  const connect = chromium.connectOverCDP.bind(chromium);
  chromium.connectOverCDP = async (...args) => {
    const browser = await connect(...args);
    const newContext = browser.newContext.bind(browser);
    browser.newContext = async (...contextOptions) => {
      const context = await newContext(...contextOptions);
      const newPage = context.newPage.bind(context);
      context.newPage = async () => observe(await newPage());
      return context;
    };
    return browser;
  };
}
