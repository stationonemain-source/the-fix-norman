"""Rebuild a cup cutout's outline below the lid as a real cup: two STRAIGHT tapered sides and a
flat bottom.

Replaces smoothside_curved_v2.py, which fitted the sides as quadratics and closed them with a
rounded base tangent to the sides. That bent the lower third inward and rounded the bottom into
a point — Circle, 2026-09-16: "it's a cup, it doesn't curve anywhere." A 32 oz cup is a cone
frustum: straight lines, and a bottom that is only a very shallow arc because it is seen
slightly from above, meeting the sides at a corner.

    python straightcup.py cutouts/f_sunset.bak.png cutouts/f_sunset.png [RIM_FRAC]
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
RIM_FRAC = float(sys.argv[3]) if len(sys.argv) > 3 else 0.35   # how far down to look for the lid rim (a dome lid sits lower)
im = Image.open(src).convert('RGBA'); a = np.array(im).astype(np.float32)
al = a[..., 3]; H, W = al.shape
solid = al > 128
wide = [y for y in range(H) if solid[y].sum() > W * 0.25]
y0 = wide[0]
y_last = max(y for y in range(H) if solid[y].sum() > W * 0.10)   # bottom of the cup, ignoring specks
edge = {y: (np.where(solid[y])[0].min(), np.where(solid[y])[0].max()) for y in range(y0, y_last + 1) if solid[y].any()}

# the lid rim is the widest band near the top; the body starts where the width drops clear of it
widths = {y: edge[y][1] - edge[y][0] for y in edge}
top_rows = [y for y in edge if y < y0 + (y_last - y0) * RIM_FRAC]
rim_w = max(widths[y] for y in top_rows)
y_rim = max(y for y in top_rows if widths[y] >= rim_w * 0.97)
y_top = next(y for y in range(y_rim, y_last) if y in widths and widths[y] < rim_w * 0.93) + 6
y_fit_bot = y_last - int((y_last - y_top) * 0.06)


def robust_line(ys, xs):
    k = np.ones_like(xs, bool)
    for _ in range(4):
        c = np.polyfit(ys[k], xs[k], 1); r = np.abs(xs - np.polyval(c, ys))
        k = r <= max(np.percentile(r, 70), 1.0)
    return np.polyfit(ys[k], xs[k], 1)


fy = np.array([y for y in range(y_top, y_fit_bot) if y in edge], float)
cL = robust_line(fy, np.array([edge[int(y)][0] for y in fy], float))
cR = robust_line(fy, np.array([edge[int(y)][1] for y in fy], float))
Lf = lambda y: float(np.polyval(cL, y)); Rf = lambda y: float(np.polyval(cR, y))

# flat bottom: corners at y_corner, the centre only a few px lower (perspective)
sag = max(3.0, (Rf(y_last) - Lf(y_last)) * 0.035)
y_corner = y_last - sag
cx = (Lf(y_corner) + Rf(y_corner)) / 2; half = (Rf(y_corner) - Lf(y_corner)) / 2

JOIN = 12   # rows under the lid rim over which the straight side takes over from the photo's own edge

# The heel: the first row, low on the cup, where the photo's real width falls clearly short of the
# straight width (the rounded bottom). Stretching those rows smears them and mirroring them draws a
# visible reflection, so the cup simply ENDS there: the flat bottom goes on the last full-width row
# and every pixel above it is real. The cup loses a few percent of height, which does not show.
y_heel = y_last + 1
for y in range(int(y_top + (y_last - y_top) * 0.6), y_last + 1):
    if y in edge and (edge[y][1] - edge[y][0]) < 0.95 * (Rf(y) - Lf(y)):
        y_heel = y; break
y_last = min(y_last, y_heel - 1)
sag = max(3.0, (Rf(y_last) - Lf(y_last)) * 0.035)
y_corner = y_last - sag
cx = (Lf(y_corner) + Rf(y_corner)) / 2; half = (Rf(y_corner) - Lf(y_corner)) / 2
out = a.copy(); xs = np.arange(W)
dev_before = max(max(abs(edge[y][0] - Lf(y)), abs(edge[y][1] - Rf(y))) for y in range(y_top, int(y_corner)) if y in edge)
for y in range(y_top, H):
    if y > y_last:
        out[y, :, 3] = 0; continue
    l, r = Lf(y), Rf(y)
    if y < y_top + JOIN and y in edge:
        w = (y - y_top) / JOIN
        l = edge[y][0] * (1 - w) + l * w; r = edge[y][1] * (1 - w) + r * w
    if y > y_corner:
        t = (y - y_corner) / sag
        hw = half * np.sqrt(max(0.0, 1 - t * t)); l, r = cx - hw, cx + hw
    cov = np.clip(np.minimum(xs - l + 0.5, r - xs + 0.5), 0, 1)
    # Map this row's REAL pixels (between its real edges) onto the straight span. A flat fill left
    # visible streaks where a hand had bitten into the cup; resampling keeps the texture, and where
    # the real edge was already on the line it changes nothing.
    yy = y
    while yy > y_top and (yy not in edge or edge[yy][1] - edge[yy][0] < 40):
        yy -= 1
    el, er = edge.get(yy, (int(l), int(r)))
    el, er = el + 2, er - 2                        # skip the soft matte edge itself
    li, ri = int(np.floor(l)), int(np.ceil(r))
    if ri > li and er > el:
        span_x = np.arange(max(li, 0), min(ri, W - 1) + 1)
        src_x = el + (span_x - l) * (er - el) / max(r - l, 1.0)
        src_x = np.clip(src_x, el, er)
        x0 = np.floor(src_x).astype(int); x1 = np.minimum(x0 + 1, W - 1); f = (src_x - x0)[:, None]
        out[y, span_x, :3] = a[yy, x0, :3] * (1 - f) + a[yy, x1, :3] * f
    out[y, :, 3] = 255.0 * cov
res = Image.fromarray(out.clip(0, 255).astype(np.uint8))
res.putalpha(res.getchannel('A').filter(ImageFilter.GaussianBlur(0.5)))
res = res.crop(res.getbbox()); res.save(dst)
print('cup now ends at row %d (the rounded heel below it is dropped)' % y_last)
print('%s -> %s  rim row %d, straight sides from row %d, bottom corners at %.0f (sag %.0f px); '
      'the photo edge was up to %.1f px off a straight line' % (src, dst, y_rim, y_top, y_corner, sag, dev_before))
