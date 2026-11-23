from t3 import *
def swipe(pg,cdp,x0,y0,x1,y1,steps=6,gap=14):
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x0,'y':y0}]})
    for i in range(1,steps+1):
        pg.wait_for_timeout(gap)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x0+(x1-x0)*i/steps,'y':y0+(y1-y0)*i/steps}]})
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
def label(pg): return pg.evaluate("document.querySelector('#ui-label, .ui-label, #pg-label') ? document.querySelector('#ui-label, .ui-label, #pg-label').textContent : (Array.from(document.querySelectorAll('#uibot *')).map(e=>e.children.length?'':e.textContent).join('').trim())")
def flow(pg,o):
    cdp=pg.context.new_cdp_session(pg)
    pg.click('.hot-book[data-id="writing"]'); pg.wait_for_timeout(5000)
    print('start',label(pg))
    tests=[('plain left',300,420,120,430),('diagonal',300,300,160,420),('short flick',280,420,235,424),('drift',320,300,170,470),('back right',120,420,300,430),('rapid x2 left',300,420,120,430)]
    for name,a,b,c,d in tests:
        swipe(pg,cdp,a,b,c,d,steps=5 if 'flick' in name else 8,gap=10 if 'flick' in name else 14)
        pg.wait_for_timeout(1300 if 'rapid' not in name else 100)
        if 'rapid' in name:
            swipe(pg,cdp,300,420,120,430); pg.wait_for_timeout(2600)
        print(name,'->',label(pg))
    pg.screenshot(path=o+'.png')
run({'width':390,'height':844},'sw',flow,mobile=True)
