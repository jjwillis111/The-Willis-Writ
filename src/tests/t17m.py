from t3 import *
import base64, json
MODE=sys.argv[1]; VPW=int(sys.argv[2]) if len(sys.argv)>2 else 1440
def flow(pg,o):
    cdp=pg.context.new_cdp_session(pg)
    frames=[]
    def on(ev):
        frames.append((ev['metadata']['timestamp'],ev['data']))
        try: cdp.send('Page.screencastFrameAck',{'sessionId':ev['sessionId']})
        except Exception: pass
    cdp.on('Page.screencastFrame',on)
    if MODE=='close':
        pg.click('.hot-book[data-id="about"]'); pg.wait_for_timeout(4800)
        pg.click('#btn-next'); pg.wait_for_timeout(1400)
    cdp.send('Page.startScreencast',{'format':'jpeg','quality':88,'maxWidth':780,'maxHeight':1000,'everyNthFrame':1})
    pg.wait_for_timeout(300)
    marker=len(frames)
    if MODE=='open': pg.click('.hot-book[data-id="about"]')
    else: pg.keyboard.press('Escape')
    pg.wait_for_timeout(6200 if MODE=='open' else 4500)
    cdp.send('Page.stopScreencast')
    t0=frames[marker][0]
    ts=[round((t-t0)*1000) for t,_ in frames[marker:]]
    for i,(t,d) in enumerate(frames[marker:]): open(o+'_%s%03d.jpg'%(MODE[0],i),'wb').write(base64.b64decode(d))
    json.dump(ts,open(o+'_%sts.json'%MODE[0],'w')); print(len(ts),'frames')
run({'width':VPW,'height':810 if VPW>800 else 900},'mo',flow,mobile=VPW<800)
