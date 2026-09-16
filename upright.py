"""Stand an existing cup cutout upright by fitting the axis of its coloured body.
    python upright.py cutouts/f_pink.png [min_sat]"""
import sys
import numpy as np
from PIL import Image

path = sys.argv[1]
min_sat = float(sys.argv[2]) if len(sys.argv) > 2 else 0.30
im = Image.open(path).convert('RGBA'); a = np.array(im)
rgb = a[..., :3].astype(float); al = a[..., 3]
mx = rgb.max(2); mn = rgb.min(2)
body = (al > 150) & ((mx - mn) / np.maximum(mx, 1) > min_sat)
ys, cx = [], []
for y in range(a.shape[0]):
    xs = np.where(body[y])[0]
    if len(xs) > a.shape[1] * 0.2: ys.append(y); cx.append((xs.min() + xs.max()) / 2)
ys = np.array(ys); cx = np.array(cx)
k = (ys >= np.percentile(ys, 15)) & (ys <= np.percentile(ys, 75))
deg = float(np.degrees(np.arctan(np.polyfit(ys[k], cx[k], 1)[0])))
if abs(deg) < 0.8:
    print(path, 'already upright (%.1f deg)' % deg); sys.exit(0)
pad = int(max(im.size) * 0.12)
big = Image.new('RGBA', (im.size[0] + 2 * pad, im.size[1] + 2 * pad), (0, 0, 0, 0))
big.paste(im, (pad, pad))
big = big.rotate(-deg, resample=Image.BICUBIC, expand=True)
big = big.crop(big.getbbox()); big.save(path)
print(path, 'lean %.1f deg corrected ->' % deg, big.size)
