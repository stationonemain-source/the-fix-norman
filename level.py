"""Stand a straight-sided cup cutout truly upright: fit a line to each side of the body and
rotate so the two sides taper by the same amount (the cup's axis is vertical).

    python level.py cutouts/f_sunset.png [RIM_FRAC]     prints before/after slopes, rewrites in place
"""
import sys
import numpy as np
from PIL import Image

path = sys.argv[1]
RIM_FRAC = float(sys.argv[2]) if len(sys.argv) > 2 else 0.35


def sides(img):
    al = np.array(img)[..., 3]; h, w = al.shape
    rows = [y for y in range(h) if (al[y] > 128).sum() > w * 0.10]
    y0, y1 = rows[0], rows[-1]
    wid = {y: (np.where(al[y] > 128)[0][0], np.where(al[y] > 128)[0][-1]) for y in rows}
    top = [y for y in rows if y < y0 + (y1 - y0) * RIM_FRAC]
    rim = max(wid[y][1] - wid[y][0] for y in top)
    yr = max(y for y in top if wid[y][1] - wid[y][0] >= rim * 0.97)
    lo = next(y for y in rows if y > yr and wid[y][1] - wid[y][0] < rim * 0.93) + 15
    hi = y1 - int((y1 - lo) * 0.06)
    ys = np.array([y for y in rows if lo <= y <= hi], float)
    sl = np.polyfit(ys, [wid[int(y)][0] for y in ys], 1)[0]
    sr = np.polyfit(ys, [wid[int(y)][1] for y in ys], 1)[0]
    return sl, sr


im = Image.open(path).convert('RGBA')
sl, sr = sides(im)
axis = (sl + sr) / 2                     # dx/dy of the centre line; 0 = upright
deg = float(np.degrees(np.arctan(axis)))
print('%s  before: left side %+.3f, right side %+.3f px/px, lean %.2f deg' % (path, sl, sr, deg))
if abs(deg) < 0.25:
    print('   already upright'); sys.exit(0)
pad = int(max(im.size) * 0.12)
big = Image.new('RGBA', (im.size[0] + 2 * pad, im.size[1] + 2 * pad), (0, 0, 0, 0))
big.paste(im, (pad, pad))
big = big.rotate(-deg, resample=Image.BICUBIC, expand=True)
big = big.crop(big.getbbox())
sl2, sr2 = sides(big)
print('   after:  left side %+.3f, right side %+.3f px/px, lean %.2f deg' % (sl2, sr2, np.degrees(np.arctan((sl2 + sr2) / 2))))
big.save(path)
