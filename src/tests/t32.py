from t3 import *
import json
def flow(pg,o):
    pg.click('.hot-book[data-id="about"]'); pg.wait_for_timeout(4800)
    pg.click('#btn-next'); pg.wait_for_timeout(1500)
    pg.evaluate("""(function(){
      window.__log=[]; var t0=performance.now();
      function r(el){ if(!el) return null; var b=el.getBoundingClientRect(); return [Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)]; }
      function tick(){
        var bk=document.querySelector('.book'); 
        if(bk){
          var cov=bk.querySelector('.leaf.cover');
          window.__log.push([Math.round(performance.now()-t0), bk.className, r(bk.querySelector('.stk.l')), r(bk.querySelector('.stk.r')), r(bk.querySelector('.bd.br')), r(bk.querySelector('.bd.bl')), r(cov), cov? cov.style.zIndex:'' ]);
        }
        if(performance.now()-t0<3000) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    })()""")
    pg.keyboard.press('Escape'); pg.wait_for_timeout(3200)
    log=pg.evaluate("window.__log")
    last=None
    for row in log[::4]:
        print(row)
run({'width':1440,'height':810},'cl',flow)
