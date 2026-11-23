from t3 import *
def mob(pg,o):
    pg.tap('.hot-book[data-id="research"]'); pg.wait_for_timeout(700); pg.screenshot(path=o+'_fly.png')
    pg.wait_for_timeout(3800); pg.screenshot(path=o+'_open.png')
    pg.tap('#btn-next'); pg.wait_for_timeout(1400); pg.screenshot(path=o+'_p2.png')
    pg.tap('#btn-close'); pg.wait_for_timeout(5000)
    print(pg.evaluate("[document.querySelector('#stage').className, document.querySelector('#room').hasAttribute('inert')]"))
    pg.tap('.nv[data-vol="contact"]'); pg.wait_for_timeout(3800); pg.screenshot(path=o+'_contact.png')
run({'width':390,'height':844},'mm',mob,True)
