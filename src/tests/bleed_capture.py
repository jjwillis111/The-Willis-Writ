"""Capture slowed frames of a book opening and closing, with state per frame.
Usage: python3 -I bleed_capture.py <book id> <width> <height> <mobile 0|1> <outdir>
"""
import sys, os, json, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
URL = os.environ.get('URL', 'file://' + ROOT + '/index.html')
K = float(os.environ.get('K', '10'))

STATE_JS = """() => {
  var bk = document.querySelector('.book'); if (!bk) return null;
  var cv = bk.querySelector('.leaf.cover');
  var r = function(e){ if(!e) return null; var b=e.getBoundingClientRect(); return [b.left,b.top,b.width,b.height]; };
  return { cls: bk.className, cover: cv ? getComputedStyle(cv).transform : null, bl: bk.querySelector('.bd.bl') ? getComputedStyle(bk.querySelector('.bd.bl')).transform : null,
           book: r(bk), t: performance.now() };
}"""

def run(book, w, h, mobile, outdir):
    os.makedirs(outdir, exist_ok=True)
    log = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--allow-file-access-from-files'])
        ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if mobile else 1, has_touch=mobile, is_mobile=mobile)
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.route('**/fonts.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='text/css', body=''))
        pg.route('**/fonts.gstatic.com/**', lambda r: r.abort())
        pg.add_init_script('window.__K=%s' % K)
        pg.goto(URL, wait_until='domcontentloaded'); pg.wait_for_timeout(2500)
        sel = '.hot-book[data-id="%s"]' % book
        pg.click(sel)
        # opening: sample until the book exists and the first spread has landed
        t0 = time.time(); i = 0
        def snap(tag):
            nonlocal i
            st = pg.evaluate(STATE_JS)
            pg.screenshot(path='%s/%s_%03d.png' % (outdir, tag, i))
            log.append({'i': i, 'tag': tag, 'state': st}); i += 1
        while time.time() - t0 < (1450 + 300 + 1150 + 600) * K / 1000.0:
            if pg.evaluate("!!document.querySelector('.book')"): snap('open')
            else: pg.wait_for_timeout(40)
        pg.wait_for_timeout(500)
        pg.keyboard.press('Escape')
        t0 = time.time()
        while time.time() - t0 < (1300 + 900 + 600) * K / 1000.0:
            snap('close')
        print(book, w, h, 'frames', i, 'errors', errs)
        b.close()
    json.dump(log, open(outdir + '/log.json', 'w'))

if __name__ == '__main__':
    book, w, h, mobile, outdir = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4] == '1', sys.argv[5]
    run(book, w, h, mobile, outdir)
