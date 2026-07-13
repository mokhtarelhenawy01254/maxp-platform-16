const WebSocket = require('ws');

const BROWSER_WS = 'ws://127.0.0.1:9222/devtools/browser/b978acee-9a73-4a3d-ba33-1985a06ad1f2';
const EMAIL = 'swan@h2m.com';
const PASSWORD = '0165676135';
const SEARCH_PHONE = '01128663636';

let msgId = 1;

class CDPSession {
  constructor(ws) {
    this.ws = ws;
    this.callbacks = new Map();
    this.eventHandlers = new Map();
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        const cb = this.callbacks.get(msg.id);
        if (cb) { this.callbacks.delete(msg.id); cb(msg); return; }
        if (msg.method) {
          (this.eventHandlers.get(msg.method) || []).forEach(h => h(msg.params));
        }
      } catch(e) {}
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      this.callbacks.set(id, (msg) => {
        if (msg.error) reject(new Error(`${method}: ${msg.error.message}`));
        else resolve(msg.result);
      });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => reject(new Error(`Timeout: ${method}`)), 30000);
    });
  }

  on(method, handler) { if (!this.eventHandlers.has(method)) this.eventHandlers.set(method, []); this.eventHandlers.get(method).push(handler); }
  close() { try { this.ws.close(); } catch(e) {} }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const browserWS = new WebSocket(BROWSER_WS);
  await new Promise((res, rej) => { browserWS.on('open', res); browserWS.on('error', rej); });
  const browser = new CDPSession(browserWS);

  const target = await browser.send('Target.createTarget', { url: 'about:blank' });
  const pageId = target.targetId;

  const pageWS = new WebSocket(`ws://127.0.0.1:9222/devtools/page/${pageId}`);
  await new Promise((res, rej) => { pageWS.on('open', res); pageWS.on('error', rej); });
  const page = new CDPSession(pageWS);

  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Network.enable');

  // Capture error log request bodies
  const errorReqs = [];

  page.on('Network.requestWillBeSent', (params) => {
    if (params.request.url.includes('/errors/log')) {
      errorReqs.push({ requestId: params.requestId, url: params.request.url });
    }
    if (params.request.url.includes('/orders/bulk-search')) {
      console.log('BODY:', params.request.postData || '(no body)');
    }
  });

  // Navigate & login
  await page.send('Page.navigate', { url: 'https://maxp.online/bulk-search' });
  await sleep(5000);

  let url = (await page.send('Runtime.evaluate', { expression: 'window.location.href' })).result.value;
  if (url.includes('auth/login')) {
    console.log('Logging in...');
    await page.send('Runtime.evaluate', { expression: `document.querySelector('#email').focus()` });
    await sleep(200);
    await page.send('Input.insertText', { text: EMAIL });
    await sleep(200);
    await page.send('Runtime.evaluate', { expression: `document.querySelector('#password').focus()` });
    await sleep(200);
    await page.send('Input.insertText', { text: PASSWORD });
    await sleep(200);
    await page.send('Runtime.evaluate', {
      expression: `['#email', '#password'].forEach(id => {
        const el = document.querySelector(id);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });`
    });
    const btnPos = JSON.parse((await page.send('Runtime.evaluate', {
      expression: `JSON.stringify(() => { const b = document.querySelector('.elite-submit-button'); const r = b.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; })()`
    })).result.value);
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: Math.round(btnPos.x), y: Math.round(btnPos.y), button: 'left', clickCount: 1 });
    await sleep(80);
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.round(btnPos.x), y: Math.round(btnPos.y), button: 'left', clickCount: 1 });
    await sleep(5000);
    await page.send('Page.navigate', { url: 'https://maxp.online/bulk-search' });
    await sleep(5000);
  }

  // Click phone tab
  await page.send('Runtime.evaluate', {
    expression: `(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim() === 'أرقام التليفونات'); if(b){b.click();return 'ok'} return 'nf'; })()`
  });
  await sleep(1000);

  // Set phone
  await page.send('Runtime.evaluate', {
    expression: `(() => { const ta = document.querySelector('textarea'); const s = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set; s.call(ta, '${SEARCH_PHONE}'); ta.dispatchEvent(new Event('input', {bubbles:true})); })()`
  });
  await sleep(500);

  // Click search
  await page.send('Runtime.evaluate', {
    expression: `(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim() === 'بحث'); if(b){b.click();return 'ok'} return 'nf'; })()`
  });

  // Wait
  await sleep(8000);

  // Get error log bodies
  for (const req of errorReqs) {
    try {
      const body = await page.send('Network.getRequestPostData', { requestId: req.requestId });
      console.log('\n=== ERROR LOG REQUEST BODY ===');
      console.log(body.postData.substring(0, 2000));
    } catch(e) {
      console.log('Could not get error body:', e.message);
    }
  }

  // Also get console errors using Runtime
  const errors = await page.send('Runtime.evaluate', {
    expression: `(() => {
      // Check for the actual error
      const errDiv = document.querySelector('[class*="error"]');
      const bodyText = document.body.innerText;
      return bodyText.substring(bodyText.length - 500);
    })()`
  });
  console.log('Page tail text:', errors.result.value);

  page.close();
  browser.close();
  process.exit(0);
}

main().catch(err => { console.error('Script error:', err.message); process.exit(1); });
