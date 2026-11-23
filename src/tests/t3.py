import sys
from playwright.sync_api import sync_playwright
import os
URL=os.environ.get('URL','file:///home/claude/site2/index.html')
out='/home/claude/shots/'
FD='/home/claude/fonttmp/node_modules/@fontsource/'
css=''
for fam,dirn,faces in [('Cormorant Garamond','cormorant-garamond',[(400,'normal'),(500,'normal'),(600,'normal'),(700,'normal'),(400,'italic'),(500,'italic')]),
                       ('EB Garamond','eb-garamond',[(400,'normal'),(500,'normal'),(400,'italic')])]:
    for w,st in faces:
        css+="@font-face{font-family:'%s';font-weight:%d;font-style:%s;src:url('file://%s%s/files/%s-latin-%d-%s.woff2') format('woff2');}\n"%(fam,w,st,FD,dirn,dirn,w,st)
def run(vp,name,actions,mobile=False):
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--allow-file-access-from-files'])
        ctx=b.new_context(viewport=vp,device_scale_factor=2 if mobile else 1,has_touch=mobile,is_mobile=mobile)
        pg=ctx.new_page()
        errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('console',lambda m: errs.append('console:'+m.text) if m.type=='error' else None)
        pg.route('**/fonts.googleapis.com/**',lambda r: r.fulfill(status=200,content_type='text/css',body=css))
        pg.route('**/fonts.gstatic.com/**',lambda r: r.abort())
        pg.goto(URL,wait_until='domcontentloaded'); pg.wait_for_timeout(2400)
        actions(pg,out+name)
        print(name,'errors',errs)
        b.close()
def desk(pg,o):
    pg.screenshot(path=o+'_idle.png')
    pg.hover('.hot-book[data-id="experience"]'); pg.wait_for_timeout(500); pg.screenshot(path=o+'_hover.png')
    pg.click('.hot-book[data-id="about"]')
    pg.wait_for_timeout(300); pg.screenshot(path=o+'_a1.png')
    pg.wait_for_timeout(700); pg.screenshot(path=o+'_a2.png')
    pg.wait_for_timeout(900); pg.screenshot(path=o+'_a3.png')
    pg.wait_for_timeout(1200); pg.screenshot(path=o+'_cover.png')
    pg.wait_for_timeout(2400); pg.screenshot(path=o+'_open.png')
    pg.click('#btn-next'); pg.wait_for_timeout(1500); pg.screenshot(path=o+'_p2.png')
if __name__=='__main__':
    run({'width':1672,'height':941},'d',desk)
