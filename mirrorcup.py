"""Rebuild a hand-occluded cup by mirroring its own CLEAN half about the cup axis.
Above `split_y` the rembg matte is used as-is (it keeps the clear lid and straw).
Below it, every pixel is the real pixel from the mirrored column of the same row,
and the silhouette never exceeds what the clean side actually shows.
"""
import numpy as np
from PIL import Image, ImageFilter

def cupmask(rgb, satmin=0.38, vmin=0.16, skinsat=0.55):
    """Saturated pixels, minus skin. Skin is the one family that is red-dominant
    AND weakly saturated; every real cup colour here (red, orange, blue, green,
    yellow) clears skinsat, so the rule cannot eat the drink."""
    a = rgb.astype(np.float32)/255.
    mx = a.max(2); mn = a.min(2)
    s = np.where(mx > 0, (mx-mn)/np.maximum(mx, 1e-6), 0)
    red_dom = (a[...,0] >= a[...,1]) & (a[...,1] >= a[...,2])
    skin = red_dom & (s < skinsat)
    return (s > satmin) & (mx > vmin) & ~skin

def run(src, matte, box, out, clean='right', split_y=None, satmin=0.38,
        feather=1.2, bottom=None, clamp=True, fit_from=None, dbg=None):
    im  = Image.open(src).convert('RGB').crop(box)
    mt  = Image.open(matte).convert('RGBA').crop(box)
    a   = np.array(im); H, W, _ = a.shape
    ma  = np.array(mt)[..., 3] > 120
    cup = cupmask(a, satmin)
    L = np.full(H, np.nan); R = np.full(H, np.nan)
    for y in range(H):
        xs = np.where(cup[y])[0]
        if len(xs) > W*0.10: L[y], R[y] = xs.min(), xs.max()
    rows = np.where(~np.isnan(L))[0]; y0, y1 = rows.min(), rows.max()
    sy = split_y; y_bot = bottom if bottom is not None else y1
    # fit the side BELOW the lid: the lid flares wider than the body and would
    # tilt the line outward, which then lets a stray pixel widen the silhouette.
    ff = fit_from if fit_from is not None else y0+4
    cr = rows[(rows >= ff) & (rows < sy)]
    def fit(v, ys):
        for _ in range(3):
            b, c = np.polyfit(ys, v, 1); r = np.abs(v-(c+b*ys)); k = r <= np.percentile(r, 75)
            if k.sum() > 10: ys, v = ys[k], v[k]
        b, c = np.polyfit(ys, v, 1); return c, b
    ac, ab = fit((L[cr]+R[cr])/2.0, cr.astype(float))
    ec, eb = fit((R if clean=='right' else L)[cr], cr.astype(float))
    yy = np.arange(H, dtype=float); axis = ac+ab*yy; efit = ec+eb*yy
    out_rgb = a.copy(); out_a = np.zeros((H, W), np.uint8)
    keep = ma.copy(); keep[sy:] = False
    out_a[keep] = 255
    for y in range(sy, min(y_bot, H-1)+1):
        ok = cup[y]; good = np.where(ok)[0]
        if len(good) < 10: continue
        ax = axis[y]
        gs = good[good >= ax] if clean == 'right' else good[good <= ax]
        if len(gs) < 6: continue
        e_real = gs.max() if clean == 'right' else gs.min()
        ed = (min(e_real, efit[y]) if clean == 'right' else max(e_real, efit[y])) if clamp else efit[y]
        # a stray saturated pixel outside the cup must never widen the silhouette
        ed = min(ed, efit[y]+3) if clean == 'right' else max(ed, efit[y]-3)
        far = 2*ax - ed
        lo, hi = int(round(min(far, ed))), int(round(max(far, ed)))
        lo, hi = max(lo, 0), min(hi, W-1)
        for x in range(lo, hi+1):
            on_clean = (x >= ax) if clean == 'right' else (x <= ax)
            sx = x if on_clean else int(round(2*ax - x))
            if not (0 <= sx < W) or not ok[sx]:
                d = np.abs(gs - np.clip(sx, 0, W-1)); sx = int(gs[d.argmin()])
            out_rgb[y, x] = a[y, sx]; out_a[y, x] = 255
    alpha = Image.fromarray(out_a).filter(ImageFilter.GaussianBlur(feather))
    res = Image.fromarray(out_rgb).convert('RGBA'); res.putalpha(alpha)
    res = res.crop(res.getbbox()); res.save(out)
    print(out, res.size, f'axis {ac:.0f}{ab:+.3f}y edge {ec:.0f}{eb:+.3f}y split {sy}')
    return res

def derow(path, out=None, tol=26):
    """Kill single-row colour bands left by a bad fallback pixel: any row whose
    median colour jumps away from its vertical neighbours is rebuilt by
    interpolating the rows above and below."""
    im = Image.open(path).convert('RGBA'); a = np.array(im).astype(np.int16)
    al = a[...,3] > 100; H = a.shape[0]
    med = np.zeros((H,3), np.float32); has = np.zeros(H, bool)
    for y in range(H):
        xs = np.where(al[y])[0]
        if len(xs) > 8: med[y] = np.median(a[y, xs, :3], 0); has[y] = True
    ys = np.where(has)[0]; bad = []
    for i, y in enumerate(ys):
        lo = ys[max(i-4,0):i]; hi = ys[i+1:i+5]
        if len(lo) < 2 or len(hi) < 2: continue
        ref = (np.median(med[lo],0) + np.median(med[hi],0))/2
        if np.abs(med[y]-ref).max() > tol: bad.append(y)
    for y in bad:
        up = y-1
        while up in bad and up > 0: up -= 1
        dn = y+1
        while dn in bad and dn < H-1: dn += 1
        if not (has[up] and has[dn]): continue
        t = (y-up)/max(dn-up, 1)
        a[y,:,:3] = (a[up,:,:3]*(1-t) + a[dn,:,:3]*t)
    Image.fromarray(a.astype(np.uint8)).save(out or path)
    print('derow', path, 'rows fixed:', len(bad))

def conefix(path, out, fit_rows, sides='both', feather=1.2, top=None, bottom=None):
    """Repair bites taken out of a cup's straight side by an over-eager matte.
    The side of a cup is a straight line: fit it from clean rows, restore the
    silhouette to that line, and fill the restored pixels from the nearest real
    pixel in the SAME row (these cups are flat colour across a row)."""
    im = Image.open(path).convert('RGBA'); im = im.crop(im.getbbox())
    a = np.array(im); H, W, _ = a.shape
    al = a[..., 3] > 120
    L = np.full(H, np.nan); R = np.full(H, np.nan)
    for y in range(H):
        xs = np.where(al[y])[0]
        if len(xs) > W*0.10: L[y], R[y] = xs.min(), xs.max()
    rows = np.where(~np.isnan(L))[0]; y0, y1 = rows.min(), rows.max()
    cr = rows[(rows >= fit_rows[0]) & (rows <= fit_rows[1])]
    def fit(v, ys):
        for _ in range(3):
            b, c = np.polyfit(ys, v, 1); r = np.abs(v-(c+b*ys)); k = r <= np.percentile(r, 75)
            if k.sum() > 10: ys, v = ys[k], v[k]
        b, c = np.polyfit(ys, v, 1); return c, b
    lc, lb = fit(L[cr], cr.astype(float)); rc, rb = fit(R[cr], cr.astype(float))
    yy = np.arange(H, dtype=float); Lf = lc+lb*yy; Rf = rc+rb*yy
    t = top if top is not None else y0; b_ = bottom if bottom is not None else y1
    out_rgb = a[..., :3].copy(); out_a = (al*255).astype(np.uint8)
    added = 0
    for y in range(t, b_+1):
        good = np.where(al[y])[0]
        if len(good) < 10: continue
        lo = int(round(Lf[y])) if sides in ('both','left') else int(L[y])
        hi = int(round(Rf[y])) if sides in ('both','right') else int(R[y])
        lo = max(lo, 0); hi = min(hi, W-1)
        for x in range(lo, hi+1):
            if al[y, x]: continue
            d = np.abs(good - x); out_rgb[y, x] = a[y, int(good[d.argmin()]), :3]
            out_a[y, x] = 255; added += 1
    alpha = Image.fromarray(out_a).filter(ImageFilter.GaussianBlur(feather))
    res = Image.fromarray(out_rgb).convert('RGBA'); res.putalpha(alpha)
    res = res.crop(res.getbbox()); res.save(out)
    print(out, res.size, f'L {lc:.0f}{lb:+.3f}y  R {rc:.0f}{rb:+.3f}y  filled {added}px')
    return res
