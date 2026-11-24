"""Asserts that no board (.bd) or page-edge strip (.stk) is visible while the cover is within BAND degrees of closed.
Samples every frame from the click that opens a book until it is fully open, and from Escape until it is sealed.
Run: K=6 python3 -I src/tests/board_test.py [--books about,experience] [--band 95]"""
import sys, os, time, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from anglelib import cover_angle
from playwright.sync_api import sync_playwright
K = float(os.environ.get('K', '6'))
URL = os.environ.get('URL') or 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'index.html'))
JS = """(function(){var c=document.querySelector('.leaf.cover'),k=document.querySelector('.book');if(!c||!k)return null;
 function vis(e){var s=getComputedStyle(e);return s.visibility!=='hidden'&&parseFloat(s.opacity)>0.15&&parseFloat(s.width)>0.5;}
 var bd=[].slice.call(k.querySelectorAll('.bd')).filter(function(e){return getComputedStyle(e).visibility!=='hidden'&&parseFloat(getComputedStyle(e).opacity)>0.15;}).length;
 var sk=[].slice.call(k.querySelectorAll('.stk')).filter(vis).length;
 return [getComputedStyle(c).transform,bd,sk];})()"""
ap = argparse.ArgumentParser(); ap.add_argument('--books', default='about,experience,writing,research,contact'); ap.add_argument('--band', type=float, default=95)
a = ap.parse_args(); bad = 0
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--allow-file-access-from-files'])
    for book in a.books.split(','):
        pg = b.new_context(viewport={'width': 1440, 'height': 810}).new_page()
        pg.route('**/fonts.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='text/css', body=''))
        pg.route('**/fonts.gstatic.com/**', lambda r: r.abort())
        pg.add_init_script('window.__K=%s' % K)
        pg.goto(URL, wait_until='domcontentloaded'); pg.wait_for_timeout(2500)
        pg.click('.hot-book[data-id="%s"]' % book)
        res = {'open': [0, 0], 'close': [0, 0]}
        def sample(phase, secs):
            t0 = time.time()
            while time.time() - t0 < secs:
                s = pg.evaluate(JS)
                if s:
                    ang = abs(cover_angle(s[0]))
                    if 0.05 < ang < a.band:
                        res[phase][0] += 1
                        if s[1] or s[2]: res[phase][1] += 1
                pg.wait_for_timeout(12)
        sample('open', 4.5 * K); pg.wait_for_timeout(int(600 * K)); pg.keyboard.press('Escape'); sample('close', 4 * K)
        for ph in res:
            n, v = res[ph]; bad += v + (1 if n == 0 else 0)
            print('%-10s %-5s frames under %d deg: %3d  with a board or strip visible (opacity over 0.15): %d' % (book, ph, a.band, n, v))
        pg.context.close()
    b.close()
print('RESULT', 'FAIL' if bad else 'PASS'); sys.exit(1 if bad else 0)
