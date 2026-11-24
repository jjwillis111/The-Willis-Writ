import json, sys
from PIL import Image, ImageDraw
d, tag, a, b, step, corner, out, sc = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), sys.argv[6], sys.argv[7], float(sys.argv[8])
log = json.load(open(d + '/log.json'))
ims = []
for e in log:
    if e['tag'] != tag or not (a <= e['i'] < b) or (e['i'] - a) % step: continue
    s = e['state']; x0, y0, w, h = s['book']
    right = x0 + w; top = y0; bot = y0 + h
    cx = right if 'r' in corner else x0 + w / 2 - 0
    cy = top if 't' in corner else bot
    box = (int(cx - 55), int(cy - 30), int(cx + 25), int(cy + 30)) if 'r' in corner else (int(cx - 40), int(cy - 30), int(cx + 40), int(cy + 30))
    im = Image.open('%s/%s_%03d.png' % (d, tag, e['i'])).convert('RGB').crop(box)
    im = im.resize((int(im.width * sc), int(im.height * sc)), Image.LANCZOS)
    dr = ImageDraw.Draw(im); dr.rectangle([0, 0, 120, 13], fill=(0, 0, 0)); dr.text((2, 1), '%d %s' % (e['i'], s['cls'].replace('book dual', '').strip()), fill=(255, 255, 0))
    ims.append(im)
cols = 6; w, h = ims[0].size; rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (cols * w, rows * h), (40, 40, 40))
for k, im in enumerate(ims): S.paste(im, ((k % cols) * w, (k // cols) * h))
S.save(out); print(len(ims), S.size)
