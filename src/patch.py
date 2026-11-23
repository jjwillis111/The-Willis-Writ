import re, base64
src=open('/home/claude/build/index.v1.html',encoding='utf-8').read()
css=open('/home/claude/build/new.css',encoding='utf-8').read()

def svg(w,h,inner):
    return 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'%d\' height=\'%d\'>%s</svg>")'%(w,h,inner)
def noise(w,h,freq,octv,seed,matrix):
    return svg(w,h,"<filter id='f' x='0' y='0' width='100%%25' height='100%%25'><feTurbulence type='fractalNoise' baseFrequency='%s' numOctaves='%d' seed='%d'/><feColorMatrix values='%s'/></filter><rect width='100%%25' height='100%%25' filter='url(%%23f)'/>"%(freq,octv,seed,matrix))
tok={
 'LEATHER': noise(180,180,'.85',2,3,'0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 -.08'),
 'PAPER':   noise(220,220,'.55 .9',2,11,'0 0 0 0 .32  0 0 0 0 .24  0 0 0 0 .12  0 0 0 .20 0'),
 'WOOD':    noise(1000,500,'.0035 .20',4,5,'0 0 0 0 .05  0 0 0 0 .02  0 0 0 0 0  0 0 0 1.3 -.38'),
 'WOODV':   noise(300,900,'.18 .003',3,8,'0 0 0 0 .04  0 0 0 0 .02  0 0 0 0 0  0 0 0 1.1 -.3'),
 'GRAIN':   noise(240,240,'.8',1,9,'1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 .1 0'),
 'FONT':    base64.b64encode(open('/home/claude/userfont/jsl.woff2','rb').read()).decode(),
}
for k,v in tok.items(): css=css.replace('{{%s}}'%k,v)
assert '{{' not in css

# 1. swap first style block
m=re.search(r'<style>.*?</style>',src,flags=re.S)
src=src[:m.start()]+'<style>\n'+css+'</style>'+src[m.end():]

# 2. fonts link
src=re.sub(r'<link href="https://fonts.googleapis.com/css2[^"]*" rel="stylesheet">',
 '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">',src)

def rep(a,b,count=1,regex=False,flags=0):
    global src
    if regex:
        new,n=re.subn(a,b,src,count=0 if count==0 else count,flags=flags)
        assert n>=1,a
        src=new
    else:
        assert a in src,a
        src=src.replace(a,b) if count==0 else src.replace(a,b,count)

# 3. HTML
rep('<h1>Jackson Willis</h1>\n        <p id="hint"','<h1>Jackson Willis</h1>\n        <div class="rule"></div>\n        <p id="hint"')
rep(r'<svg width="0" height="0" style="position:absolute".*?</svg>\n\n','',regex=True,flags=re.S)
rep('<svg class="ico"><use href="#scales"/></svg>','<div class="mono">JW</div>',count=0)
rep(r'<div id="gavel".*?</svg>\n      </div>\n\n      <div id="nameplate"','<div id="nameplate"',regex=True,flags=re.S)
rep(r'\n      <div id="lamp".*?</svg>\n      </div>\n','\n      <div id="pen" aria-hidden="true">\n        <svg viewBox="0 0 240 26">\n          <defs>\n            <linearGradient id="pn-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a404c"/><stop offset=".3" stop-color="#12151b"/><stop offset=".75" stop-color="#07090c"/><stop offset="1" stop-color="#1b1e25"/></linearGradient>\n            <linearGradient id="pn-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8d295"/><stop offset=".5" stop-color="#a98443"/><stop offset="1" stop-color="#d5ba7c"/></linearGradient>\n          </defs>\n          <rect x="44" y="6" width="176" height="14" rx="7" fill="url(#pn-b)"/>\n          <rect x="52" y="8" width="150" height="2" rx="1" fill="#fff" opacity=".2"/>\n          <rect x="176" y="5.5" width="5" height="15" fill="url(#pn-g)"/>\n          <rect x="206" y="5.5" width="3" height="15" fill="url(#pn-g)"/>\n          <path d="M46 7Q24 9 6 13Q24 17 46 19Z" fill="url(#pn-b)"/>\n          <path d="M24 10.5L6 13L24 15.5Z" fill="url(#pn-g)"/>\n        </svg>\n      </div>\n',regex=True,flags=re.S)
rep('    <div id="desk">','    <div id="light"></div>\n    <div id="desk">')
rep('  <div id="stage" role="dialog"','  <div id="fx"></div>\n\n  <div id="stage" role="dialog"')

# 4. JS
# mkFiller
a=src.index('  var FILL = ['); b=src.index('  function buildShelves() {')
new_fill = '''  var FILL = ['#5a2328', '#1e2f4a', '#25402f', '#4f3520', '#37283d', '#262626', '#6a2c2c', '#3e2c1a', '#2f4553', '#51421f', '#3b3326', '#4a1f2e'];
  var items = [];   // { el, row, w, hf }
  var featItems = [];
  var pileEl = null;

  function mkFiller(row) {
    var e = el('div', 'bk'), f = { el: e, row: row, w: 0, hf: 0 };
    if (rand() < 0.34) {
      e.className += ' rep';
      f.w = 24 + rand() * 10; f.hf = 0.8 + rand() * 0.14;
      e.innerHTML = '<i class="tl a"></i><i class="pl r"></i><i class="pl k"><b>' + (100 + Math.floor(rand() * 800)) + '</b></i><i class="tl b"></i>';
    } else {
      e.style.backgroundColor = FILL[Math.floor(rand() * FILL.length)];
      f.w = 18 + rand() * 22; f.hf = 0.7 + rand() * 0.26;
      var v = rand();
      e.innerHTML = '<i class="band t1"></i><i class="band t2"></i><i class="band t4"></i>' + (v < 0.55 ? '<i class="pn"></i>' : '') + (v > 0.3 ? '<i class="band t3"></i>' : '');
    }
    if (rand() < 0.16) { e.className += ' back'; f.hf *= 0.92; }
    items.push(f);
    return e;
  }

'''
src=src[:a]+new_fill+src[b:]

# buildShelves: scales -> pile
a=src.index("    scalesEl = el('div', 'decor',"); b=src.index("    for (i = 0; i < 30; i++) rowUp.appendChild(mkFiller('up'));")
src=src[:a]+'''    pileEl = el('div', 'pile');
    [['#4b1f2a', 92, 17], ['#24384f', 74, 15], ['#3f3a2a', 84, 16]].forEach(function (p, i) {
      var h = el('div', 'hb'); h.style.backgroundColor = p[0];
      h.setAttribute('data-w', p[1]); h.setAttribute('data-h', p[2]); h.style.marginLeft = (i * 3 - 3) + 'px';
      pileEl.appendChild(h);
    });
    rowUp.appendChild(pileEl);
'''+src[b:]
rep("""        '<i class="b1"></i><i class="b2"></i><i class="b3"></i><span class="ft">""","""        '<i class="band t1"></i><i class="band t2"></i><i class="band t3"></i><i class="band t4"></i><span class="ft">""")
rep("    for (i = 0; i < 16; i++) rowLow.appendChild(mkFiller('low'));\n  }","    for (i = 0; i < 16; i++) rowLow.appendChild(mkFiller('low'));\n    rowUp.children[10].classList.add('lean');\n    rowLow.children[13].classList.add('lean');\n  }")
# layout: scales sizing -> pile + light
a=src.index("    var sh = Math.round(upH * 0.82);"); b=src.index("    if (S.open && !S.busy) rebuildOpen();")
src=src[:a]+"""    $$('.hb', pileEl).forEach(function (h) {
      h.style.width = Math.round(h.getAttribute('data-w') * sc) + 'px';
      h.style.height = Math.round(h.getAttribute('data-h') * sc) + 'px';
    });
    $('#light').style.height = Math.round(wallH + H * 0.5) + 'px';

"""+src[b:]
# cover
a=src.index("  function coverHTML(v) {"); b=src.index("  function fillFace(")
src=src[:a]+"""  function coverHTML(v) {
    return '<i class="hinge"></i><div class="cf-frame"></div><div class="cf-in"><div class="mono">JW</div>' +
           '<div class="cf-rule"></div><h2>' + esc(v.label) + '</h2><div class="cf-rule"></div><p>' + esc(v.sub) + '</p></div>';
  }

"""+src[b:]
# stacks
rep("var kl = el('div', 'blk bl'), kr = el('div', 'blk br');","var kl = el('div', 'stk l'), kr = el('div', 'stk r');")
rep("S.dual = d; S.leaves = leaves;","S.stkL = kl; S.stkR = kr; S.stkT = clamp(P * 0.02, 5, 9);\n    S.dual = d; S.leaves = leaves;")
rep("    if (S.hotL) { S.hotL.disabled = s <= 1; S.hotR.disabled = s >= S.total; }\n  }","""    if (S.hotL) { S.hotL.disabled = s <= 1; S.hotR.disabled = s >= S.total; }
    setStacks();
  }

  function setStacks() {
    if (!S.stkL) return;
    var s = S.spread, T = S.stkT, wl = 0, wr = 0, p;
    if (s >= 1) {
      p = (s - 1) / Math.max(1, S.total - 1);
      if (S.dual) { wl = T * p + 2; wr = T * (1 - p) + 2; } else { wr = T * (1 - p) + 2; }
    }
    S.stkL.style.width = Math.round(wl) + 'px';
    S.stkR.style.width = Math.round(wr) + 'px';
  }""")
# remove obsolete lamp/gavel css refs none. cover h2 size tweak
src=src.replace("font: 600 1.9em/1.1 'Cormorant Garamond', Georgia, serif; letter-spacing: .3em; text-indent: .3em; text-transform: uppercase;\n  color: transparent;","font: 600 1.7em/1.1 'Cormorant Garamond', Georgia, serif; letter-spacing: .26em; text-indent: .26em; text-transform: uppercase;\n  color: transparent;")
open('/home/claude/site/index.html','w',encoding='utf-8').write(src)
print('written',len(src))
