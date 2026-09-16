"""Cut out a hands-removed cup edit (edits/one_*.png), stand it upright by fitting the
cup's own axis, and save it as the hero cutout."""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage
os.chdir('C:/Users/Circl/the-fix')
from rembg import remove, new_session

sess = new_session('birefnet-general-lite')


def cut(src, out):
    im = Image.open(src).convert('RGB')
    small = im.copy(); small.thumbnail((1024, 1024), Image.LANCZOS)   # full size exhausts this box's memory
    m = np.array(remove(small, session=sess, only_mask=True).resize(im.size, Image.LANCZOS)).astype(np.float32)
    m[m < 26] = 0
    lab, n = ndimage.label(m > 100)
    keep = 1 + int(np.argmax(ndimage.sum(m > 100, lab, range(1, n + 1))))
    m[~ndimage.binary_dilation(lab == keep, iterations=4)] = 0     # drop specks
    a = np.array(im); H, W = m.shape
    mx = a.max(2).astype(float); mn = a.min(2).astype(float)
    body = (m > 150) & ((mx - mn) / np.maximum(mx, 1) > 0.35)       # the coloured drink, not lid/straw
    ys, cx = [], []
    for y in range(H):
        xs = np.where(body[y])[0]
        if len(xs) > 40: ys.append(y); cx.append((xs.min() + xs.max()) / 2)
    ys = np.array(ys); cx = np.array(cx)
    lo, hi = np.percentile(ys, 12), np.percentile(ys, 70)            # skip the lid flare and the base curve
    k = (ys >= lo) & (ys <= hi)
    slope = np.polyfit(ys[k], cx[k], 1)[0]                           # dx per dy along the axis
    deg = float(np.degrees(np.arctan(slope)))
    rgba = im.convert('RGBA'); rgba.putalpha(Image.fromarray(m.astype(np.uint8)))
    rgba = rgba.crop(rgba.getbbox())
    pad = int(max(rgba.size) * 0.12)
    big = Image.new('RGBA', (rgba.size[0] + 2 * pad, rgba.size[1] + 2 * pad), (0, 0, 0, 0))
    big.paste(rgba, (pad, pad))
    # top leaning right = negative slope in image coords (x falls as y grows) -> rotate CCW
    big = big.rotate(-deg, resample=Image.BICUBIC, expand=True)
    big = big.crop(big.getbbox()); big.save(out)
    print(out, big.size, 'axis lean %.1f deg corrected' % deg)


# one cup per process: two BiRefNet runs in one process exhaust this box's memory
JOBS = {'sunset': ('edits/one_left.png', 'cutouts/f_sunset.png'),
        'rainbow': ('edits/one_right.png', 'cutouts/f_rainbow.png'),
        'sprinkle': ('edits/one_sprinkle.png', 'cutouts/f_sprinkle.png')}
for name in (sys.argv[1:] or ['sunset']):
    cut(*JOBS[name])
