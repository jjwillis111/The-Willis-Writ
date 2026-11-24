#!/usr/bin/env python3
"""One-off: download public logo and seal files and save a few pages for inspection. Standard library only."""
import hashlib, os, sys, urllib.request, urllib.error
UA = 'Mozilla/5.0 (compatible; The-Willis-Writ-logo-fetch/1.0; +https://github.com/jjwillis111/The-Willis-Writ)'

def commons(name):
    h = hashlib.md5(name.encode()).hexdigest()
    return 'https://upload.wikimedia.org/wikipedia/commons/%s/%s/%s' % (h[0], h[:2], name)

DIRECT = {
    'sec.svg': commons('Seal_of_the_United_States_Securities_and_Exchange_Commission.svg'),
    'senate-seal.svg': commons('Seal_of_the_United_States_Senate.svg'),
    'kansas-seal.svg': commons('Seal_of_Kansas.svg'),
    'sporting-kc.svg': 'https://logotyp.us/file/sporting-kc.svg',
    'bu.svg': 'https://logotyp.us/file/bu.svg',
}
PAGES = {
    'wyandotte-da.html': 'https://www.wycokck.org/Government/Courts/District-Attorney',
    'bcbsks-logo-library.html': 'https://bcbsks.com/logo-library',
    'alms.html': 'https://thealmsgroup.squarespace.com/',
    'bu-law.html': 'https://www.bu.edu/law/',
    'kslegislature.html': 'https://www.kslegislature.gov/',
    'kslegislature-house.html': 'https://www.kslegislature.gov/li/b2025_26/chamber/house/',
}

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read(), r.headers.get('Content-Type', '')

def run(group, items, out):
    os.makedirs(out, exist_ok=True)
    for name, url in items.items():
        try:
            data, ct = get(url)
            open(os.path.join(out, name), 'wb').write(data)
            print('OK  ', len(data), ct, name, url, flush=True)
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            print('FAIL', name, url, e, flush=True)

run('direct', DIRECT, 'fetched')
run('pages', PAGES, 'recon')
