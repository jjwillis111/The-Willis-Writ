from t3 import *
VPW=int(sys.argv[1]) if len(sys.argv)>1 else 1440
def flow(pg,o):
    pg.screenshot(path=o+'_j0.png')
    pg.hover('.hot-bust'); pg.wait_for_timeout(500); pg.screenshot(path=o+'_j1.png')
    pg.click('.hot-bust'); pg.wait_for_timeout(2300); pg.screenshot(path=o+'_j2.png')
    pg.wait_for_timeout(4500); pg.screenshot(path=o+'_j3.png')
    print(pg.evaluate("document.querySelector('.lt-to').textContent+' | '+document.querySelector('.lt-date').textContent"))
    if VPW<800:
        pg.mouse.click(8,300)
    else:
        pg.keyboard.press('Escape')
    pg.wait_for_timeout(2600); print('open after close:',pg.evaluate("document.querySelector('#stage').classList.contains('on')"))
run({'width':VPW,'height':810 if VPW>800 else 900},'jf',flow,mobile=VPW<800)
