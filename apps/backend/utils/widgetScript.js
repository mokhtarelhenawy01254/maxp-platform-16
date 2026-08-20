(function () {
  // MaxP Web Chat Widget
  // Usage:
  //   <script src="https://<domain>/api/v1/public/widget/script.js"
  //           data-widget-key="widget-key-here" async></script>
  // Optional: data-theme-color="#hex", data-title="Support", data-placeholder="...", data-position="left|right"
  var s = document.currentScript ||
    document.querySelector('script[data-widget-key][src*="/widget/script.js"]') ||
    document.querySelector('script[data-widget-key]');
  if (!s) return;
  var widgetKey = s.getAttribute('data-widget-key');
  if (!widgetKey) return;

  // Base API origin = this script's origin
  var base = (function () {
    var src = s.src || '';
    try { return new URL(src).origin; } catch (e) { return window.location.origin; }
  })();

  var themeColor = s.getAttribute('data-theme-color') || '#2563eb';
  var title = s.getAttribute('data-title') || (window.EN && window.EN.appName) || 'Need help?';
  var placeholder = s.getAttribute('data-placeholder') || 'Type a message...';
  var position = s.getAttribute('data-position') === 'left' ? 'left' : 'right';

  // Stable per-browser visitor id so each visitor keeps their own conversation
  var VK = 'mpw-vid-' + widgetKey;
  var visitorId = '';
  try { visitorId = localStorage.getItem(VK) || ''; } catch (e) {}
  function saveVid(v) { if (v && v !== visitorId) { visitorId = v; try { localStorage.setItem(VK, v); } catch (e) {} } }

  // Persisted thread id so a reload keeps the same conversation.
  var TK = 'mpw-thread-' + widgetKey;
  var threadId = '';
  try { threadId = localStorage.getItem(TK) || ''; } catch (e) {}
  function saveThreadId(t) { if (t && t !== threadId) { threadId = t; try { localStorage.setItem(TK, t); } catch (e) {} } }

  var pendingKey = 'mpw-pending-' + widgetKey;
  var pending = null;
  try {
    var stored = JSON.parse(sessionStorage.getItem(pendingKey) || 'null');
    if (stored && typeof stored.text === 'string') pending = stored;
  } catch (e) {}

  function requestId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  function savePending(p) { pending = p; try { sessionStorage.setItem(pendingKey, JSON.stringify(p)); } catch (e) {} }
  function clearPending(id) { if (pending && pending.requestId === id) { pending = null; try { sessionStorage.removeItem(pendingKey); } catch (e) {} } }

  // ── Build the widget DOM ──────────────────────────────────────────────
  var btn = document.createElement('button');
  btn.id = 'mpw-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', title);
  btn.setAttribute('aria-expanded', 'false');
  btn.style.cssText = 'position:fixed;bottom:24px;' + position + ':24px;width:56px;height:56px;border:none;border-radius:50%;background:' + themeColor + ';color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.3);z-index:99999;font-size:24px';
  btn.textContent = '\uD83D\uDCAC';
  document.body.appendChild(btn);

  var chat = document.createElement('div');
  chat.id = 'mpw-chat';
  chat.setAttribute('role', 'dialog');
  chat.setAttribute('aria-modal', 'false');
  chat.style.cssText = 'position:fixed;bottom:92px;' + position + ':24px;width:380px;max-width:calc(100vw - 48px);height:520px;max-height:calc(100dvh - 120px);border-radius:16px;background:#fff;border:1px solid #e5e7eb;display:none;flex-direction:column;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.15);z-index:99999;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
  var header = document.createElement('div');
  header.style.cssText = 'padding:16px;background:' + themeColor + ';color:#fff;font-weight:700;font-size:14px';
  header.textContent = title;
  chat.appendChild(header);

  var msgs = document.createElement('div');
  msgs.setAttribute('role', 'log');
  msgs.setAttribute('aria-live', 'polite');
  msgs.style.cssText = 'flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px';
  chat.appendChild(msgs);

  var form = document.createElement('form');
  form.style.cssText = 'display:flex;border-top:1px solid #e5e7eb;padding:8px;gap:8px';
  var input = document.createElement('input');
  input.placeholder = placeholder;
  input.style.cssText = 'flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:8px 12px;font-size:14px;outline:none';
  input.maxLength = 4000;
  var sendBtn = document.createElement('button');
  sendBtn.type = 'submit';
  sendBtn.style.cssText = 'background:' + themeColor + ';color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:14px';
  sendBtn.textContent = 'Send';
  form.appendChild(input);
  form.appendChild(sendBtn);
  chat.appendChild(form);
  document.body.appendChild(chat);

  function setOpen(open) {
    chat.style.display = open ? 'flex' : 'none';
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) window.setTimeout(function () { input.focus(); }, 0);
  }
  btn.addEventListener('click', function () { setOpen(chat.style.display === 'none'); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && chat.style.display !== 'none') setOpen(false);
  });

  function bubble(side, bg, color, txt) {
    var x = document.createElement('div');
    x.style.cssText = 'align-self:' + side + ';background:' + bg + ';color:' + color + ';padding:8px 12px;border-radius:12px;font-size:14px;max-width:80%;white-space:pre-wrap;word-break:break-word';
    x.textContent = txt;
    msgs.appendChild(x);
    msgs.scrollTop = msgs.scrollHeight;
    return x;
  }

  var sending = false;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = input.value.trim();
    if (!t || sending) return;
    var reuse = !!(pending && pending.text === t);
    var newRequestId = reuse ? '' : requestId();
    if (!reuse && !newRequestId) { bubble('flex-start', '#f3f4f6', '#000', 'Sorry, something went wrong.'); return; }
    var req = reuse ? pending : { requestId: newRequestId, text: t };
    if (!reuse) savePending(req);
    var userBubble = bubble('flex-end', themeColor, '#fff', t);
    var replyBubble = bubble('flex-start', '#f3f4f6', '#9ca3af', '...');
    input.value = '';
    sending = true;
    input.disabled = true;
    sendBtn.disabled = true;

    var payload = JSON.stringify({
      widgetKey: widgetKey,
      requestId: req.requestId,
      visitorId: visitorId || undefined,
      threadId: threadId || undefined,
      message: t,
    });

    function finish() { sending = false; input.disabled = false; sendBtn.disabled = false; input.focus(); }

    function attemptSend(attempt) {
      fetch(base + '/api/v1/public/widget/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      })
        .then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }).catch(function () { return { status: r.status, data: {} }; }); })
        .then(function (res) {
          if (res.data && res.data.visitorId) saveVid(res.data.visitorId);
          if (res.data && res.data.threadId) saveThreadId(res.data.threadId);
          var retryable = res.status >= 500;
          if (retryable && attempt < 3) { setTimeout(function () { attemptSend(attempt + 1); }, [500, 1500, 3500][attempt]); return; }
          var txt = (res.data && res.data.reply) ? res.data.reply : 'Sorry, something went wrong. Try again in a moment.';
          replyBubble.style.color = '#000';
          replyBubble.textContent = txt;
          msgs.scrollTop = msgs.scrollHeight;
          clearPending(req.requestId);
          finish();
        })
        .catch(function () {
          if (attempt < 3) { setTimeout(function () { attemptSend(attempt + 1); }, [500, 1500, 3500][attempt]); return; }
          replyBubble.style.color = '#000';
          replyBubble.textContent = 'Sorry, something went wrong. Try again in a moment.';
          finish();
        });
    }
    attemptSend(0);
  });

  // Recover a pending message on reload
  if (pending) {
    setTimeout(function () {
      bubble('flex-end', themeColor, '#fff', pending.text);
      var rb = bubble('flex-start', '#f3f4f6', '#9ca3af', '...');
      var t = pending.text;
      var req = pending;
      var payload = JSON.stringify({ widgetKey: widgetKey, requestId: req.requestId, visitorId: visitorId || undefined, threadId: threadId || undefined, message: t });
      fetch(base + '/api/v1/public/widget/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload,
      })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (d) {
          if (d && d.visitorId) saveVid(d.visitorId);
          if (d && d.threadId) saveThreadId(d.threadId);
          rb.style.color = '#000';
          rb.textContent = (d && d.reply) ? d.reply : 'Sorry, something went wrong.';
          clearPending(req.requestId);
        })
        .catch(function () {
          rb.style.color = '#000';
          rb.textContent = 'Sorry, something went wrong.';
          clearPending(req.requestId);
        });
    }, 300);
  }
})();
