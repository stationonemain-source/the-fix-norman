"""Post-steps on the two rebuilt ombre cups: drop the neighbouring cup's sliver out
of the lid rows, then stand the cup upright (both were photographed tilted, and a
tilted cup floating in a void reads as a mistake rather than as a photograph)."""
import os
import numpy as np
from PIL import Image
os.chdir('C:/Users/Circl/the-fix')


def strip_foreign(path, rule, upto=0.42):
    im = Image.open(path).convert('RGBA'); a = np.array(im)
    h = a.shape[0]
    m = rule(a.astype(int))
    m[int(h * upto):] = False
    a[..., 3][m] = 0
    im2 = Image.fromarray(a); im2 = im2.crop(im2.getbbox()); im2.save(path)
    print('strip_foreign', path, int(m.sum()), 'px')


def straighten(path, deg):
    im = Image.open(path).convert('RGBA')
    pad = int(max(im.size) * 0.15)
    big = Image.new('RGBA', (im.size[0] + 2 * pad, im.size[1] + 2 * pad), (0, 0, 0, 0))
    big.paste(im, (pad, pad))
    r = big.rotate(deg, resample=Image.BICUBIC, expand=True)
    r = r.crop(r.getbbox()); r.save(path)
    print('straighten', path, deg, r.size)


# the red cup's edge clips into the rainbow crop at the lid: red-dominant pixels there are not ours
strip_foreign('cutouts/f_rainbow.png', lambda a: (a[..., 0] > a[..., 2] + 40) & (a[..., 3] > 0))
# the blue cup's edge does the same on the right of the sunset crop
strip_foreign('cutouts/f_sunset.png', lambda a: (a[..., 2] > a[..., 0] + 40) & (a[..., 3] > 0))

straighten('cutouts/f_rainbow.png', 4.2)
straighten('cutouts/f_sunset.png', 7.5)
