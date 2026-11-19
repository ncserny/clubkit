// Minimal Chrome DevTools Protocol driver (no dependencies; Node 22+ for global WebSocket).
// Usage: node cdp.mjs <script.mjs>   where the script default-exports async (page) => {}
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const PORT = Number(process.env.CDP_PORT ?? 9333);
const SIZE = process.env.CDP_SIZE ?? '1280,720';
// CHROME: the browser to start, if it is not `google-chrome` on the path (on Windows, the full path to chrome.exe).
const CHROME = process.env.CHROME ?? 'google-chrome';
// CDP_GPU=1: draw with the machine's graphics card. Without it Chrome draws in software, which is
// slow but gives the same pixels on any machine.
const GPU = !!process.env.CDP_GPU && process.env.CDP_GPU !== '0';

async function launch() {
  const dir = mkdtempSync(join(tmpdir(), 'cdp-'));
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${dir}`,
      `--window-size=${SIZE}`,
      '--no-first-run',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      ...(GPU ? [] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']),
      '--ignore-gpu-blocklist',
      '--autoplay-policy=no-user-gesture-required',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json`);
      const targets = await r.json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return { chrome, wsUrl: page.webSocketDebuggerUrl };
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  chrome.kill();
  throw new Error('chrome did not start');
}

const { chrome, wsUrl } = await launch();
const ws = new WebSocket(wsUrl);
await new Promise((r, j) => {
  ws.onopen = r;
  ws.onerror = j;
});
let id = 0;
const pending = new Map();
const consoleLog = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
  } else if (m.method === 'Runtime.consoleAPICalled') {
    consoleLog.push({ type: m.params.type, text: m.params.args.map((a) => a.value ?? a.description ?? '').join(' ') });
  } else if (m.method === 'Runtime.exceptionThrown') {
    consoleLog.push({ type: 'exception', text: m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text });
  } else if (m.method === 'Log.entryAdded') {
    consoleLog.push({ type: `log:${m.params.entry.level}`, text: m.params.entry.text });
  }
};
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    pending.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params }));
  });

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');

const page = {
  send,
  console: consoleLog,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  async goto(url) {
    await send('Page.navigate', { url });
  },
  async eval(expression) {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  },
  async waitFor(expression, timeout = 180000, every = 500) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      if (await page.eval(expression).catch(() => false)) return Date.now() - t0;
      await page.sleep(every);
    }
    throw new Error(`timeout waiting for ${expression}`);
  },
  async shot(file) {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(file, Buffer.from(r.data, 'base64'));
    return file;
  },
  async key(key, type = 'keyDown') {
    const code = key.length === 1 ? `Key${key.toUpperCase()}` : key;
    await send('Input.dispatchKeyEvent', { type, key, code, text: type === 'keyDown' && key.length === 1 ? key : undefined });
  },
  async hold(key, ms) {
    await page.key(key, 'rawKeyDown');
    await page.sleep(ms);
    await page.key(key, 'keyUp');
  },
};

let code = 0;
try {
  const mod = await import(pathToFileURL(resolve(process.argv[2])).href);
  await mod.default(page);
} catch (e) {
  console.error('SCRIPT ERROR', e);
  code = 1;
} finally {
  ws.close();
  chrome.kill();
}
process.exit(code);
