import os
os.chdir('C:/Users/Circl/the-fix')
import numpy as np
from PIL import Image
import importlib, repair
importlib.reload(repair)

# the four BiRefNet cut clean on its own
repair.plain('photos/raw/g03_hi.jpg', 'cutouts2/g03_matte.png', 'cutouts/f_pink.png')
# The pink photo has a second straw leaning in the holder behind the cup; cut out, it
# floats beside the lid. Keep only the largest connected piece (the cup and its own straw).
from scipy import ndimage
_a = np.array(Image.open('cutouts/f_pink.png')); _m = _a[..., 3] > 40
_lab, _n = ndimage.label(_m)
_a[..., 3][_lab != 1 + int(np.argmax(ndimage.sum(_m, _lab, range(1, _n + 1))))] = 0
_o = Image.fromarray(_a); _o.crop(_o.getbbox()).save('cutouts/f_pink.png')
repair.plain('photos/raw/g04_hi.jpg', 'cutouts2/g04_matte.png', 'cutouts/f_shake.png')
repair.plain('photos/raw/g09_hi.jpg', 'cutouts2/g09_matte.png', 'cutouts/f_sprinkle.png')
repair.plain('photos/raw/g06_hi.jpg', 'cutouts2/g06_matte.png', 'cutouts/f_green.png')

# The two clinked teas. Crop each clear of its neighbour (the red cup ends x<=533, the
# blue starts x>=545), then drop anything that is unmistakably the OTHER cup's colour,
# and anything near-black (the sleeve, and a stray straw tip) — neither belongs to a
# backlit drink.
dark = lambda a: a.max(2) < 58
red_in_blue = lambda a: ((a[..., 0] > a[..., 2] + 45) & (a[..., 1] < a[..., 2] + 20)) | dark(a)
blue_in_red = lambda a: (a[..., 2] > a[..., 0] + 45) | dark(a)
repair.dehand('photos/raw/g08_hi.jpg', 'cutouts2/g08_matte.png', (528, 0, 1010, 1060),
              'cutouts/f_rainbow.png', hand='right', occ_from=545, fit_rows=(0.03, 0.32),
              drop=red_in_blue)
repair.dehand('photos/raw/g08_hi.jpg', 'cutouts2/g08_matte.png', (150, 0, 540, 930),
              'cutouts/f_sunset.png', hand='left', occ_from=380, fit_rows=(0.03, 0.28),
              drop=blue_in_red)

# Both were photographed tilted (they are being clinked together). A tilted cup
# floating in a void reads as a mistake, so stand them up.
repair.straighten('cutouts/f_rainbow.png', 4.2)
repair.straighten('cutouts/f_sunset.png', 7.5)

files = ['cutouts/f_rainbow.png', 'cutouts/f_sunset.png', 'cutouts/f_pink.png',
         'cutouts/f_shake.png', 'cutouts/f_sprinkle.png', 'cutouts/f_green.png']
W, H = 330, 780
sheet = Image.new('RGB', (W * len(files), H), (9, 9, 11))
for i, f in enumerate(files):
    im = Image.open(f); im.thumbnail((W - 16, H - 20))
    sheet.paste(im, (i * W + (W - im.size[0]) // 2, (H - im.size[1]) // 2), im)
sheet.save('verify/cups_v2.jpg', quality=92)
print('sheet ok')
