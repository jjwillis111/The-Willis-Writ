from t3 import *
def flow(pg,o):
    pg.add_init_script("window.__K=8"); pg.reload(wait_until='domcontentloaded'); pg.wait_for_timeout(2400)
    pg.click('.hot-book[data-id="about"]'); pg.wait_for_timeout(14000)
    pg.click('#btn-next'); pg.wait_for_timeout(9000)
    pg.keyboard.press('Escape')
    clip={'x':440,'y':60,'width':200,'height':150}
    for i in range(16):
        pg.wait_for_timeout(450)
        pg.screenshot(path=o+'_s%02d.png'%i,clip=clip)
        print(i, pg.evaluate("document.querySelector('.book')&&document.querySelector('.book').className"))
run({'width':1440,'height':810},'sl',flow)
