#!/usr/bin/env bash
# سكربت القياس القياسي لمراجعة تصميم MaxP — يقرأ rrbo من متصفح التصميم فقط (CDP 9335).
# ⚠️ ممنوع أي تعريف على 9333 أو متصفح المختار الشخصي.
#
# الاستخدام:
#   bash .agents/design/scripts/measure.sh <url> <label> [width] [height]
# مثال:
#   bash .agents/design/scripts/measure.sh "https://maxp.online/orders" "orders" 390 844
#
# المخرجات: JSON على stdout — كل رقم فيه قابل للتحقق.

set -uo pipefail

PORT="${MAXP_DESIGN_CDP_PORT:-9335}"
URL="${1:?الاستخدام: measure.sh <url> <label> [w] [h]}"
LABEL="${2:?الاسم مطلوب}"
W="${3:-390}"
H="${4:-844}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/shots"
mkdir -p "$OUT_DIR"
DATE="$(date +%Y%m%d)"
SHOT_POSIX="$OUT_DIR/${LABEL}-${W}x${H}-${DATE}.png"
# Windows Python can't write to an MSYS path (/h/...) — hand it a native path.
SHOT_WIN="$(cygpath -w "$SHOT_POSIX" 2>/dev/null || printf '%s' "$SHOT_POSIX")"

VER=$(curl -s --max-time 5 "http://127.0.0.1:${PORT}/json/version")
if [ -z "$VER" ]; then
  echo "{\"error\":\"browser_not_running\",\"port\":${PORT}}" >&2
  exit 1
fi

# Parse robustly: the JSON has whitespace after the colon, so a strict grep pattern misses it.
WS=$(printf '%s' "$VER" | python -c 'import sys,json
try:
    print(json.load(sys.stdin).get("webSocketDebuggerUrl",""))
except Exception:
    print("")')
[ -z "$WS" ] && { echo '{"error":"no_ws_url"}' >&2; exit 1; }

python - "$WS" "$URL" "$W" "$H" "$SHOT_WIN" "$SHOT_POSIX" "$LABEL" <<'PY'
import json, sys, base64, time
try:
    import websocket  # pip install websocket-client
except ImportError:
    print(json.dumps({"error":"missing_websocket_client","fix":"python -m pip install websocket-client"}))
    sys.exit(1)

ws_url, url, w, h, shot_win, shot_posix, label = sys.argv[1:8]
ws = websocket.create_connection(ws_url, timeout=30, suppress_origin=True)
_id = [0]

def send(method, params=None, session=None):
    _id[0] += 1
    msg = {"id": _id[0], "method": method, "params": params or {}}
    if session: msg["sessionId"] = session
    ws.send(json.dumps(msg))
    while True:
        resp = json.loads(ws.recv())
        if resp.get("id") == _id[0]:
            if "error" in resp: raise RuntimeError(resp["error"])
            return resp.get("result", {})

t = send("Target.createTarget", {"url": "about:blank"})
tid = t["targetId"]
s = send("Target.attachToTarget", {"targetId": tid, "flatten": True})["sessionId"]

send("Page.enable", {}, s)
send("Runtime.enable", {}, s)
send("Emulation.setDeviceMetricsOverride",
     {"width": int(w), "height": int(h), "deviceScaleFactor": 3, "mobile": True}, s)
send("Page.navigate", {"url": url}, s)
time.sleep(6)

js = r"""(() => {
  const de = document.documentElement;
  function chain(el){let d=0,e=el;while(e&&e!==document.body){const st=getComputedStyle(e);
    if((st.borderRadius!=='0px'||st.boxShadow!=='none')&&st.backgroundColor!=='rgba(0, 0, 0, 0)')d++;
    e=e.parentElement;}return d;}
  const texts=[...document.querySelectorAll('p,td,li,h1,h2,h3,label,span')]
    .filter(x=>x.innerText&&x.innerText.trim().length>30&&x.offsetParent);
  const worst=texts.map(x=>({w:Math.round(x.getBoundingClientRect().width),nest:chain(x),t:x.innerText.trim().slice(0,30)}))
    .sort((a,b)=>a.w-b.w)[0]||null;
  const taps=[...document.querySelectorAll('button,a[href],[role="button"],input,select')]
    .filter(b=>b.offsetParent&&b.getBoundingClientRect().width>0)
    .map(b=>({t:(b.innerText||b.getAttribute('aria-label')||b.type||'').trim().slice(0,24),
              w:Math.round(b.getBoundingClientRect().width),
              h:Math.round(b.getBoundingClientRect().height)}));
  const smallTaps=taps.filter(t=>t.h>0&&t.h<44);
  const inputs=[...document.querySelectorAll('input,select,textarea')]
    .filter(i=>i.offsetParent).map(i=>({fs:getComputedStyle(i).fontSize,t:(i.placeholder||i.type||'').slice(0,18)}));
  return {
    url: location.pathname,
    dir: de.dir,
    viewport: innerWidth,
    scrollWidth: de.scrollWidth,
    overflowPx: de.scrollWidth - innerWidth,
    horizontalScroll: de.scrollWidth > innerWidth,
    font: getComputedStyle(document.body).fontFamily.slice(0,80),
    contentWidthPct: worst ? Math.round(worst.w*100/innerWidth) : null,
    worstNesting: worst ? worst.nest : null,
    worstText: worst ? worst.t : null,
    tapCount: taps.length,
    smallTapCount: smallTaps.length,
    smallTapsSample: smallTaps.slice(0,8),
    inputFontSizes: [...new Set(inputs.map(i=>i.fs))],
    inputsUnder16px: inputs.filter(i=>parseFloat(i.fs)<16).length,
    heading: (document.querySelector('h1')?.innerText||'').slice(0,80)
  };
})()"""

r = send("Runtime.evaluate", {"expression": js, "returnByValue": True}, s)
data = r.get("result", {}).get("value", {})

try:
    shot_res = send("Page.captureScreenshot", {"format": "png"}, s)
    if isinstance(shot_res, dict) and "data" in shot_res:
        with open(shot_win, "wb") as f:
            f.write(base64.b64decode(shot_res["data"]))
        data["screenshot"] = shot_posix.replace("\\", "/")
    else:
        data["screenshot_error"] = str(shot_res)[:200]
except Exception as exc:
    data["screenshot_error"] = str(exc)[:200]

data["label"] = label
data["requested"] = {"url": url, "w": int(w), "h": int(h)}
print(json.dumps(data, ensure_ascii=False, indent=2))

send("Target.closeTarget", {"targetId": tid})
ws.close()
PY
