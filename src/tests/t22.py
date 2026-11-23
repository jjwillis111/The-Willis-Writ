from t3 import *
def isopen(pg): return pg.evaluate("document.querySelector('#stage').classList.contains('on')")
def flow(pg,o):
    # book: tap on book must not close, tap on background must
    pg.click('.hot-about, [data-id=about], .hot[aria-label*=About]') if False else None
    pg.evaluate("document.querySelectorAll('button').forEach(b=>{})")
    hs=pg.evaluate("Array.from(document.querySelectorAll('[class*=hot]')).map(e=>e.className+'|'+(e.getAttribute('aria-label')||e.textContent).slice(0,20))")
    print(hs)
    pg.click('.hot-bust') if False else None
    # open About by class order: first non-globe/bust hot
    sel=pg.evaluate("(function(){var e=Array.from(document.querySelectorAll('[class*=hot]')).filter(x=>!/globe|bust/.test(x.className))[0];e.setAttribute('data-t','1');return e.className})()")
    pg.click('[data-t=\"1\"]'); pg.wait_for_timeout(3000)
    print('book open',isopen(pg)); pg.screenshot(path=o+'_b0.png')
    bb=pg.evaluate("(function(){var r=document.querySelector('.book').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")
    pg.mouse.click(bb[0],bb[1]); pg.wait_for_timeout(1500); print('after tap on book',isopen(pg))
    pg.mouse.click(195,150); pg.wait_for_timeout(3000); print('after bg tap',isopen(pg))
    # newspaper
    pg.click('.hot-globe'); pg.wait_for_timeout(3000); print('paper open',isopen(pg))
    bb=pg.evaluate("(function(){var r=document.querySelector('.paper').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")
    pg.mouse.click(bb[0],bb[1]); pg.wait_for_timeout(1200); print('after tap on paper',isopen(pg))
    pg.mouse.click(195,12); pg.wait_for_timeout(3000); print('after bg tap',isopen(pg))
run({'width':390,"height":844},'ta',flow,mobile=True)
