from t3 import *
VPW=int(sys.argv[1]) if len(sys.argv)>1 else 1440
def flow(pg,o):
    pg.click('.hot-book[data-id="experience"]'); pg.wait_for_timeout(4800); pg.screenshot(path=o+'_exp0.png')
    pg.click('#btn-close'); pg.wait_for_timeout(2600)
    pg.click('.hot-book[data-id="about"]'); pg.wait_for_timeout(4800)
    k=0
    while pg.is_enabled('#btn-next') and k<6:
        pg.click('#btn-next'); pg.wait_for_timeout(1500); k+=1; pg.screenshot(path=o+'_about%d.png'%k)
    print('about spreads',k)
    pg.click('#btn-close'); pg.wait_for_timeout(2600)
    pg.screenshot(path=o+'_home.png')
run({'width':VPW,'height':810 if VPW>800 else 844},'rm',flow,mobile=VPW<800)
