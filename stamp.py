"""Re-stamp the ?v= cache-busters in site/index.html. Run after ANY change to css/js.
A phone that visited before will otherwise run the old engine against the new markup."""
import io, re, time, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
p = 'site/index.html'
s = io.open(p, encoding='utf-8').read()
st = time.strftime('%Y%m%d%H%M')
s2 = s.replace('DEPLOYSTAMP', st)
s2 = re.sub(r'\?v=\d{12}', '?v=' + st, s2)
io.open(p, 'w', encoding='utf-8').write(s2)
print('stamped', st, '->', len(re.findall(r'\?v=' + st, s2)), 'urls')
