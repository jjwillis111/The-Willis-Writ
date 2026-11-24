#!/usr/bin/env python3
"""One-off: download public logo and seal files and save a few pages for inspection. Standard library only."""
import hashlib, os, sys, urllib.request, urllib.error
UA = 'Mozilla/5.0 (compatible; The-Willis-Writ-logo-fetch/1.0; +https://github.com/jjwillis111/The-Willis-Writ)'

def commons(name):
    h = hashlib.md5(name.encode()).hexdigest()
    return 'https://upload.wikimedia.org/wikipedia/commons/%s/%s/%s' % (h[0], h[:2], name)

DIRECT = {
    'kansas-house.webp': 'https://www.kslegislature.gov/static/images/kansas_house_seal.85bb545e0298.webp',
    'bcbsks.svg': 'https://bcbsks.com/sites/default/files/2023-08/BCBSKS_logo_KS_Blue_blk_RGB.svg',
    'bcbsks-big.png': 'https://bcbsks.com/sites/default/files/2021-06/BCBSKS_logo_big.png',
    'alms-tag.png': 'https://static1.squarespace.com/static/61777a2bef59ef2c8f5c912b/t/6998bf37a874267c840dc50f/1771618103202/TAG+Main+Logo.png',
    'alms-light.png': 'https://images.squarespace-cdn.com/content/v1/61777a2bef59ef2c8f5c912b/c86e3a3e-2999-48e7-98e9-0f1f35d89e04/light+background+logo.png',
    'wyco-touch.png': 'https://www.wycokck.org/files/ocfavicon/Public/apple-touch-icon.png',
    'wyco-da-hero.png': 'https://www.wycokck.org/files/assets/public/v/2/district-attorney/images/daherotransnew.png',
    'scrimsher-1.jpeg': 'https://scrimsherlaw.com/wp-content/uploads/2025/11/Scrimsher-Law-Logo-2.jpeg',
    'scrimsher-crop.png': 'https://scrimsherlaw.com/wp-content/uploads/2025/11/Scrimsher-Law-Crop.png',
    'tongie.png': 'https://www.tonganoxie.org/sites/all/themes/custom/sites/tonganoxieks/tonganoxieks_theme/logo.png',
}
PAGES = {}

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

run('direct', DIRECT, 'fetched2')
