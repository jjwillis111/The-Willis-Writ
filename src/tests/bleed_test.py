"""Pixel-level regression test for page paper bleeding around a book cover while it opens or closes.

One screenshot per frame with all animation slowed by K (window.__K). At the same instant the DOM gives
  cover : the projected box of the cover leaf (3D transform included)
  base  : the page block under the cover
Zones (CSS px):
  legit   x in (cover right edge, page right edge], within the page's height: the strip of page the turning
          cover has really uncovered. Paper is allowed here.
  interior the cover's own box shrunk by RING px: the artwork, its foil lines, never counted.
  anything else around the book (top and bottom edges, rounded corner notches, the spine side, beyond the
          page block's right edge) must not show paper.
Paper is recognised by colour (warm, low saturation, light). Only frames where the cover is within MAXANG
degrees of flat are judged, since that is where the artifact shows.

Usage: python3 -I bleed_test.py [--books about,...] [--vp desk,phone,...|all] [--save DIR]
Exit code 1 if any frame has more than TOL_PX bleed pixels.
"""
import sys, os, io, time, argparse, math
import numpy as np
from PIL import Image
from scipy import ndimage
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from anglelib import cover_angle

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
URL = os.environ.get('URL', 'file://' + ROOT + '/index.html')
K = float(os.environ.get('K', '20'))
MAXANG = float(os.environ.get('MAXANG', '8'))
TOL_PX = int(os.environ.get('TOL_PX', '3'))

GEOM = """() => {
  var bk = document.querySelector('.book'); if (!bk) return null;
  var cv = bk.querySelector('.leaf.cover'), base = bk.querySelector('.base');
  var r = function(e){ var b=e.getBoundingClientRect(); return [b.left,b.top,b.right,b.bottom]; };
  return { cls: bk.className, cover: getComputedStyle(cv).transform, cbox: r(cv), base: r(base), book: r(bk) };
}"""
VPS = {'desk': (1440, 810, False), 'wide': (1920, 1080, False), 'tablet': (1024, 768, False), 'phone': (390, 844, True)}

def paper(a):
    """Light, low-saturation warm pixels, kept only where they form a patch at least 3x3 px. Gilt edging, brass
    bands and leather are far more saturated or darker, and their stray highlights are thinner than 3 px.
    Calibrated on captured frames: 0 px on every sealed frame, about 100 px on the frames that showed the bug."""
    r, g, b = a[:, :, 0].astype(int), a[:, :, 1].astype(int), a[:, :, 2].astype(int)
    m = (r >= 150) & (r >= g) & (g >= b) & (r - b >= 8) & ((r - b) <= 0.27 * r)
    return ndimage.binary_opening(m, structure=np.ones((3, 3), bool))

_ART = {}
def art_alpha(book):
    if book not in _ART:
        _ART[book] = Image.open(os.path.join(ROOT, 'cover-%s.webp' % book)).convert('RGBA')
    return _ART[book]

def judge(png, g, ox, oy, book, ang):
    a = np.array(Image.open(io.BytesIO(png)).convert('RGB'))
    H, W = a.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]; xx = xx + ox; yy = yy + oy
    cl, ct, cr, cb = g['cbox']; bl, bt, br, bb = g['base']
    # the cover's own artwork: its real outline (alpha channel) placed at the cover's projected box. Paper that shows
    # inside that outline is the art's own pale edging, not bleed. Dilated a little for perspective drift.
    cw, ch = max(2, int(round(cr - cl))), max(2, int(round(cb - ct)))
    al = np.array(art_alpha(book).resize((cw, ch), Image.BILINEAR))[:, :, 3] > 100
    sil = np.zeros((H, W), bool)
    x0, y0 = int(round(cl - ox)), int(round(ct - oy))
    sx0, sy0 = max(0, x0), max(0, y0); sx1, sy1 = min(W, x0 + cw), min(H, y0 + ch)
    if sx1 > sx0 and sy1 > sy0:
        sil[sy0:sy1, sx0:sx1] = al[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0]
    sil = ndimage.binary_dilation(sil, iterations=1 + int(math.ceil(ang * 0.4)))
    legit = (xx > cr + 1) & (xx <= br + 1) & (yy >= bt - 1) & (yy <= bb + 1)
    m = paper(a) & ~legit & ~sil
    return int(m.sum()), m, a

def run(books, vps, save):
    out = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--allow-file-access-from-files'])
        for vpname in vps:
            w, h, mobile = VPS[vpname]
            for book in books:
                ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, has_touch=mobile, is_mobile=mobile)
                pg = ctx.new_page(); errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)))
                pg.route('**/fonts.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='text/css', body=''))
                pg.route('**/fonts.gstatic.com/**', lambda r: r.abort())
                pg.add_init_script('window.__K=%s' % K)
                pg.goto(URL, wait_until='domcontentloaded'); pg.wait_for_timeout(2500)
                pg.click('.hot-book[data-id="%s"]' % book)
                fr = {'open': [], 'close': []}
                def grab(phase):
                    g = pg.evaluate(GEOM)
                    if not g: return None
                    x0, y0, x1, y1 = g['book']
                    ox, oy = max(0, int(x0 - 40)), max(0, int(y0 - 40))
                    clip = {'x': ox, 'y': oy, 'width': max(10, min(w, int(x1 + 40)) - ox), 'height': max(10, min(h, int(y1 + 40)) - oy)}
                    png = pg.screenshot(clip=clip)
                    ang = abs(cover_angle(g['cover']))
                    n, m, a = judge(png, g, ox, oy, book, ang)
                    return {'ang': ang, 'cls': g['cls'].replace('book ', ''), 'n': n, 'm': m, 'a': a}
                t0 = time.time()
                while time.time() - t0 < 5000 * K / 1000.0:
                    if not pg.evaluate("!!document.querySelector('.book')"): pg.wait_for_timeout(20); continue
                    f = grab('open')
                    if not f: continue
                    fr['open'].append(f)
                    if f['ang'] > MAXANG + 4: break
                t0 = time.time()
                while time.time() - t0 < 4500 * K / 1000.0:
                    s = pg.evaluate("(function(){var c=document.querySelector('.leaf.cover'); var u=document.querySelector('.ui.show'); return c?[getComputedStyle(c).transform, !!u]:null;})()")
                    if s and abs(cover_angle(s[0])) > 179.5 and s[1]: break
                    pg.wait_for_timeout(150)
                pg.wait_for_timeout(int(900 * K))
                for _ in range(DEEP):
                    pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(int(1100 * K))
                pg.keyboard.press('Escape')
                sealed = 0; t0 = time.time()
                while time.time() - t0 < 4000 * K / 1000.0:
                    if not pg.evaluate("!!document.querySelector('.book')"): break
                    f = grab('close')
                    if not f: break
                    fr['close'].append(f)
                    if f['ang'] < 0.2 and 'seal' in f['cls']:
                        sealed += 1
                        if sealed > 5: break
                ctx.close()
                for phase in ('open', 'close'):
                    low = [f for f in fr[phase] if f['ang'] <= MAXANG]
                    worst = max(low, key=lambda f: f['n']) if low else None
                    bad = [f for f in low if f['n'] > TOL_PX]
                    out.append(dict(vp=vpname, book=book, phase=phase, frames=len(low), worst=(worst['n'] if worst else -1), bad=len(bad), errs=errs))
                    print('%-6s %-10s %-5s frames<=%ddeg: %3d  worst: %5d px  frames over tol: %3d %s' % (vpname, book, phase, MAXANG, len(low), worst['n'] if worst else -1, len(bad), ('ERR ' + str(errs)) if errs else ''), flush=True)
                    if not low: print('   WARNING: no frames captured in this window, the test did not measure it', flush=True)
                    if save and worst:
                        os.makedirs(save, exist_ok=True)
                        for tag, f in (('worst', worst),) + tuple(('bad%02d' % i, ff) for i, ff in enumerate(bad[:3])):
                            im = f['a'].copy(); im[f['m']] = [255, 0, 255]
                            Image.fromarray(im).save('%s/%s_%s_%s_%s_ang%.1f_%dpx_%s.png' % (save, vpname, book, phase, tag, f['ang'], f['n'], f['cls'].replace(' ', '-')))
        b.close()
    return out

DEEP = int(os.environ.get('DEEP', '0'))
if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--books', default='about,experience,writing,research,contact')
    ap.add_argument('--vp', default='desk')
    ap.add_argument('--save', default=None)
    a = ap.parse_args()
    names = list(VPS) if a.vp == 'all' else a.vp.split(',')
    res = run(a.books.split(','), names, a.save)
    unmeasured = [r for r in res if r['frames'] == 0]
    bad = [r for r in res if r['bad'] > 0]
    print('RESULT', 'FAIL' if bad or unmeasured else 'PASS', '| over tolerance:', len(bad), '| unmeasured windows:', len(unmeasured))
    sys.exit(1 if bad or unmeasured else 0)
