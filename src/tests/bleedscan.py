import json, sys
import numpy as np
from PIL import Image
sys.path.insert(0, '/home/claude/The-Willis-Writ/src/tests')
from anglelib import cover_angle

def cream_mask(a):
    r, g, b = a[:, :, 0].astype(int), a[:, :, 1].astype(int), a[:, :, 2].astype(int)
    return (r >= 205) & (g >= 198) & (b >= 160) & (r - b >= 6) & (r - b <= 50) & (r >= g) & (g >= b)

def scan(d, tag):
    log = json.load(open(d + '/log.json'))
    rows = []
    for e in log:
        if e['tag'] != tag or not e['state']: continue
        s = e['state']; x0, y0, w, h = s['book']
        a = np.array(Image.open('%s/%s_%03d.png' % (d, tag, e['i'])).convert('RGB'))
        H, W = a.shape[:2]
        X0, X1 = max(0, int(x0 - 40)), min(W, int(x0 + w + 40)); Y0, Y1 = max(0, int(y0 - 40)), min(H, int(y0 + h + 40))
        m = cream_mask(a[Y0:Y1, X0:X1])
        ang = abs(cover_angle(s['cover']))
        ys, xs = np.where(m)
        rows.append((e['i'], s['cls'].replace('book ', ''), ang, int(m.sum()), (xs.min() + X0, ys.min() + Y0, xs.max() + X0, ys.max() + Y0) if m.any() else None))
    return rows

if __name__ == '__main__':
    d = sys.argv[1]
    for tag in ('open', 'close'):
        print('==', tag)
        for r in scan(d, tag):
            if r[0] % int(sys.argv[2]) == 0 or (r[2] < 14 and r[3] > 0):
                print(r[0], '%-22s' % r[1], 'ang %5.1f' % r[2], 'cream', r[3], r[4])
