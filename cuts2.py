"""Second pass on the cutouts: BiRefNet for the matte (much cleaner edges than u2net)
and u2net_human_seg to find the HAND exactly, so only the hand has to be repainted
and every other pixel stays the real photograph.

BiRefNet-general blows this box's memory on a 3000 px photo ("bad allocation"), so the
matte is predicted on a downscaled copy and resized back — a matte is smooth, it survives
that; the photo it is applied to stays full resolution."""
import os, sys, time
import numpy as np
from PIL import Image
os.chdir('C:/Users/Circl/the-fix')
from rembg import remove, new_session

os.makedirs('cutouts2', exist_ok=True)
SRC = ['g08', 'g03', 'g04', 'g09', 'g06']
MODEL = sys.argv[1] if len(sys.argv) > 1 else 'birefnet-general-lite'
MAXW = int(sys.argv[2]) if len(sys.argv) > 2 else 1400

t = time.time()
sess = new_session(MODEL)
human = new_session('u2net_human_seg')
print('sessions %s %.1fs' % (MODEL, time.time() - t))


def matte(im, session):
    small = im.copy()
    small.thumbnail((MAXW, MAXW), Image.LANCZOS)
    m = remove(small, session=session, only_mask=True)
    return m.resize(im.size, Image.LANCZOS)


for f in SRC:
    im = Image.open('photos/raw/%s_hi.jpg' % f).convert('RGB')
    t = time.time()
    m = matte(im, sess); h = matte(im, human)
    m.save('cutouts2/%s_matte.png' % f)
    h.save('cutouts2/%s_hand.png' % f)
    ma = np.array(m); ha = np.array(h)
    print(f, im.size, 'matte %d%% hand %d%%' % (100 * (ma > 127).mean(), 100 * (ha > 127).mean()),
          '%.1fs' % (time.time() - t))
