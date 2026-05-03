"""Quick diagnostic for /zukan/preview/investigation/?edit=1 toolbar issue.
Spins up a local HTTP server, opens the page in a headless browser, and
captures console messages, network failures, and DOM state."""

import http.server
import socketserver
import threading
import time
import sys

from playwright.sync_api import sync_playwright

PORT = 8766
Handler = http.server.SimpleHTTPRequestHandler


class QuietHandler(Handler):
    def log_message(self, format, *args):
        # silence default noisy log
        pass


httpd = socketserver.TCPServer(("", PORT), QuietHandler)
t = threading.Thread(target=httpd.serve_forever, daemon=True)
t.start()
print(f"server started on {PORT}", flush=True)

# Test both pages: investigation (broken) and quizland (works)
URLS = {
    "investigation": f"http://localhost:{PORT}/zukan/preview/investigation/?edit=1",
    "quizland": f"http://localhost:{PORT}/quizland/?edit=1",
}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for label, url in URLS.items():
        print(f"\n========== {label}: {url} ==========", flush=True)
        ctx = browser.new_context()
        page = ctx.new_page()
        console_msgs = []
        failed_requests = []
        page.on("console", lambda m: console_msgs.append(f"  [{m.type}] {m.text}"))
        page.on("requestfailed", lambda r: failed_requests.append(f"  FAIL {r.url} -- {r.failure}"))
        page.on("response", lambda r: failed_requests.append(f"  HTTP{r.status} {r.url}") if r.status >= 400 else None)
        try:
            page.goto(url, wait_until="networkidle", timeout=15000)
        except Exception as e:
            print(f"  goto error: {e}", flush=True)
        time.sleep(1.5)
        # Check DOM state
        info = page.evaluate(
            """() => ({
                hasLayoutSystem: !!window.LayoutSystem,
                hasLayoutEditor: !!window.LayoutEditor,
                hasLayoutApplier: !!window.LayoutApplier,
                bodyClasses: document.body.className,
                toolbarPresent: !!document.querySelector('.le-toolbar'),
                fabPresent: !!document.querySelector('#pono-page-nav'),
                pageNavInjected: !!window.__ponoPageNavInjected,
                discoveryPopupShown: (function() {
                    var el = document.querySelector('.discovery-popup');
                    if (!el) return null;
                    return getComputedStyle(el).display;
                })(),
            })"""
        )
        print(f"  hasLayoutSystem  : {info['hasLayoutSystem']}")
        print(f"  hasLayoutApplier : {info['hasLayoutApplier']}")
        print(f"  hasLayoutEditor  : {info['hasLayoutEditor']}")
        print(f"  bodyClasses      : {info['bodyClasses']!r}")
        print(f"  toolbarPresent   : {info['toolbarPresent']}")
        print(f"  fabPresent       : {info['fabPresent']}")
        print(f"  pageNavInjected  : {info['pageNavInjected']}")
        print(f"  discoveryPopup   : {info['discoveryPopupShown']}")
        if console_msgs:
            print("  -- console --")
            for m in console_msgs[:30]:
                print(m)
        if failed_requests:
            print("  -- network failures --")
            for r in failed_requests[:15]:
                print(r)
        ctx.close()
    browser.close()

httpd.shutdown()
print("\ndone")
