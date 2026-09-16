"""Rebuild a cup cutout's outline below the lid: straight-tapered sides and an elliptical base.

The 32 oz cups step inward where the ribbed base begins; after matting and standing the cup up
that step read as a dent ("the weird decline"). v1 moved only the side edge and left a kink at
the base and a grey hairline of the old soft edge. v2 replaces the whole outline from under the
lid to the bottom with one shape: each side a smooth quadratic fitted to the real edge, the base
an ellipse measured from the real rounding. Pixels newly inside are filled from real pixels a
little inside the same row; everything that was already inside the cup is untouched.

    python smoothside.py cutouts/f_rainbow.bak.png cutouts/f_rainbow.png
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA'); a = np.array(im).astype(np.float32)
al = a[..., 3]; H, W = al.shape
solid = al > 128
rows = [y for y in range(H) if solid[y].sum() > W * 0.25]
y0 = rows[0]
y_last = max(y for y in range(H) if solid[y].any())   # the true bottom, not the last wide row
span = y_last - y0
y_top = y0 + int(span * 0.20)            # below the lid flare
y_bot = y_last - int(span * 0.08)        # above the rounded base
edge = {y: (np.where(solid[y])[0].min(), np.where(solid[y])[0].max()) for y in range(y_top, y_last + 1) if solid[y].any()}
fy = np.array([y for y in range(y_top, y_bot + 1) if y in edge], float)


def robust_quad(y, x):
    k = np.ones_like(x, bool)
    for _ in range(3):
        c = np.polyfit(y[k], x[k], 2); r = np.abs(x - np.polyval(c, y))
        k = r <= max(np.percentile(r, 80), 1.0)
    return np.polyfit(y[k], x[k], 2)


cL = robust_quad(fy, np.array([edge[int(y)][0] for y in fy], float))
cR = robust_quad(fy, np.array([edge[int(y)][1] for y in fy], float))
Lf = lambda y: float(np.polyval(cL, y)); Rf = lambda y: float(np.polyval(cR, y))

# measure the base rounding: from the bottom up, the first row whose real width is >= 96% of the fitted width
y_round = y_last
for y in range(y_last, y_bot - 40, -1):
    if y in edge and (edge[y][1] - edge[y][0]) >= 0.96 * (Rf(y) - Lf(y)):
        y_round = y; break
b = int(np.clip(y_last - y_round, 12, 90))
yc = y_last - b
# the ellipse's widest row IS the side at yc, so the side runs into the base with no corner
cx = (Lf(yc) + Rf(yc)) / 2; ax = (Rf(yc) - Lf(yc)) / 2

out = a.copy()
xs = np.arange(W)
RAMP = 90   # rows over which the fitted outline takes over from the real one, so the join has no step
for y in range(y_top, y_last + 1):
    l, r = Lf(y), Rf(y)
    if y < y_top + RAMP and y in edge:
        w = (y - y_top) / RAMP
        l = edge[y][0] * (1 - w) + l * w
        r = edge[y][1] * (1 - w) + r * w
    if y > yc:                                            # inside the base ellipse
        t = (y - yc) / b
        hw = ax * np.sqrt(max(0.0, 1 - t * t)); l, r = cx - hw, cx + hw
    inside = (xs >= l) & (xs <= r)
    # soft 1 px edge
    cov = np.clip(np.minimum(xs - l + 0.5, r - xs + 0.5), 0, 1)
    newly = inside & ~solid[y]
    if newly.any():
        yy = y
        while yy > y_top and (yy not in edge or edge[yy][1] - edge[yy][0] < 40):
            yy -= 1
        el, er = edge.get(yy, (int(l), int(r)))
        refL = a[yy, el + 6:el + 14, :3].mean(0); refR = a[yy, er - 13:er - 5, :3].mean(0)
        mid = (el + er) / 2
        for x in np.where(newly)[0]:
            out[y, x, :3] = refL if x < mid else refR
    out[y, :, 3] = np.where(solid[y] | newly, 255, 0) * cov
out[y_last + 1:, :, 3] = 0                              # nothing of the old bottom survives below
res = Image.fromarray(out.clip(0, 255).astype(np.uint8))
res.putalpha(res.getchannel('A').filter(ImageFilter.GaussianBlur(0.6)))
res = res.crop(res.getbbox()); res.save(dst)
print('%s -> %s  sides fitted rows %d-%d, base ellipse b=%d px' % (src, dst, y_top, y_bot, b))
