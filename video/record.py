#!/usr/bin/env python3
"""Record the CheckoutGuard demo: drive the real store and dashboard in headless Chrome and keep every frame.

usage: python3 -I video/record.py WORK_DIR [shot ...]   (CG_START_URL=... to open a page first)

Needs the store on :4300 and the dashboard on :3100. The test, repair and rerun shots run Kane CLI and Claude Code
for real (Kane credits are spent). While Kane or the agent works, frames are taken less often and an on-screen
badge shows the real time elapsed, so the sped-up parts are labelled in the video. Approving merges the repair
into the local main branch; build.sh's caller undoes that afterwards to keep the demo bugs seeded.

Writes WORK_DIR/frames/NNNNNN.jpg and WORK_DIR/takes.json: each frame's time, and each shot's real-time and
time-lapse segments, for build.py to cut against the narration.
"""
import base64
import os
import json
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from devtools import CHROME, DevTools  # noqa: E402

SITE, STORE = "http://127.0.0.1:3100", "http://127.0.0.1:4300"
W, H = 1440, 810

# Injected into every page: a visible pointer, a time-lapse badge, no intro prompt, and confirm() always yes.
PAGE_JS = r"""
(() => {
  try { localStorage.setItem('cg-intro-seen', '1'); } catch {}
  window.confirm = () => true;
  const css = `
    #__cur { position: fixed; z-index: 2147483647; left: 0; top: 0; width: 26px; height: 26px; pointer-events: none;
             transition: transform .9s cubic-bezier(.3,.7,.2,1); }
    #__cur svg { width: 26px; height: 26px; filter: drop-shadow(0 2px 6px rgba(0,0,0,.55)); }
    #__cur.ping::after { content: ''; position: absolute; left: -16px; top: -16px; width: 32px; height: 32px; border-radius: 50%;
             border: 2px solid #fff; box-shadow: 0 0 0 2px rgba(0,0,0,.35); animation: __ping .55s ease-out forwards; }
    @keyframes __ping { from { transform: scale(.3); opacity: 1 } to { transform: scale(1.7); opacity: 0 } }
    #__lapse { position: fixed; z-index: 2147483646; left: 50%; bottom: 28px; transform: translateX(-50%); display: flex; gap: 10px;
             align-items: center; padding: 10px 18px; border-radius: 999px; background: rgba(0,0,0,.82); color: #fff;
             border: 1px solid rgba(255,255,255,.3); font: 600 15px/1 Geist, Inter, system-ui, sans-serif; letter-spacing: .01em;
             box-shadow: 0 10px 40px rgba(0,0,0,.6); }
    #__lapse b { font-family: 'Geist Mono', ui-monospace, monospace; font-weight: 500; }`;
  const boot = () => {
    if (document.getElementById('__cur')) return;
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    const c = document.createElement('div'); c.id = '__cur';
    c.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 2.5l14 8.2-6.3 1.7-3.3 6.1z" fill="#fff" stroke="#111" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    document.body.appendChild(c);
    const p = JSON.parse(sessionStorage.getItem('__cp') || '[1100,640]');
    c.style.transition = 'none'; c.style.transform = `translate(${p[0]}px,${p[1]}px)`;
    requestAnimationFrame(() => requestAnimationFrame(() => { c.style.transition = ''; }));
    const l = JSON.parse(sessionStorage.getItem('__lapse') || 'null');
    if (l) window.__lapse(l.label, l.start);
  };
  window.__move = (x, y) => { const c = document.getElementById('__cur'); if (c) c.style.transform = `translate(${x}px,${y}px)`; sessionStorage.setItem('__cp', JSON.stringify([x, y])); };
  window.__ping = () => { const c = document.getElementById('__cur'); if (!c) return; c.classList.remove('ping'); void c.offsetWidth; c.classList.add('ping'); };
  window.__lapse = (label, start) => {
    start = start || Date.now(); sessionStorage.setItem('__lapse', JSON.stringify({ label, start }));
    let b = document.getElementById('__lapse');
    if (!b) { b = document.createElement('div'); b.id = '__lapse'; document.body.appendChild(b); }
    const tick = () => { const s = Math.floor((Date.now() - start) / 1000); b.innerHTML = `⏩ Sped up · ${label} · <b>${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</b> real time`; };
    tick(); clearInterval(window.__lt); window.__lt = setInterval(tick, 250);
  };
  window.__unlapse = () => { sessionStorage.removeItem('__lapse'); clearInterval(window.__lt); document.getElementById('__lapse')?.remove(); };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else boot();
})();
"""


class Client:
    """DevTools over one WebSocket with a reader thread: calls wait for their own reply, events go to handlers.

    The plain client in devtools.py drops events, and screencast frames arrive as events."""

    def __init__(self, ws_url):
        self.dt = DevTools(ws_url)
        self.send_lock, self.waiting, self.handlers = threading.Lock(), {}, {}
        threading.Thread(target=self._read, daemon=True).start()

    def _read(self):
        while True:
            try:
                msg = self.dt._recv_message()
            except (ConnectionError, OSError):
                return
            if "id" in msg and msg["id"] in self.waiting:
                box = self.waiting.pop(msg["id"])
                box["msg"] = msg
                box["done"].set()
            elif msg.get("method") in self.handlers:
                self.handlers[msg["method"]](msg["params"])

    def send(self, method, **params):
        """Fire and forget (used from the reader thread, which can't wait for its own replies)."""
        with self.send_lock:
            self.dt.next_id += 1
            self._write({"id": self.dt.next_id, "method": method, "params": params})

    def call(self, method, timeout=120, **params):
        box = {"done": threading.Event()}
        with self.send_lock:
            self.dt.next_id += 1
            self.waiting[self.dt.next_id] = box
            self._write({"id": self.dt.next_id, "method": method, "params": params})
        if not box["done"].wait(timeout):
            raise RuntimeError(f"{method}: no reply")
        if "error" in box["msg"]:
            raise RuntimeError(box["msg"]["error"])
        return box["msg"]["result"]

    def _write(self, obj):
        payload = json.dumps(obj).encode()
        mask = os.urandom(4)
        n = len(payload)
        header = bytes([0x81]) + (bytes([0x80 | n]) if n < 126 else bytes([0x80 | 126]) + n.to_bytes(2, "big") if n < 65536 else bytes([0x80 | 127]) + n.to_bytes(8, "big"))
        self.dt.sock.sendall(header + mask + bytes(c ^ mask[i % 4] for i, c in enumerate(payload)))


class Recorder:
    def __init__(self, work):
        self.work = work
        (work / "frames").mkdir(parents=True, exist_ok=True)
        self.frames, self.shots = [], []
        self.fps = 30
        self.on = True
        self.t0 = time.time()

    def now(self):
        return time.time() - self.t0

    def on_frame(self, client, params):
        """A screencast frame: keep it with its time, and ack it so Chrome sends the next."""
        client.send("Page.screencastFrameAck", sessionId=params["sessionId"])
        t = self.now()
        if self.frames and t - self.frames[-1][1] < 1 / self.fps:
            return
        n = len(self.frames) + 1
        (self.work / "frames" / f"{n:06d}.jpg").write_bytes(base64.b64decode(params["data"]))
        self.frames.append((n, round(t, 3)))

    # shot bookkeeping: a shot is a list of segments, each real-time or time-lapse
    def begin(self, shot):
        self.shots.append({"id": shot, "segments": [{"mode": "real", "start": self.now()}]})
        print(f"[{self.now():6.1f}s] {shot}", flush=True)

    def mode(self, mode):
        seg = self.shots[-1]["segments"]
        seg[-1]["end"] = self.now()
        seg.append({"mode": mode, "start": self.now()})
        self.fps = 3 if mode == "lapse" else 30

    def end(self):
        self.shots[-1]["segments"][-1]["end"] = self.now()

    def save(self):
        (self.work / "takes.json").write_text(json.dumps({"frames": self.frames, "shots": self.shots}, indent=0))


def main():
    work = Path(sys.argv[1])
    only = set(sys.argv[2:])
    rec = Recorder(work)

    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    chrome = subprocess.Popen([CHROME, "--headless=new", "--enable-gpu", "--use-angle=metal", "--hide-scrollbars", "--mute-audio",
                               "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
                               f"--remote-debugging-port={port}", "--user-data-dir=" + tempfile.mkdtemp(), f"--window-size={W},{H}", "about:blank"],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(100):
            try:
                page = next(t for t in json.loads(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list").read()) if t["type"] == "page")
                break
            except (OSError, StopIteration):
                time.sleep(0.1)
        ctl = Client(page["webSocketDebuggerUrl"])
        ctl.call("Page.enable")
        # Screencast frames come out at the layout size (1440x810) whatever the scale; encode.swift scales them to 1080p.
        ctl.call("Emulation.setDeviceMetricsOverride", width=W, height=H, deviceScaleFactor=1, mobile=False)
        ctl.call("Emulation.setEmulatedMedia", features=[{"name": "prefers-color-scheme", "value": "dark"}])
        ctl.call("Page.addScriptToEvaluateOnNewDocument", source=PAGE_JS)

        def js(expr):
            r = ctl.call("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=True)
            if "exceptionDetails" in r:
                raise RuntimeError(r["exceptionDetails"].get("exception", {}).get("description", r["exceptionDetails"]))
            return r["result"].get("value")

        def go(url, settle=2.5):
            ctl.call("Page.navigate", url=url)
            time.sleep(settle)

        def wait(cond, timeout, every=1.0):
            end = time.time() + timeout
            while time.time() < end:
                try:
                    if js(cond):
                        return True
                except RuntimeError:
                    pass
                time.sleep(every)
            raise SystemExit(f"timed out waiting for: {cond}")

        def el(find):
            """A JS expression for an element: CSS selector, or ('text', words) for a visible button/link with that text."""
            if isinstance(find, tuple):
                return f"[...document.querySelectorAll('button,a')].find(e => e.offsetParent && e.textContent.includes({json.dumps(find[1])}))"
            return f"document.querySelector({json.dumps(find)})"

        def point(find, block="center", pause=1.1):
            js(f"(() => {{ const e = {el(find)}; e.scrollIntoView({{ block: '{block}', behavior: 'smooth' }}); }})()")
            time.sleep(0.9)
            js(f"(() => {{ const r = ({el(find)}).getBoundingClientRect(); __move(r.left + Math.min(r.width / 2, 120), r.top + r.height / 2); }})()")
            time.sleep(pause)

        def click(find, block="center"):
            point(find, block)
            js(f"__ping(); ({el(find)}).click()")
            time.sleep(0.6)

        def scroll_to(find, block="start", hold=0.0):
            js(f"({el(find)}).scrollIntoView({{ block: '{block}', behavior: 'smooth' }})")
            time.sleep(1.2 + hold)

        def scroll_by(dy, hold=0.0):
            js(f"window.scrollBy({{ top: {dy}, behavior: 'smooth' }})")
            time.sleep(1.2 + hold)

        def move(x, y, hold=1.0):
            js(f"__move({x}, {y})")
            time.sleep(hold)

        ctl.handlers["Page.screencastFrame"] = lambda p: rec.on_frame(ctl, p)
        ctl.call("Page.startScreencast", format="jpeg", quality=86, maxWidth=1920, maxHeight=1080, everyNthFrame=1)
        want = lambda s: not only or s in only
        if os.environ.get("CG_START_URL"):  # pick up part-way, e.g. on a failed run's page for another repair attempt
            go(os.environ["CG_START_URL"], 3)
        state = {}

        if want("title"):
            go(SITE + "/", 0.3)
            rec.begin("title"); move(980, 560, 4); move(760, 640, 6); move(1040, 520, 6); rec.end()
        if want("what"):
            if ":3100/" not in js("location.href"):
                go(SITE + "/", 1)
            rec.begin("what")
            scroll_to("#what", hold=4.5); scroll_to("#how", hold=5.5); scroll_by(420, hold=5)
            rec.end()
        if want("store"):
            go(STORE + "/", 0.5)
            rec.begin("store")
            time.sleep(1.5)
            mug = "[...document.querySelectorAll('[data-testid^=product-]')].find(c => c.textContent.includes('Ceramic Mug')).querySelector('button')"
            js(f"(() => {{ const r = ({mug}).getBoundingClientRect(); __move(r.left + r.width / 2, r.top + r.height / 2); }})()"); time.sleep(1.3)
            js(f"__ping(); ({mug}).click()"); time.sleep(2.2)
            if "cart" not in js("location.pathname"):
                click("[data-testid=cart-link]"); time.sleep(1.6)
            qty = "input[name=qty]"
            point(qty, pause=0.8)
            js(f"(() => {{ const q = {el(qty)}; q.focus(); q.select(); }})()"); time.sleep(0.5)
            js(f"(() => {{ const q = {el(qty)}; q.value = '3'; q.dispatchEvent(new Event('input', {{ bubbles: true }})); }})()"); time.sleep(0.9)
            click(("text", "Update")); time.sleep(2.0)
            js("(() => { const r = document.querySelector('[data-testid=subtotal]').getBoundingClientRect(); __move(r.left - 46, r.top + r.height / 2 - 4); })()")
            time.sleep(5)
            move(1250, 300, 3.5)
            rec.end()
        if want("dashboard"):
            go(SITE + "/app", 0.5)
            rec.begin("dashboard")
            move(700, 300, 4.5)
            scroll_by(380, hold=3.5)
            scroll_to(("text", "Test again"), block="center", hold=4.5)
            rec.end()
        if want("test"):
            rec.begin("test")
            card = "[...document.querySelectorAll('article')].find(a => a.textContent.includes('Cart total'))"
            btn = f"[...({card}).querySelectorAll('button')].find(b => b.textContent.includes('Test'))"
            js(f"({btn}).scrollIntoView({{ block: 'center', behavior: 'smooth' }})"); time.sleep(1)
            js(f"(() => {{ const r = ({btn}).getBoundingClientRect(); __move(r.left + r.width / 2, r.top + r.height / 2); }})()"); time.sleep(1.2)
            js(f"__ping(); ({btn}).click()")
            wait(f"({card}).textContent.includes('Running')", 30, 0.5); time.sleep(1.2)
            link = f"[...({card}).querySelectorAll('a')].find(a => a.textContent.includes('evidence'))"
            js(f"(() => {{ const r = ({link}).getBoundingClientRect(); __move(r.left + r.width / 2, r.top + r.height / 2); }})()"); time.sleep(1.2)
            js(f"__ping(); ({link}).click()"); time.sleep(2.5)
            state["run"] = js("location.pathname")
            move(900, 420, 2.5)
            rec.mode("lapse"); js("__lapse('Kane CLI is testing the cart journey')")
            wait("!document.body.innerText.includes('Running')", 900, 2)
            time.sleep(2); js("__unlapse()")
            rec.mode("real"); time.sleep(1.5); rec.end()
        if want("found"):
            rec.begin("found")
            bad = "[...document.querySelectorAll('section li')].filter(l => l.textContent.includes('Expected')).pop()"
            js(f"({bad}).scrollIntoView({{ block: 'center', behavior: 'smooth' }})"); time.sleep(1.2)
            js(f"(() => {{ const r = ({bad}).getBoundingClientRect(); __move(r.left + 140, r.top + 30); }})()"); time.sleep(8)
            rec.end()
        if want("evidence"):
            rec.begin("evidence")
            js("window.scrollTo({ top: 0, behavior: 'smooth' })"); time.sleep(1.5)
            point("section img", pause=3.5)
            move(420, 380, 4)
            rec.end()
        if want("repair"):
            rec.begin("repair")
            click(("text", "Start repair attempt")); time.sleep(3)
            wait("location.pathname.startsWith('/repairs/')", 30, 0.5); time.sleep(1.5)
            state["repair"] = js("location.pathname")
            move(500, 420, 3)
            rec.mode("lapse"); js("__lapse('Claude Code is writing the fix')")
            wait("!document.body.innerText.includes('No changes.') || /Agent failed|Rejected/.test(document.body.innerText)", 900, 2)
            time.sleep(1); js("__unlapse()")
            rec.mode("real"); time.sleep(1); rec.end()
        if want("patch"):
            rec.begin("patch")
            diff = "[...document.querySelectorAll('pre div')].find(d => d.textContent.includes('qty'))"
            js(f"({diff}).scrollIntoView({{ block: 'center', behavior: 'smooth' }})"); time.sleep(1.2)
            js(f"(() => {{ const r = ({diff}).getBoundingClientRect(); __move(r.left + 260, r.top + r.height / 2); }})()"); time.sleep(6)
            js("window.scrollTo({ top: 0, behavior: 'smooth' })"); time.sleep(1.2)
            unit = "[...document.querySelectorAll('ol li')].find(l => l.textContent.includes('Unit checks'))"
            js(f"(() => {{ const r = ({unit}).getBoundingClientRect(); __move(r.left + 200, r.top + 30); }})()"); time.sleep(5)
            rec.end()
        if want("rerun"):
            rec.begin("rerun")
            rerun = "[...document.querySelectorAll('ol li')].find(l => l.textContent.includes('Same journey rerun'))"
            js(f"(() => {{ const r = ({rerun}).getBoundingClientRect(); __move(r.left + 200, r.top + 30); }})()"); time.sleep(2.5)
            done = "/Verified by a second run|Retest failed|Unit checks failed|Not verified/.test(document.body.innerText)"
            if not js(done):
                rec.mode("lapse"); js("__lapse('Kane CLI is rerunning the same journey')")
                wait(done, 900, 2)
                time.sleep(1); js("__unlapse()")
                rec.mode("real")
            state["verified"] = js("document.body.innerText.includes('Verified by a second run')")
            v = "[...document.querySelectorAll('section')].find(s => s.textContent.includes('Verified by a second run') || s.textContent.includes('Not verified'))"
            js(f"({v}).scrollIntoView({{ block: 'center', behavior: 'smooth' }})"); time.sleep(1.2)
            js(f"(() => {{ const r = ({v}).getBoundingClientRect(); __move(r.left + 220, r.top + 30); }})()"); time.sleep(4)
            rec.end()
            if not state["verified"]:
                rec.save(); raise SystemExit("The repair was not verified; stopping before review and approve.")
        if want("review"):
            rec.begin("review")
            scroll_to("pre", block="center", hold=3)
            shots = "[...document.querySelectorAll('section')].find(s => s.textContent.includes('Before') && s.textContent.includes('After'))"
            js(f"({shots}).scrollIntoView({{ block: 'center', behavior: 'smooth' }})"); time.sleep(1.2)
            js(f"(() => {{ const r = ({shots}).getBoundingClientRect(); __move(r.left + r.width * 0.25, r.top + r.height / 2); }})()"); time.sleep(2.5)
            js(f"(() => {{ const r = ({shots}).getBoundingClientRect(); __move(r.left + r.width * 0.75, r.top + r.height / 2); }})()"); time.sleep(2.5)
            js("window.scrollTo({ top: 0, behavior: 'smooth' })"); time.sleep(1.2)
            point(("text", "Report"), pause=3)
            rec.end()
        if want("approve"):
            rec.begin("approve")
            click(("text", "Approve and merge")); time.sleep(1)
            wait("document.body.innerText.includes('Merged')", 30, 0.5)
            js("window.scrollTo({ top: 0, behavior: 'smooth' })"); time.sleep(1.2)
            merged = "[...document.querySelectorAll('ol li')].find(l => l.textContent.includes('Merged after approval'))"
            js(f"(() => {{ const e = {merged}; if (!e) return; const r = e.getBoundingClientRect(); __move(r.left + 220, r.top + 30); }})()"); time.sleep(3.5)
            rec.end()
        if want("close"):
            go(SITE + "/", 0.3)
            js("document.querySelector('#provide').scrollIntoView({ block: 'start' })"); time.sleep(0.6)
            rec.begin("close")
            time.sleep(5)
            scroll_by(900, hold=2)
            js("window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })"); time.sleep(1.5)
            js("[...document.querySelectorAll('section')].find(s => s.textContent.includes('Ship checkouts that work')).scrollIntoView({ block: 'center', behavior: 'smooth' })")
            time.sleep(7)
            rec.end()
        print("state:", json.dumps(state), flush=True)
    finally:
        rec.on = False
        try:
            ctl.call("Page.stopScreencast", timeout=5)
        except Exception:
            pass
        rec.save()
        chrome.terminate()
        print(f"{len(rec.frames)} frames in {rec.now():.0f}s", flush=True)


if __name__ == "__main__":
    main()
