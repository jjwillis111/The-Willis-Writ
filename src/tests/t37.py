from t3 import *
def desk(pg,o):
    pg.screenshot(path=o+'_home.png')
    pg.click('.hot-globe'); pg.wait_for_timeout(3500); pg.screenshot(path=o+'_news.png')
def mob(pg,o):
    pg.screenshot(path=o+'_home.png')
    pg.click('.hot-globe'); pg.wait_for_timeout(3500); pg.screenshot(path=o+'_news.png')
run({'width':1440,'height':810},'v_d',desk)
run({'width':390,'height':844},'v_m',mob,mobile=True)
