"""Matte an edited (hands-removed) image with BiRefNet and split it into one PNG per cup,
by connected component, left to right."""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage
os.chdir('C:/Users/Circl/the-fix')
from rembg import remove, new_session

src, prefix = sys.argv[1], sys.argv[2]
names = sys.argv[3].split(',') if len(sys.argv) > 3 else None
im = Image.open(src).convert('RGB')
sess = new_session('birefnet-general-lite')
m = np.array(remove(im, session=sess, only_mask=True)).astype(np.float32)
m[m < 26] = 0
lab, n = ndimage.label(m > 100)
sizes = ndimage.sum(m > 100, lab, range(1, n + 1))
big = [i + 1 for i in np.argsort(sizes)[::-1] if sizes[i] > 0.02 * m.size]
objs = sorted(big, key=lambda k: np.where(lab == k)[1].mean())
print('components', n, 'cups', len(objs))
for idx, k in enumerate(objs):
    # this cup's alpha: the matte, restricted to a dilation of its own component
    region = ndimage.binary_dilation(lab == k, iterations=6)
    a = np.where(region, m, 0).astype(np.uint8)
    out = im.convert('RGBA'); out.putalpha(Image.fromarray(a))
    out = out.crop(out.getbbox())
    name = names[idx] if names and idx < len(names) else str(idx)
    path = '%s_%s.png' % (prefix, name)
    out.save(path); print(path, out.size)
