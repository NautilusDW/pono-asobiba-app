"""Check timing of toolbar appearance.
Simulates a slow / quirky load: domcontentloaded only, then poll."""

import http.server
import socketserver
import threading
import time

from playwright.sync_api import sync_playwright

PORT = 8767


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


httpd = socketserver.TCPServer(("", PORT), QuietHandler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()

URL = f"http://localhost:{PORT}/zukan/preview/investigation/?edit=1"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(
        # Throttle CPU + network to reveal timing-sensitive bugs
    )
    page = ctx.new_page()
    cdp = ctx.new_cdp_session(page)
    cdp.send("Network.enable")
    cdp.send("Network.emulateNetworkConditions", {
        "offline": False,
        "downloadThroughput": 50 * 1024,  # 50 KB/s
        "uploadThroughput": 50 * 1024,
        "latency": 200,
    })
    msgs = []
    page.on("console", lambda m: msgs.append(f"[{m.type}] {m.text}"))
    failed = []
    page.on("requestfailed", lambda r: failed.append(f"FAIL {r.url} -- {r.failure}"))
    page.on("response", lambda r: failed.append(f"HTTP{r.status} {r.url}") if r.status >= 400 else None)

    page.goto(URL, wait_until="domcontentloaded", timeout=30000)
    # Probe at different times
    for delay_ms in (0, 500, 1500, 3000, 5000, 8000):
        time.sleep(delay_ms / 1000.0 if delay_ms > 0 else 0.05)
        info = page.evaluate(
            """() => ({
                hasLayoutSystem: !!window.LayoutSystem,
                hasLayoutEditor: !!window.LayoutEditor,
                hasLayoutApplier: !!window.LayoutApplier,
                bodyClasses: document.body.className,
                toolbarPresent: !!document.querySelector('.le-toolbar'),
                fabPresent: !!document.querySelector('#pono-page-nav'),
            })"""
        )
        print(f"t={delay_ms}ms  LS={info['hasLayoutSystem']} LA={info['hasLayoutApplier']} LE={info['hasLayoutEditor']} tb={info['toolbarPresent']} fab={info['fabPresent']} body={info['bodyClasses']!r}")
    print("\n-- console --")
    for m in msgs:
        print(m)
    print("\n-- failed --")
    for r in failed:
        print(r)
    ctx.close()
    browser.close()
httpd.shutdown()
