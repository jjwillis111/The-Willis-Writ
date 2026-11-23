from t3 import *
VPW=int(sys.argv[1]) if len(sys.argv)>1 else 1440
def flow(pg,o):
    pg.click('.hot-globe'); pg.wait_for_timeout(3500)
    pg.screenshot(path=o+'_n0.png')
    pg.evaluate("document.querySelector('.p-scroll').scrollTop=75"); pg.wait_for_timeout(300); pg.screenshot(path=o+'_n1.png')
    pg.evaluate("document.querySelector('.p-scroll').scrollTop=600"); pg.wait_for_timeout(300); pg.screenshot(path=o+'_n2.png')
    pg.click('.p-tab:nth-child(5)'); pg.wait_for_timeout(500); pg.screenshot(path=o+'_n3.png')
    print(pg.evaluate("document.querySelector('.p-scroll').scrollTop"))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(2500)
run({'width':VPW,'height':810 if VPW>800 else 900},'np',flow,mobile=VPW<800)
