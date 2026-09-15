"""Rebuild a hand-occluded cup as a radial profile of its own pixels.

For every row the cup is a smooth horizontal profile: edge, body, highlight, edge.
So: measure that profile on the CLEAN half only, smooth it over a few neighbouring
rows (kills stray pixels and stair-steps), then paint both halves from it. Every
colour written is a real colour of that drink at that height; nothing is invented
and there is no seam, because one rule drives the whole body.
"""
import numpy as np
from PIL import Image, ImageFilter


def cupmask(rgb, satmin=0.40, vmin=0.16, skinsat=0.55):
    a = rgb.astype(np.float32) / 255.
    mx = a.max(2); mn = a.min(2)
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    red_dom = (a[..., 0] >= a[..., 1]) & (a[..., 1] >= a[..., 2])
    return (s > satmin) & (mx > vmin) & ~(red_dom & (s < skinsat))


def _fit(v, ys):
    for _ in range(3):
        b, c = np.polyfit(ys, v, 1)
        r = np.abs(v - (c + b * ys)); k = r <= np.percentile(r, 75)
        if k.sum() > 10: ys, v = ys[k], v[k]
    b, c = np.polyfit(ys, v, 1)
    return c, b


def build(src, matte, box, out, clean='left', lid_y=0, body_from=None, satmin=0.40,
          rowsmooth=5, feather=1.4, base_round=0.0, blend=0):
    im = Image.open(src).convert('RGB').crop(box)
    mt = Image.open(matte).convert('RGBA').crop(box)
    a = np.array(im).astype(np.float32); H, W, _ = a.shape
    ma = np.array(mt)[..., 3] > 120
    cup = cupmask(np.array(im), satmin)

    L = np.full(H, np.nan); R = np.full(H, np.nan)
    for y in range(H):
        xs = np.where(cup[y])[0]
        if len(xs) > W * 0.10: L[y], R[y] = xs.min(), xs.max()
    rows = np.where(~np.isnan(L))[0]; y0, y1 = rows.min(), rows.max()
    bf = body_from if body_from is not None else y0 + int((y1 - y0) * 0.12)
    cr = rows[(rows >= bf) & (rows <= bf + int((y1 - y0) * 0.35))]
    ac, ab = _fit((L[cr] + R[cr]) / 2.0, cr.astype(float))
    ec, eb = _fit((R if clean == 'right' else L)[cr], cr.astype(float))
    yy = np.arange(H, dtype=float)
    axis = ac + ab * yy
    half = np.abs((ec + eb * yy) - axis)          # half-width of the cup at each row

    # ---- radial profile, clean half only, smoothed across neighbouring rows ----
    RMAX = int(np.ceil(half.max())) + 2
    prof = np.full((H, RMAX, 3), np.nan, np.float32)
    for y in range(y0, y1 + 1):
        ax = axis[y]; hw = half[y]
        if not np.isfinite(hw) or hw < 8: continue
        for r in range(int(hw) + 1):
            x = ax + r if clean == 'right' else ax - r
            xi = int(round(x))
            if 0 <= xi < W and cup[y, xi]:
                prof[y, r] = a[y, xi]
    sm = np.full_like(prof, np.nan)
    for y in range(y0, y1 + 1):
        lo, hi = max(y0, y - rowsmooth), min(y1, y + rowsmooth) + 1
        w = prof[lo:hi]
        with np.errstate(invalid='ignore'):
            sm[y] = np.nanmedian(w, axis=0)
    # fill any radius still unknown from the nearest known radius in that row
    for y in range(y0, y1 + 1):
        row = sm[y]; known = np.where(np.isfinite(row[:, 0]))[0]
        if len(known) == 0: continue
        for r in range(int(half[y]) + 1):
            if not np.isfinite(row[r, 0]):
                row[r] = row[known[np.abs(known - r).argmin()]]

    out_rgb = np.array(im).copy(); out_a = np.zeros((H, W), np.uint8)
    # the lid and straw come straight from the matte
    keep = ma.copy(); keep[lid_y:] = False
    out_a[keep] = 255
    keep_full = ma.copy()
    for y in range(lid_y, y1 + 1):
        if not np.isfinite(half[y]) or half[y] < 8: continue
        ax = axis[y]; hw = half[y]
        if base_round > 0:                       # round the last rows into a base
            d = (y1 - y) / max(y1 - y0, 1)
            if d < base_round:
                hw = hw * float(np.sqrt(max(0.0, 1 - ((base_round - d) / base_round) ** 2)))
        if hw < 6: continue
        row = sm[y]
        if not np.isfinite(row[0, 0]): continue
        lo, hi = int(round(ax - hw)), int(round(ax + hw))
        for x in range(max(lo, 0), min(hi, W - 1) + 1):
            r = min(int(round(abs(x - ax))), RMAX - 1)
            if not np.isfinite(row[r, 0]): continue
            v = np.clip(row[r], 0, 255)
            if blend and y < lid_y + blend and keep_full[y, x]:
                # crossfade into the matte-kept lid rows: a hard handover leaves a
                # visible step where the two blues differ by a shade
                t = (y - lid_y) / float(blend)
                v = v * t + a[y, x] * (1 - t)
            out_rgb[y, x] = v.astype(np.uint8)
            out_a[y, x] = 255
    alpha = Image.fromarray(out_a).filter(ImageFilter.GaussianBlur(feather))
    res = Image.fromarray(out_rgb).convert('RGBA'); res.putalpha(alpha)
    res = res.crop(res.getbbox()); res.save(out)
    print(out, res.size, 'axis %.0f%+.3fy half %.0f..%.0f' % (ac, ab, half[y0], half[y1]))
    return res
