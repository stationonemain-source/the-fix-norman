"""Cup cutouts, pass 2.

BiRefNet gives a crisp matte that keeps the straw and the clear lid, and on four of
the five photos it drops the hand by itself. Only the two clinked ombre teas still
have a hand on them.

For those two, nothing is classified as "skin" — that failed, because a blown-out
knuckle reads the same as a highlight on the plastic. Instead the cup's sides are
fitted as straight lines from rows the hand cannot reach, and ONLY the half of the
cup the hand is on, below the row the hand starts, is repainted from the drink's own
radial profile. Everything above that row, and the whole clean half below it, is the
untouched photograph.
"""
import os
import numpy as np
from PIL import Image, ImageFilter
os.chdir('C:/Users/Circl/the-fix')


def _fit(v, ys):
    for _ in range(3):
        b, c = np.polyfit(ys, v, 1)
        r = np.abs(v - (c + b * ys)); k = r <= np.percentile(r, 75)
        if k.sum() > 10: ys, v = ys[k], v[k]
    b, c = np.polyfit(ys, v, 1)
    return c, b


def plain(src, matte, out, box=None, feather=0.8, drop=None):
    """No hand to deal with: matte the photo and save it."""
    im = Image.open(src).convert('RGB')
    m = Image.open(matte).convert('L')
    if box: im = im.crop(box); m = m.crop(box)
    a = np.array(m).astype(np.float32)
    a[a < 26] = 0                      # kill the matte's faint halo
    if drop is not None:
        a[drop(np.array(im).astype(int))] = 0
    al = Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.GaussianBlur(feather))
    res = im.convert('RGBA'); res.putalpha(al)
    res = res.crop(res.getbbox()); res.save(out)
    print(out, res.size)
    return res


def dehand(src, matte, box, out, hand='right', occ_from=None, fit_rows=(0.05, 0.34),
           rowsmooth=6, feather=0.9, sat_cup=0.30, base_round=0.04, vblend=110, hblend=34, drop=None, dbg=None):
    """Repaint only the half of the cup the hand is on, below the row it starts."""
    im = Image.open(src).convert('RGB').crop(box)
    m = np.array(Image.open(matte).convert('L').crop(box)).astype(np.float32)
    m[m < 26] = 0
    a = np.array(im); H, W, _ = a.shape
    mx = a.max(2).astype(np.float32); mn = a.min(2).astype(np.float32)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    body = (m > 100) & (sat > sat_cup)                   # the drink itself

    L = np.full(H, np.nan); R = np.full(H, np.nan)
    for y in range(H):
        xs = np.where(body[y])[0]
        if len(xs) > W * 0.10: L[y], R[y] = xs.min(), xs.max()
    rows = np.where(~np.isnan(L))[0]
    y0, y1 = rows.min(), rows.max()
    lo = y0 + int((y1 - y0) * fit_rows[0]); hi = y0 + int((y1 - y0) * fit_rows[1])
    cr = rows[(rows >= lo) & (rows <= hi)]
    ac, ab = _fit((L[cr] + R[cr]) / 2.0, cr.astype(float))
    clean = 'left' if hand == 'right' else 'right'
    ec, eb = _fit((R if clean == 'right' else L)[cr], cr.astype(float))
    yy = np.arange(H, dtype=float)
    axis = ac + ab * yy
    half = np.abs((ec + eb * yy) - axis)
    occ = occ_from if occ_from is not None else y0 + int((y1 - y0) * 0.40)

    # radial profile of the clean half, median-smoothed over neighbouring rows
    RMAX = int(np.ceil(np.nanmax(half[y0:y1 + 1]))) + 2
    prof = np.full((H, RMAX, 3), np.nan, np.float32)
    for y in range(y0, y1 + 1):
        ax, hw = axis[y], half[y]
        for r in range(int(hw) + 1):
            xi = int(round(ax + r if clean == 'right' else ax - r))
            if 0 <= xi < W and body[y, xi]:
                prof[y, r] = a[y, xi]
    sm = np.full_like(prof, np.nan)
    for y in range(y0, y1 + 1):
        with np.errstate(invalid='ignore'):
            sm[y] = np.nanmedian(prof[max(y0, y - rowsmooth):min(y1, y + rowsmooth) + 1], axis=0)
    for y in range(y0, y1 + 1):
        row = sm[y]; known = np.where(np.isfinite(row[:, 0]))[0]
        if len(known) == 0: continue
        for r in range(int(half[y]) + 1):
            if not np.isfinite(row[r, 0]):
                row[r] = row[known[np.abs(known - r).argmin()]]

    # The light in this photo comes from one side, so the clean half is a shade
    # brighter or cooler than the half being repainted. Measure that difference on
    # the rows just ABOVE the hand, where both halves are real, and carry it over —
    # without it the repaint starts with a visible step across the drink.
    num = np.zeros(3); den = np.zeros(3)
    for y in range(max(y0, occ - 70), occ):
        ax, hw = axis[y], half[y]
        if not np.isfinite(hw) or hw < 8: continue
        row = sm[y]
        if not np.isfinite(row[0, 0]): continue
        rng = range(int(ax) + 1, min(int(ax + hw), W - 1)) if hand == 'right'             else range(max(int(ax - hw), 0), int(ax))
        for x in rng:
            if not body[y, x]: continue
            r = min(int(round(abs(x - ax))), RMAX - 1)
            if not np.isfinite(row[r, 0]): continue
            num += a[y, x]; den += row[r]
    # LUMINANCE only, and barely: a per-channel gain on a red drink (G~50, B~36)
    # turns 20% into a hue shift and the repaint comes out orange.
    W_L = np.array([0.2126, 0.7152, 0.0722])
    gain = float(np.clip((num @ W_L) / max(den @ W_L, 1e-6), 0.90, 1.10)) if den.min() > 0 else 1.0

    out_rgb = a.copy()
    out_a = m.copy()
    out_a[occ:] = 0                                      # below the hand, only the silhouette counts
    filled = 0
    for y in range(occ, y1 + 1):
        ax, hw = axis[y], half[y]
        if not np.isfinite(hw) or hw < 8: continue
        if base_round > 0:                               # round the last rows into a base
            d = (y1 - y) / max(y1 - y0, 1)
            if d < base_round:
                hw = hw * float(np.sqrt(max(0.0, 1 - ((base_round - d) / base_round) ** 2)))
        row = sm[y]
        if not np.isfinite(row[0, 0]): continue
        x_lo, x_hi = max(int(round(ax - hw)), 0), min(int(round(ax + hw)), W - 1)
        for x in range(x_lo, x_hi + 1):
            on_hand = (x > ax) if hand == 'right' else (x < ax)
            if not on_hand:
                if m[y, x] > 100:                        # clean half: the photograph stands
                    out_a[y, x] = m[y, x]; continue
            r = min(int(round(abs(x - ax))), RMAX - 1)
            if not np.isfinite(row[r, 0]): continue
            v = row[r] * gain
            # Feather the two joins, but ONLY where the photograph underneath is
            # already close to what is being painted. Without that guard the fade
            # lets a thumb-tip ghost through, which is exactly what it did.
            t = 1.0
            if vblend and y < occ + vblend:
                t = min(t, (y - occ) / float(vblend))
            if hblend:
                t = min(t, abs(x - ax) / float(hblend))
            if t < 1.0 and np.abs(a[y, x].astype(float) - v).max() < 48:
                v = v * t + a[y, x] * (1 - t)
            out_rgb[y, x] = np.clip(v, 0, 255).astype(np.uint8)
            out_a[y, x] = 255
            if on_hand: filled += 1
    if drop is not None:
        out_a[drop(out_rgb.astype(int))] = 0
    al = Image.fromarray(out_a.astype(np.uint8)).filter(ImageFilter.GaussianBlur(feather))
    res = Image.fromarray(out_rgb).convert('RGBA'); res.putalpha(al)
    res = res.crop(res.getbbox()); res.save(out)
    tot = (m > 100).sum()
    print(out, res.size, 'repainted %d px = %.0f%% of the cut, occ row %d, gain %s'
          % (filled, 100.0 * filled / max(tot, 1), occ, round(gain, 3)))
    return res


def straighten(path, deg):
    """Stand a cup upright. PIL rotates counter-clockwise; a cup whose top leans
    right needs a positive angle."""
    im = Image.open(path).convert('RGBA')
    pad = int(max(im.size) * 0.15)
    big = Image.new('RGBA', (im.size[0] + 2 * pad, im.size[1] + 2 * pad), (0, 0, 0, 0))
    big.paste(im, (pad, pad))
    r = big.rotate(deg, resample=Image.BICUBIC, expand=True)
    r = r.crop(r.getbbox()); r.save(path)
    print('straighten', path, deg, r.size)
