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
  // QA 11-25 row 40: on the hosted runner's software GL the boot is slow, and the pinned probe (engine 0.1.80) asks for
  // a dump every tick: 186 on 2f1b2d8, where a phone-speed boot asks 40 to 50. The trace's default buffer filled and
  // dropped the last dumps (179 traced), and a dump can also come back `success: false`, with a guid and nothing traced;
  // either way the probe refuses the run on the count. The trace gets a buffer that holds them all, a failed dump is no
  // reading (an empty guid, which the probe already skips), and the line below names the cause of any red.
  const TRACE_BUFFER_KB = 256 * 1024;
  const dumps = { asked: 0, failed: 0, traced: new Set(), lost: null };
  process.on('exit', () => {
    if (dumps.asked > 0) console.error(`Nine memory dumps: ${String(dumps.asked)} asked, ${String(dumps.failed)} failed, ${String(dumps.traced.size)} in the trace; data lost ${String(dumps.lost)}`);
  });
  chromium.connectOverCDP = async (...args) => {
    const browser = await connect(...args);
    const newBrowserCDPSession = browser.newBrowserCDPSession.bind(browser);
    browser.newBrowserCDPSession = async () => {
      const session = await newBrowserCDPSession(), send = session.send.bind(session);
      session.on('Tracing.dataCollected', event => { for (const row of event.value) if (row?.ph === 'v') dumps.traced.add(row.id); });
      session.on('Tracing.tracingComplete', event => { dumps.lost = event.dataLossOccurred ?? null; });
      session.send = async (method, params) => {
        if (method === 'Tracing.start' && params?.traceConfig !== undefined && params.traceConfig.traceBufferSizeInKb === undefined)
          params = { ...params, traceConfig: { ...params.traceConfig, traceBufferSizeInKb: TRACE_BUFFER_KB } };
        const result = await send(method, params);
        if (method !== 'Tracing.requestMemoryDump') return result;
        dumps.asked++;
        if (result?.success !== false) return result;
        dumps.failed++;
        return { ...result, dumpGuid: '' };
      };
      return session;
    };
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
