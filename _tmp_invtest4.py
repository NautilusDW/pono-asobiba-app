"""Throttled load - capture network + console + state."""

import http.server
import socketserver
import threading
import time

from playwright.sync_api import sync_playwright

PORT = 8769


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


httpd = socketserver.TCPServer(("", PORT), QuietHandler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()

URL = f"http://localhost:{PORT}/zukan/preview/investigation/?edit=1"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context()
    page = ctx.new_page()
    cdp = ctx.new_cdp_session(page)
    cdp.send("Network.enable")
    cdp.send("Network.emulateNetworkConditions", {
        "offline": False,
        "downloadThroughput": 50 * 1024,
        "uploadThroughput": 50 * 1024,
        "latency": 200,
    })

    requests = []
    page.on("request", lambda r: requests.append(("REQ", r.url, r.resource_type)))
    page.on("response", lambda r: requests.append(("RES", r.status, r.url)))
    page.on("requestfailed", lambda r: requests.append(("FAIL", r.url, r.failure)))

    msgs = []
    page.on("console", lambda m: msgs.append((m.type, m.text)))
    page.on("pageerror", lambda e: msgs.append(("pageerror", str(e))))

    try:
        page.goto(URL, wait_until="domcontentloaded", timeout=60000)
    except Exception as e:
        print(f"goto error: {e}")
    # wait a long time
    time.sleep(20)

    info = page.evaluate(
        """() => ({
            hasLayoutSystem: !!window.LayoutSystem,
            hasLayoutEditor: !!window.LayoutEditor,
            hasLayoutApplier: !!window.LayoutApplier,
            bodyClasses: document.body.className,
            toolbarPresent: !!document.querySelector('.le-toolbar'),
            fabPresent: !!document.querySelector('#pono-page-nav'),
            currentLayoutData: !!window._currentLayoutData,
        })"""
    )
    print("State:", info)
    print("\n-- requests --")
    for r in requests:
        print(r)
    print("\n-- console --")
    for m in msgs:
        print(m)
    ctx.close()
    browser.close()
httpd.shutdown()
