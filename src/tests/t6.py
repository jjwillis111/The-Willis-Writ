from t3 import *
def flow(pg,o):
    st=lambda: pg.evaluate("[document.querySelector('#stage').className, document.querySelector('#room').hasAttribute('inert'), getComputedStyle(document.querySelector('#fly')).display, document.querySelector('#fly').children.length, document.querySelectorAll('.hs').length && [...document.querySelectorAll('.hs')].map(h=>h.style.visibility).join(','), [...document.querySelectorAll('.slot.on')].length]")
    pg.click('.hot-book[data-id="research"]'); pg.wait_for_timeout(4200)
    print('open',st())
    pg.click('#btn-next'); pg.wait_for_timeout(1300)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(1800); pg.screenshot(path=o+'_closing.png'); pg.wait_for_timeout(2800)
    print('closed',st(), pg.evaluate("document.activeElement.className+'|'+(document.activeElement.dataset.id||'')"))
    pg.screenshot(path=o+'_closed.png')
    # contact via nav (no shelf book)
    pg.click('.nv[data-vol="contact"]'); pg.wait_for_timeout(1000); pg.screenshot(path=o+'_c1.png'); pg.wait_for_timeout(3300); pg.screenshot(path=o+'_contact.png')
    print('contact',st())
    pg.click('#btn-close'); pg.wait_for_timeout(4500)
    print('closed2',st(), pg.evaluate("document.activeElement.className+'|'+(document.activeElement.dataset.vol||'')"))
    # link between volumes: About -> Contact link
    pg.click('.hot-book[data-id="about"]'); pg.wait_for_timeout(4200)
    for i in range(2):
        pg.click('#btn-next'); pg.wait_for_timeout(1300)
    pg.screenshot(path=o+'_looking.png')
    pg.click('.book a[data-open="experience"]'); pg.wait_for_timeout(9500)
    print('after link', st(), pg.inner_text('#vtitle'))
    pg.screenshot(path=o+'_afterlink.png')
run({'width':1440,'height':810},'fl',flow)
