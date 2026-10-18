# Unpack a claude.ai "bundled page" artifact into static files.
# Usage: python3 -I scripts/unpack-artifact.py <saved-artifact.html> <out-dir>
# (save the artifact HTML via the Artifact tool "read" action first; output goes to landing-site/)
import re,json,base64,gzip,os,sys
src=sys.argv[1]; out=sys.argv[2]
s=open(src,encoding='utf-8').read()
def get(t): return re.search(r'<script type="__bundler/%s">(.*?)</script>'%t,s,re.S).group(1)
man=json.loads(get('manifest')); ext=json.loads(get('ext_resources')); tpl=json.loads(get('template'))
ext_map={e['uuid']:e['id'] for e in ext}
extmap={'image/png':'png','image/jpeg':'jpg','image/svg+xml':'svg','font/woff2':'woff2','application/javascript':'js','text/javascript':'js','text/css':'css','image/webp':'webp','image/gif':'gif'}
os.makedirs(out+'/assets',exist_ok=True)
for u,e in man.items():
    d=base64.b64decode(e['data'])
    if e.get('compressed'): d=gzip.decompress(d)
    ext_=extmap.get(e['mime'],'bin')
    fn='assets/%s.%s'%(u,ext_)
    open(out+'/'+fn,'wb').write(d)
    tpl=tpl.replace(u,fn)
    print(u,e['mime'],len(d))
for u,url in ext_map.items(): tpl=tpl.replace(u,url)
open(out+'/index.html','w',encoding='utf-8').write(tpl)
print('index bytes',len(tpl))
