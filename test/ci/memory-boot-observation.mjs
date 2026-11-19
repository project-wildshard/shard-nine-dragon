// On a timed-out SDK memory boot, report the last card and failed local
// reads before the published engine closes Chromium.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';

function observe(page) {
  const failedReads = new Set();
  page.on('response', response => {
    if (response.status() < 400 || failedReads.size >= 20) return;
    const url = new URL(response.url());
    if (url.hostname === '127.0.0.1') failedReads.add(`${String(response.status())} ${url.pathname}`);
  });
  const wait = page.waitForFunction.bind(page);
  page.waitForFunction = async (...args) => {
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
  const caller = createRequire(resolve('package.json'));
  const engine = createRequire(caller.resolve('@wildshard/engine/package.json'));
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
