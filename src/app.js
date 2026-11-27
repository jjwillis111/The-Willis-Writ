(function () {
  'use strict';

  /* ==================================================================
     Helpers
     ================================================================== */
  var doc = document;
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var K = reduce ? 0.02 : (window.__K || 1);                       // time multiplier for all animations
  document.documentElement.style.setProperty('--K', K);                 // CSS transitions that must follow K read this
  function later(ms, fn) { return setTimeout(fn, ms * K); }

  /* ==================================================================
     Settings you may want to edit
     ================================================================== */
  var PLATES = {
    l: { img: 'library-v2.jpg', w: 1910, h: 823, rect: {
      about:      [610, 275, 154, 175],
      experience: [776, 275, 152, 175],
      writing:    [941, 275, 148, 175],
      research:   [1100, 275, 157, 175],
      contact:    [1271, 275, 157, 175]
    }, globe: [1262, 98, 138, 160], bust: [645, 100, 108, 156], desk: [815, 738, 286, 58] },
    p: { img: 'library-m.jpg', w: 941, h: 1672, rect: {
      about:      [105, 539, 146, 241],
      experience: [265, 539, 144, 241],
      writing:    [426, 539, 146, 241],
      research:   [586, 539, 144, 241],
      contact:    [746, 539, 146, 241]
    }, globe: [718, 320, 162, 190], bust: [250, 332, 126, 178], desk: [281, 1348, 385, 80] }
  };
  var IW = 1910, IH = 823;
  // Colors of the board edges around the pages, matched to each cover.
  var THEMES = {
    about: '#16301a', experience: '#5e1a0e', writing: '#17243a',
    research: '#46410f', contact: '#561212'
  };
  var ICONS = {
    about: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M8 24L32 10l24 14z"/><path d="M12 28h40M12 52h40M8 57h48"/><path d="M17 32v16M27 32v16M37 32v16M47 32v16"/></svg>',
    experience: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M32 8v44M22 56h20M10 18h44"/><path d="M10 18L3 36a8 5 0 0 0 14 0zM54 18l-7 18a8 5 0 0 0 14 0z"/><circle cx="32" cy="8" r="2.4"/></svg>',
    writing: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M54 6C36 8 22 20 18 40l-4 14 14-4C44 46 54 30 54 6z"/><path d="M14 54l20-26M30 22c4 0 8 2 10 6M24 32c4 0 8 2 10 6"/></svg>',
    legal: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M8 56h50"/><path d="M12 56V40h8v16M26 56V32h8v24M40 56V38h8v18"/><path d="M10 28l14-10 10 6 22-16"/><path d="M46 8h10v10"/></svg>',
    research: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><circle cx="26" cy="26" r="16"/><path d="M38 38l20 20"/></svg>',
    contact: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><rect x="8" y="14" width="48" height="36" rx="3"/><path d="M8 18l24 18 24-18"/></svg>'
  };

  /* ==================================================================
     Read the content
     ================================================================== */
  var VOLS = [], BY = {};
  $$('#library-data .vol').forEach(function (s) {
    var v = { id: s.getAttribute('data-id'), label: s.getAttribute('data-label'),
              sub: s.getAttribute('data-sub') || '', pages: $$('.pg', s) };
    VOLS.push(v); BY[v.id] = v;
  });

  // Which logo files exist. Learned at load so pagination can leave out a logo that will not show.
  var IMGOK = {};
  $$('#library-data .orgmark img').forEach(function (im) {
    var u = im.getAttribute('src'); if (!u || u in IMGOK) return;
    var t = new Image(); t.onload = function () { IMGOK[u] = true; }; t.onerror = function () { IMGOK[u] = false; }; t.src = u;
  });

  var NEWS = { id: 'news', label: 'Legal Wire', sub: 'Law, regulation and the courts', pages: [] };
  VOLS.splice(Math.max(0, VOLS.length - 1), 0, NEWS); BY.news = NEWS;
  var JEFF = { id: 'jefferson', label: 'Thomas Jefferson', sub: '', pages: [] }; BY.jefferson = JEFF;

  var viewport = $('#viewport'), room = $('#room'), world = $('#world'), hero = $('#hero'), top = $('#top'), nav = $('#nav'), fly = $('#fly');
  var stage = $('#stage'), mount = $('#mount');
  var ui = { top: $('#uitop'), bot: $('#uibot'), title: $('#vtitle'), label: $('#plabel'),
             close: $('#btn-close'), prev: $('#btn-prev'), next: $('#btn-next'), modes: $('#viewmodes') };
  // Smallest text allowed on a phone: the size of the Jefferson plaque caption.
  var MINTXT = 11;

  /* ==================================================================
     Scene: nav buttons and clickable books
     ================================================================== */
  function pos(e, r) {
    e.style.left = (r[0] / IW * 100) + '%'; e.style.top = (r[1] / IH * 100) + '%';
    e.style.width = (r[2] / IW * 100) + '%'; e.style.height = (r[3] / IH * 100) + '%';
  }
  function coverInner(v) {
    return '<div class="cv-in"><div class="cv-ic">' + (ICONS[v.id] || '') + '</div><h2>' + esc(v.label) + '</h2></div>';
  }
  function coverImg(v) { return 'url(cover-' + v.id + '.webp)'; }

  function buildScene() {
    VOLS.forEach(function (v) {
      var nb = el('button', 'nv', esc(v.label));
      nb.type = 'button'; nb.setAttribute('data-vol', v.id);
      nb.addEventListener('click', function () { openVol(v.id, nb); });
      nav.appendChild(nb);
      v.nav = nb;

      if (!PLATES.l.rect[v.id]) return;
      var slot = el('div', 'slot');
      var hs = el('div', 'hs cv shade', coverInner(v)); hs.style.backgroundImage = coverImg(v);
      var b = el('button', 'hot-book', '<span class="vh">Open the ' + esc(v.label) + ' volume</span>');
      b.type = 'button'; b.setAttribute('data-id', v.id);
      var canHover = window.matchMedia ? window.matchMedia('(hover: hover)') : null;
      var on = function (ev) {
        if (S.open) { return; }
        if (ev && ev.type === 'focus' && !b.matches(':focus-visible')) { return; }
        if (ev && ev.type === 'mouseenter' && canHover && !canHover.matches) { return; }
        hs.classList.add('hov'); slot.classList.add('hov');
      };
      var off = function () { hs.classList.remove('hov'); slot.classList.remove('hov'); };
      b.addEventListener('click', function () { openVol(v.id, b); });
      b.addEventListener('mouseenter', on); b.addEventListener('focus', on);
      b.addEventListener('mouseleave', off); b.addEventListener('blur', off);
      v.nav.addEventListener('mouseenter', on); v.nav.addEventListener('mouseleave', off);
      world.appendChild(slot); world.appendChild(hs); world.appendChild(b);
      v.slot = slot; v.hs = hs; v.hot = b;
    });

    var rl = el('a', 'nv nv-resume', 'Resume');
    rl.href = 'resume.pdf'; rl.target = '_blank'; rl.rel = 'noopener';
    nav.appendChild(rl);

    var gb = el('button', 'hot-globe', '<span class="vh">Open The Willis Writ newspaper</span>');
    gb.type = 'button'; gb.setAttribute('data-id', 'news');
    var gc = el('div', 'globe-cap', '<span>The Willis Writ</span>');
    gb.addEventListener('click', function () { openVol('news', gb); });
    NEWS.nav.addEventListener('mouseenter', function () { if (!S.open) gb.classList.add('hov'); });
    NEWS.nav.addEventListener('mouseleave', function () { gb.classList.remove('hov'); });
    world.appendChild(gb); world.appendChild(gc);
    S.globe = gb; S.cap = gc; NEWS.hot = gb;

    var jb = el('button', 'hot-bust', '<span class="vh">Read a passage from Thomas Jefferson</span>');
    jb.type = 'button'; jb.setAttribute('data-id', 'jefferson');
    var jc = el('div', 'bust-cap', '<span>Jefferson</span>');
    jb.addEventListener('click', function () { openVol('jefferson', jb); });
    world.appendChild(jb); world.appendChild(jc);
    S.bust = jb; S.bcap = jc; JEFF.hot = jb;
    var dp = el('div', 'desk-plate', '<div class="dp-face"><b>Jackson Willis</b><i>Candidate for Juris Doctor</i></div>');
    dp.setAttribute('aria-hidden', 'true'); world.appendChild(dp); S.desk = dp;
  }
  var bgblur = $('#bgblur');
  function applyPlate(key) {
    if (S.plateKey === key) return;
    S.plateKey = key;
    var p = PLATES[key];
    IW = p.w; IH = p.h;
    world.style.backgroundImage = 'url(' + p.img + ')';
    bgblur.style.backgroundImage = 'url(' + p.img + ')';
    VOLS.forEach(function (v) {
      if (!v.hs) return;
      v.rect = p.rect[v.id];
      pos(v.slot, v.rect); pos(v.hs, v.rect); pos(v.hot, v.rect);
    });
    if (S.globe && p.globe) {
      var g = p.globe;
      pos(S.globe, g);
      S.cap.style.left = ((g[0] + g[2] / 2) / IW * 100) + '%';
      S.cap.style.top = ((g[1] + g[3]) / IH * 100) + '%';
    }
    if (S.desk && p.desk) pos(S.desk, p.desk);
    if (S.bust && p.bust) {
      var bb = p.bust;
      pos(S.bust, bb);
      S.bcap.style.left = ((bb[0] + bb[2] / 2) / IW * 100) + '%';
      S.bcap.style.top = ((bb[1] + bb[3]) / IH * 100) + '%';
    }
  }
  function btnFor(id) { var v = BY[id]; return v ? (v.hot || v.nav) : null; }

  /* ==================================================================
     Layout
     ================================================================== */
  var W = 0, H = 0, dual = true, portrait = false;
  // rmode (starts on 'open'): how the reader views a book on a phone: 'one' page at a time, 'open' (the two-page spread upright, as on a desktop),
  // or 'turn' (the spread lying on its side so both pages get the long edge of the screen). wide: a spread is in force (phones
  // only; desktop and landscape tablets always show the spread). rotBook: the turned layout is in force. tight: the upright
  // spread on a phone, with smaller type and tighter page margins.
  var rmode = 'open', wide = false, rotBook = false, tight = false;
  var sc = { s: 1, ox: 0, oy: 0 };

  function fitHero(fs, availW) {
    hero.style.fontSize = fs + 'px';
    var w = hero.offsetWidth;
    if (w > availW && availW > 80) { fs = fs * availW / w; hero.style.fontSize = fs + 'px'; }
  }

  function layout() {
    W = window.innerWidth; H = window.innerHeight;
    var natDual = W >= 760;
    wide = !natDual && rmode !== 'one';
    rotBook = wide && rmode === 'turn' && H > W;
    tight = wide && rmode === 'open' && H > W;
    dual = natDual || wide;
    if (ui.modes) { ui.modes.hidden = natDual; }
    portrait = (W / H < 1.15) || W < 700;
    viewport.classList.toggle('pt', portrait);
    applyPlate(portrait ? 'p' : 'l');
    var s, ox, oy, org;
    if (!portrait) {
      s = Math.max(W / IW, H / IH);
      ox = (W - IW * s) / 2; oy = (H - IH * s) / 2;
      var left = Math.max(ox + 116 * s, W * 0.04);
      hero.classList.remove('compact');
      hero.style.left = Math.round(left) + 'px'; hero.style.right = '';
      hero.style.top = Math.round(Math.max(oy + 490 * s, 0)) + 'px';
      fitHero(Math.max(20, 52 * s), (ox + 680 * s) - left - 16);
      org = [955 * s, 760 * s];
    } else {
      s = W / 860;
      if (IH * s > H) s = H / IH;
      ox = W / 2 - 470 * s; oy = H - IH * s;
      var hl = W < 700 ? 22 : Math.round(W * 0.08);
      hero.classList.remove('compact');
      hero.style.left = hl + 'px'; hero.style.right = hl + 'px';
      hero.style.top = Math.round(oy + 872 * s) + 'px';
      fitHero(clamp(W * 0.072, 24, 44), W - 2 * hl);
      var np = $('#nameplate');
      var limit = np ? np.getBoundingClientRect().top - 12 : H * 0.8;
      if (hero.offsetTop + hero.offsetHeight > limit) { hero.classList.add('compact'); }
      org = [470 * s, 1250 * s];
    }
    sc.s = s; sc.ox = ox; sc.oy = oy;
    world.style.left = Math.round(ox) + 'px'; world.style.top = Math.round(oy) + 'px';
    world.style.width = Math.round(IW * s) + 'px'; world.style.height = Math.round(IH * s) + 'px';
    world.style.transformOrigin = Math.round(org[0]) + 'px ' + Math.round(org[1]) + 'px';
    // The plaque's second line is 0.8em, so the base size never drops below MINTXT / 0.8 on a phone.
    if (S.desk) S.desk.style.fontSize = Math.max(PLATES[S.plateKey].desk[2] * s / 15.5, portrait ? MINTXT / 0.8 : 0) + 'px';
    // The label on a shelf cover is the flying cover's label at its shelf size (font F at book width P, scaled by shelf width / P),
    // so the cover and the real one on the shelf match exactly when the flight ends. The shelf covers are small on a phone,
    // so the label and icon are scaled up together (--lb) until the label is at least MINTXT; the flying cover does the same
    // (see counter), so the hand-off is seamless.
    var bd = bookDims(), lf = bookFs(bd.P);
    VOLS.forEach(function (v) {
      if (!v.hs) return;
      var f = v.rect[2] * s * lf / bd.P;
      v.hs.style.fontSize = f + 'px';
      v.hs.style.setProperty('--lb', Math.max(1, MINTXT / (3 * f)).toFixed(3));
    });

    if (S.open && !S.busy) rebuildOpen();
    else if (S.open) S.dirty = true;
  }

  // shelf: the size the closed book has on its way to and from the shelf, which is never the reader's wide layout
  function bookDims(shelf) {
    var P, Hh;
    if (dual) {
      if (rotBook) {
        // the open book lies on its side: its length runs down the screen between the two button bars
        P = Math.min((H - 170) / 2, 400);
        Hh = Math.min(W - 12, P * 1.4);
        P = Math.min(P, Hh * 0.95);
      } else if (tight) {
        // the upright spread on a phone: two small pages side by side, in the same proportions as on a desktop
        P = Math.floor((W - 14) / 2);
        Hh = Math.min(H * 0.76, P * 1.38);
      } else {
        P = Math.min(W * 0.455, 560);
        Hh = Math.min(H * 0.76, P * 1.38);
        P = Math.min(P, Hh * 0.8);
      }
    } else {
      P = Math.min(W - 30, 520);
      Hh = Math.min(H * 0.76, P * 1.4);
    }
    return { P: Math.round(P), Hh: Math.round(Hh) };
  }
  function landRect() {
    var d = bookDims();
    return { cx: W / 2, cy: H * 0.5 - 4, w: d.P, h: d.Hh };
  }
  function shelfRect(v) {
    var r = v.rect;
    return { cx: sc.ox + (r[0] + r[2] / 2) * sc.s, cy: sc.oy + (r[1] + r[3] / 2) * sc.s, w: r[2] * sc.s, h: r[3] * sc.s };
  }

  /* ==================================================================
     Flying sprite (the book lifting from the shelf to the desk)
     ================================================================== */
  function makeSprite(v, from, lit) {
    var d = bookDims();
    var sp = el('div', 'sp cv shade' + (lit ? ' lit' : ''), coverInner(v));
    sp.style.backgroundImage = coverImg(v);
    sp.style.width = d.P + 'px'; sp.style.height = d.Hh + 'px';
    sp.style.fontSize = bookFs(d.P) + 'px';
    fly.appendChild(sp);
    sp.style.transform = tf(from, d, 0, 1);
    var cin = sp.firstChild;
    if (cin) cin.style.transform = counter(sp.style.transform);
    return sp;
  }
  // The flying cover is stretched from the shape of the open book to the shape of its shelf slot. Its label gets the inverse
  // vertical stretch (about its own center), so the text and icon keep their proportions all the way and match the shelf at the end.
  // It also carries the same boost as the shelf cover (--lb in layout): when the cover is small enough that its label would
  // fall under MINTXT, label and icon are scaled up together by exactly that much, and the boost fades to 1 as the cover grows.
  function counter(t) {
    var m = /scale\(([-\d.e]+),\s*([-\d.e]+)\)/.exec(t);
    if (!m) return '';
    var sx = parseFloat(m[1]), sy = parseFloat(m[2]);
    var F = bookFs(bookDims().P);
    var b = Math.max(1, MINTXT / (3 * F * sx));
    return 'scale(' + b + ',' + (b * sx / sy) + ')';
  }
  function tf(r, d, rot, mul) {
    return 'translate(' + Math.round(r.cx - d.P / 2) + 'px,' + Math.round(r.cy - d.Hh / 2) + 'px) rotate(' + rot + 'deg) scale(' + ((r.w / d.P) * mul) + ',' + ((r.h / d.Hh) * mul) + ')';
  }
  function anim(sp, frames, dur, easing) {
    var cin = sp.firstChild, cf = null;
    if (cin && frames.every(function (f) { return f.transform; })) {
      cf = frames.map(function (f) { var o = { transform: counter(f.transform) }; if (f.offset != null) o.offset = f.offset; return o; });
    }
    if (!sp.animate) { sp.style.transform = frames[frames.length - 1].transform; if (cf) cin.style.transform = cf[cf.length - 1].transform; return { onfinish: null, finished: null }; }
    var opt = { duration: Math.max(1, dur * K), easing: easing || 'ease', fill: 'forwards' };
    if (cf && cin.animate) cin.animate(cf, opt);
    return sp.animate(frames, opt);
  }

  /* ==================================================================
     Book state
     ================================================================== */
  var S = { open: false, busy: false, turning: false, id: null, btn: null, next: null, spread: 0, total: 0,
            dual: true, leaves: [], book: null, wrap: null, dirty: false, vol: null, sp: null };

  function fillFace(face, src, idx) {
    if (!src) { face.className += ' blank'; return; }
    var c = src.cloneNode(true);
    $$('img[data-src]', c).forEach(function (im) { im.src = im.getAttribute('data-src'); });
    $$('img[data-art]', c).forEach(function (i) { var k = i.getAttribute('data-art'); (ARTLIVE[k] = ARTLIVE[k] || []).push(i); if (ARTURL[k]) i.src = ARTURL[k]; });
    face.appendChild(c);
    if (c.className.indexOf('title') < 0) face.appendChild(el('div', 'folio', '&middot; ' + (idx + 1) + ' &middot;'));
    $$('a[data-open]', c).forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); S.next = a.getAttribute('data-open'); closeVol(); });
    });
  }

  /* ==================================================================
     Pagination. Books never scroll: a page whose text is too long for the
     leaf is split (headings stay with the text that follows them) and the
     rest carries over onto the next page. Pages with room to spare are
     then dressed with a vine band or an illustrated panel (no text).
     ================================================================== */
  /* ------------------------------------------------------------------
     Page fillers: flat-colour wood-engraving style plates (olive vines,
     teal lattice, vermilion linework), original art drawn in code.
     ------------------------------------------------------------------ */
  var ARTS = {
    crane: { OL: '#76853a', OLD: '#5d6b2b', TL: '#5e9b96', TLD: '#3f7f7b', VM: '#c4563a', CR: '#f1e7cf', PK: '#e8aa9c', PKD: '#d68474', LL: '#f1e7cf', vig: 0 },
    sepia: { OL: '#6d5736', OLD: '#4b3a22', TL: '#9a8159', TLD: '#5e4930', VM: '#3f2d1b', CR: '#ead9b1', PK: '#c3a47c', PKD: '#7e6141', LL: '#ead9b1', vig: .5 },
    heavy: { OL: '#1f1810', OLD: '#17110b', TL: '#9a8159', TLD: '#5e4930', VM: '#1f1810', CR: 'none', PK: '#c3a47c', PKD: '#7e6141', LL: '#ead9b1', vig: 0, pen: 2 },
    sketch: { OL: '#3a2e1d', OLD: '#2d2417', TL: '#9a8159', TLD: '#5e4930', VM: '#2d2417', CR: 'none', PK: '#c3a47c', PKD: '#7e6141', LL: '#ead9b1', vig: 0, pen: 1 },
    dark:  { OL: '#4d5a2a', OLD: '#2f391b', TL: '#1f3a3a', TLD: '#0f2222', VM: '#2a1a0c', CR: '#d4b46a', PK: '#a8624f', PKD: '#5d2f24', LL: '#c9a85a', vig: .35 }
  };
  var OL, OLD, TL, TLD, VM, CR, PK, PKD, LL, ARTV, HAT, PEN, PW = 1, WASH, BLOB, ARTN = 0;
  function setArt(n) {
    var a = ARTS[n] || ARTS.crane;
    OL = a.OL; OLD = a.OLD; TL = a.TL; TLD = a.TLD; VM = a.VM; CR = a.CR; PK = a.PK; PKD = a.PKD; LL = a.LL; ARTV = a.vig; PEN = a.pen || 0; PW = PEN > 1 ? 1.5 : 1; WASH = 'rgba(150,118,72,' + (PEN > 1 ? .34 : .2) + ')'; BLOB = 'rgba(176,140,86,' + (PEN > 1 ? .36 : .22) + ')';
    HAT = ' stroke="' + VM + '" stroke-width=".8" fill="none" stroke-linecap="round"';
  }
  // Default look is the pencil sketch. Other looks: ?art=crane, sepia, dark or heavy on the page address.
  setArt((/[?&]art=(\w+)/.exec(location.search) || [])[1] || 'sketch');
  // Soft dark edge, like an aged print.
  function vignette(x, y, w, h, shape) {
    if (!ARTV) return '';
    var id = 'vg' + (++ARTN);
    return '<defs><radialGradient id="' + id + '" cx=".5" cy=".5" r=".72"><stop offset=".55" stop-color="#2a1a08" stop-opacity="0"/><stop offset="1" stop-color="#2a1a08" stop-opacity="' + ARTV + '"/></radialGradient></defs>' +
      (shape === 'c' ? '<circle cx="' + (x + w / 2) + '" cy="' + (y + h / 2) + '" r="' + (w / 2) + '"' : '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"') + ' fill="url(#' + id + ')"/>';
  }
  var LEAF = 'M0 0 C-2 -3 -7 -3 -10 -6 C-8 -8 -9 -11 -12 -12 C-9 -14 -7 -15 -6 -18 C-4 -17 -2 -19 0 -23 C2 -19 4 -17 6 -18 C7 -15 9 -14 12 -12 C9 -11 8 -8 10 -6 C7 -3 2 -3 0 0 Z';
  function f1(n) { return Math.round(n * 10) / 10; }
  function bez(s, t) {
    var u = 1 - t, x = u*u*u*s[0] + 3*u*u*t*s[2] + 3*u*t*t*s[4] + t*t*t*s[6], y = u*u*u*s[1] + 3*u*u*t*s[3] + 3*u*t*t*s[5] + t*t*t*s[7];
    var dx = 3*u*u*(s[2]-s[0]) + 6*u*t*(s[4]-s[2]) + 3*t*t*(s[6]-s[4]), dy = 3*u*u*(s[3]-s[1]) + 6*u*t*(s[5]-s[3]) + 3*t*t*(s[7]-s[5]);
    return [x, y, Math.atan2(dy, dx) * 180 / Math.PI];
  }
  function leafG(x, y, rot, sc) {
    if (PEN) return '<g transform="translate(' + f1(x) + ' ' + f1(y) + ') rotate(' + f1(rot) + ') scale(' + sc + ')"><path d="' + LEAF + '" fill="' + WASH + '" stroke="' + OL + '" stroke-width="' + (.95 * PW) + '" stroke-linejoin="round"/>' +
      '<path d="M0 -1 V-19 M0 -6 L-6 -10 M0 -6 L6 -10 M0 -11 L-5 -15 M0 -11 L5 -15" fill="none" stroke="' + OL + '" stroke-width="' + (.55 * PW) + '" opacity=".9"/>' +
      '<path d="M2 -3 L8 -7 M2 -6 L9.5 -11 M2.5 -12 L6.5 -15 M3 -16 L5 -17.5" fill="none" stroke="' + OL + '" stroke-width=".5" opacity=".6"/></g>';
    return '<g transform="translate(' + f1(x) + ' ' + f1(y) + ') rotate(' + f1(rot) + ') scale(' + sc + ')"><path d="' + LEAF + '" fill="' + OL + '"/>' +
      '<path d="M0 -1 V-19 M0 -6 L-6 -10 M0 -6 L6 -10 M0 -11 L-5 -15 M0 -11 L5 -15" fill="none" stroke="' + CR + '" stroke-width=".7" stroke-linecap="round" opacity=".75"/></g>';
  }
  function grapes(x, y, sc) {
    var pts = [[-5,0],[0,0],[5,0],[-2.5,4.5],[2.5,4.5],[0,9]], s = '<g transform="translate(' + f1(x) + ' ' + f1(y) + ') scale(' + sc + ')"><path d="M0 -6 L0 0" stroke="' + OLD + '" stroke-width="1" fill="none"/>', i;
    for (i = 0; i < pts.length; i++) s += '<circle cx="' + pts[i][0] + '" cy="' + (pts[i][1] + 2) + '" r="2.8" fill="' + (PEN ? WASH : PK) + '" stroke="' + (PEN ? OL : PKD) + '" stroke-width="' + (PEN ? .7 : .6) + '"/>' + (PEN ? '<path d="M' + (pts[i][0] - 1) + ' ' + (pts[i][1] + 3) + ' q1.5 1.4 2.8 -.4" fill="none" stroke="' + OL + '" stroke-width=".45"/>' : '');
    return s + '</g>';
  }
  function tendril(x, y, rot, sc) {
    return '<path transform="translate(' + f1(x) + ' ' + f1(y) + ') rotate(' + f1(rot) + ') scale(' + sc + ')" d="M0 0 C6 -4 12 0 10 6 C8 11 1 9 3 4 C4 2 6 3 5.5 4.5" fill="none" stroke="' + OLD + '" stroke-width="1" stroke-linecap="round"/>';
  }

  var LEAFV = [
    { d: LEAF, v: 'M0 -1 V-19 M0 -6 L-6 -10 M0 -6 L6 -10 M0 -11 L-5 -15 M0 -11 L5 -15' },
    { d: 'M0 0 C-3 -2 -9 -3 -12 -8 C-8 -9 -6 -11 -5 -15 C-3 -14 -1 -17 0 -22 C1 -17 3 -14 5 -15 C6 -11 8 -9 12 -8 C9 -3 3 -2 0 0 Z', v: 'M0 -1 V-19 M0 -5 L-8 -8 M0 -5 L8 -8 M0 -12 L-3.5 -14.5 M0 -12 L3.5 -14.5' },
    { d: 'M0 0 C-4 -3 -8 -8 -6 -13 L-9 -14 L-6 -17 L-8 -20 L-3 -20 L0 -25 L3 -20 L8 -20 L6 -17 L9 -14 L6 -13 C8 -8 4 -3 0 0 Z', v: 'M0 -1 V-23 M0 -7 L-5 -11 M0 -7 L5 -11 M0 -13 L-5 -16.5 M0 -13 L5 -16.5' }
  ];
  // Vine drawn like the objects: tinted wash, hatching on one half of each leaf, then three thin wobbling pencil passes.
  function penVine(segs, o) {
    var id = o.id, r = rng(o.seed || 5), d = 'M' + segs[0][0] + ' ' + segs[0][1], lines = '', shapes = '', hatch = '', k = 0, sc = o.leaf || 1, p, side, v, T, scl, q, qs, i, gx, gy;
    segs.forEach(function (s) { d += ' C' + s.slice(2).join(' '); });
    lines += '<path d="' + d + '" fill="none"/>';
    segs.forEach(function (s, idx) {
      qs = o.sparse ? [[.3, .9], [.78, .75]] : [[.22, .8], [.55, 1], [.85, .7]];
      qs.forEach(function (qq) {
        p = bez(s, qq[0]); side = (k % 2) ? 1 : -1; v = LEAFV[Math.floor(r() * 3)];
        scl = qq[1] * sc * (.8 + r() * .4);
        T = 'translate(' + f1(p[0]) + ' ' + f1(p[1]) + ') rotate(' + f1(p[2] + side * (52 + r() * 26) + 90) + ') scale(' + f1(scl) + ')';
        shapes += '<path transform="' + T + '" d="' + v.d + '"/>';
        hatch += '<g transform="' + T + '" clip-path="url(#lh' + id + ')"><path d="' + v.d + '"/></g>';
        lines += '<g transform="' + T + '" fill="none"><path d="' + v.d + '"/><path d="' + v.v + '" stroke-width=".6"/></g>';
        k++;
      });
      p = bez(s, .4);
      lines += '<path transform="translate(' + f1(p[0]) + ' ' + f1(p[1]) + ') rotate(' + f1(p[2] + (idx % 2 ? 150 : -30)) + ') scale(.9)" d="M0 0 C6 -4 12 0 10 6 C8 11 1 9 3 4 C4 2 6 3 5.5 4.5" fill="none"/>';
      if (o.fruit && idx % 2 === o.fruit - 1) {
        p = bez(s, .68); gx = p[0] + 2; gy = p[1] + 3;
        [[-5, 0], [0, 0], [5, 0], [-2.5, 4.5], [2.5, 4.5], [0, 9]].forEach(function (c) {
          shapes += '<circle cx="' + f1(gx + c[0] * .9) + '" cy="' + f1(gy + (c[1] + 2) * .9) + '" r="2.5"/>';
          lines += '<circle cx="' + f1(gx + c[0] * .9) + '" cy="' + f1(gy + (c[1] + 2) * .9) + '" r="2.5" fill="none"/><path d="M' + f1(gx + c[0] * .9 - .6) + ' ' + f1(gy + (c[1] + 2) * .9 + 1) + ' q1.4 1.2 2.4 -.6" fill="none" stroke-width=".45"/>';
        });
        lines += '<path d="M' + f1(gx) + ' ' + f1(gy - 5) + ' L' + f1(gx) + ' ' + f1(gy + 1) + '" fill="none"/>';
      }
    });
    var cap = ' stroke="' + OL + '" stroke-linecap="round" stroke-linejoin="round"';
    return '<g fill="' + WASH + '" stroke="none">' + shapes + '</g>' +
      '<g fill="url(#ht' + id + ')" stroke="none" opacity="' + (PEN > 1 ? .85 : .65) + '">' + hatch + '</g>' +
      '<g filter="url(#wa' + id + ')"' + cap + ' stroke-width="' + (1.05 * PW) + '" opacity=".92">' + lines + '</g>' +
      '<g filter="url(#wb' + id + ')" transform="translate(-.5 .5)"' + cap + ' stroke-width="' + (.62 * PW) + '" opacity=".5">' + lines + '</g>' +
      '<g filter="url(#wc' + id + ')" transform="translate(.7 -.3)"' + cap + ' stroke-width="' + (.45 * PW) + '" opacity=".4">' + lines + '</g>';
  }
  // segs: list of cubic segments [x0,y0,c1x,c1y,c2x,c2y,x1,y1]; fruit: 0/1 to hang grapes
  function vine(segs, o) {
    o = o || {};
    if (PEN && o.id) return penVine(segs, o);
    var d = 'M' + segs[0][0] + ' ' + segs[0][1], g = '', i, k = 0, p, side, sc = o.leaf || 1;
    segs.forEach(function (s) { d += ' C' + s.slice(2).join(' '); });
    segs.forEach(function (s, idx) {
      (o.sparse ? [[.3, .9], [.78, .75]] : [[.22, .8], [.55, 1], [.85, .7]]).forEach(function (q) {
        p = bez(s, q[0]); side = (k++ % 2) ? 1 : -1;
        g += leafG(p[0], p[1], p[2] + side * 62 + 90, q[1] * sc);
      });
      p = bez(s, .4); g += tendril(p[0], p[1], p[2] + (idx % 2 ? 150 : -30), .9 * sc);
      if (o.fruit && idx % 2 === o.fruit - 1) { p = bez(s, .68); g += grapes(p[0] + 2, p[1] + 3, .9 * sc); }
    });
    if (PEN) return '<path d="' + d + '" fill="none" stroke="' + OL + '" stroke-width="' + ((o.w || 2) * .62 * PW) + '" stroke-linecap="round"/><path transform="translate(.9 .6)" d="' + d + '" fill="none" stroke="' + OL + '" stroke-width=".5" opacity=".55" stroke-linecap="round"/>' + g;
    return '<path d="' + d + '" fill="none" stroke="' + OL + '" stroke-width="' + (o.w || 2) + '" stroke-linecap="round"/>' + g;
  }
  function latticePanel(x, y, w, h, step, seed) {
    var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + TL + '"/>', i, j, r = seed || 7;
    for (i = 0; i < Math.floor(w / step); i++) for (j = 0; j < Math.floor(h / step); j++) {
      r = (r * 9301 + 49297) % 233280;
      if (r / 233280 > .72) s += '<rect x="' + (x + i * step + .8) + '" y="' + (y + j * step + .8) + '" width="' + (step - 1.6) + '" height="' + (step - 1.6) + '" fill="' + TLD + '" opacity=".85"/>';
    }
    s += '<path fill="none" stroke="' + LL + '" stroke-width=".8" opacity=".7" d="';
    for (i = 1; i < w / step; i++) s += 'M' + (x + i * step) + ' ' + y + ' V' + (y + h);
    for (j = 1; j < h / step; j++) s += 'M' + x + ' ' + (y + j * step) + ' H' + (x + w);
    return s + '"/><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="none" stroke="' + TLD + '" stroke-width="2.2"/>';
  }
  // Legal subjects, drawn in an 80 x 110 box.
  var OBJECTS = [
    function scales() {
      var s = '<path d="M40 20 V96" stroke-width="3.2"/><circle cx="40" cy="14" r="4.4"/><path d="M33 22 H47"/><path d="M12 31 Q40 22 68 31" stroke-width="2.6" fill="none"/><circle cx="12" cy="31" r="2.6"/><circle cx="68" cy="31" r="2.6"/>';
      s += '<path d="M12 31 L2 63 M12 31 L22 63 M68 31 L58 63 M68 31 L78 63" stroke-width=".9" fill="none"/>';
      s += '<path d="M0 63 Q12 79 24 63 Z"/><path d="M56 63 Q68 79 80 63 Z"/><path d="M30 96 H50 L54 104 H26 Z"/><path d="M22 104 H58 V109 H22 Z"/>';
      s += '<path d="M5 67 Q12 73 19 67 M9 70 Q12 74 15 70 M61 67 Q68 73 75 67 M65 70 Q68 74 71 70 M32 40 V92 M48 40 V92"' + HAT.replace('fill="none"', 'fill="none" opacity=".0"') + '/>';
      return s + '<path d="M36 36 V90 M44 36 V90" stroke-width=".7" opacity=".7"/>';
    },
    function gavel() {
      var s = '<g transform="rotate(-32 38 44)"><rect x="14" y="24" width="48" height="22" rx="4.5"/><path d="M25 24 V46 M51 24 V46" stroke-width="1.4"/><rect x="34" y="46" width="8" height="54" rx="3"/>';
      s += '<path d="M18 29 H22 M18 34 H22 M18 39 H22 M54 29 H58 M54 34 H58 M54 39 H58 M37 56 V94 M39.5 56 V94"' + HAT + '/></g>';
      return s + '<ellipse cx="40" cy="98" rx="34" ry="6.5"/><path d="M8 98 V104 Q40 114 72 104 V98" fill="' + CR + '"/><path d="M14 102 Q40 109 66 102"' + HAT + '/>';
    },
    function courthouse() {
      var s = '<path d="M5 41 L40 15 L75 41 Z"/><circle cx="40" cy="31" r="4.6"/><path d="M14 38 L40 20 L66 38"' + HAT + '/><rect x="5" y="41" width="70" height="7"/>', i, cx;
      for (i = 0; i < 5; i++) {
        cx = 14 + i * 13;
        s += '<rect x="' + (cx - 3.4) + '" y="52" width="6.8" height="35"/><rect x="' + (cx - 5.2) + '" y="48" width="10.4" height="4.4"/><rect x="' + (cx - 5.2) + '" y="87" width="10.4" height="3.6"/>';
        s += '<path d="M' + (cx - 1.1) + ' 53 V86 M' + (cx + 1.3) + ' 53 V86"' + HAT + '/>';
      }
      return s + '<rect x="3" y="91" width="74" height="5"/><rect x="0" y="96" width="80" height="5"/><rect x="0" y="101" width="80" height="7"/><path d="M6 44 H74"' + HAT + '/>';
    },
    function book() {
      var s = '<path d="M5 68 C22 60 34 62 40 70 C46 62 58 60 75 68 V98 C58 90 46 92 40 100 C34 92 22 90 5 98 Z"/><path d="M40 70 V100" stroke-width="1.6"/>';
      s += '<path d="M11 75 Q24 71 34 76 M11 81 Q24 77 34 82 M11 87 Q24 83 34 88 M46 76 Q56 71 69 75 M46 82 Q56 77 69 81 M46 88 Q56 83 69 87"' + HAT + '/>';
      s += '<path d="M64 6 C78 14 80 36 58 60 C56 42 52 24 64 6 Z"/><path d="M64 6 C58 28 54 46 46 68" stroke-width="1.4" fill="none"/>';
      return s + '<path d="M62 16 L70 21 M60 23 L71 29 M58 31 L70 38 M56 40 L66 48 M54 48 L61 55 M58 22 L52 26 M56 32 L51 36"' + HAT + '/>';
    }
  ];
  function objectG(k, tx, ty, sc) {
    return '<g transform="translate(' + tx + ' ' + ty + ') scale(' + sc + ')" fill="' + CR + '" stroke="' + VM + '" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">' + OBJECTS[k % OBJECTS.length]() + '</g>';
  }

  /* ---- Hand-drawn (graphite and wash) rendering ---- */
  function rng(sd) { return function () { sd = (sd * 9301 + 49297) % 233280; return sd / 233280; }; }
  function penDefs(id, w, h) {
    return '<defs>' +
      '<filter id="wb' + id + '" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="' + (id % 7 + 2) + '" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="' + (PEN > 1 ? 3.6 : 2.2) + '" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      '<filter id="wa' + id + '" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="' + (id % 5 + 11) + '" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      '<filter id="wc' + id + '" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".07" numOctaves="2" seed="' + (id % 6 + 23) + '" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.6" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      '<linearGradient id="lm' + id + '" gradientUnits="userSpaceOnUse" x1="34" y1="0" x2="82" y2="0"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient>' +
      '<linearGradient id="ln' + id + '" gradientUnits="userSpaceOnUse" x1="52" y1="0" x2="82" y2="0"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient>' +
      '<mask id="sm' + id + '" maskUnits="userSpaceOnUse" x="-20" y="-20" width="130" height="160"><rect x="-20" y="-20" width="130" height="160" fill="url(#lm' + id + ')"/></mask>' +
      '<mask id="sn' + id + '" maskUnits="userSpaceOnUse" x="-20" y="-20" width="130" height="160"><rect x="-20" y="-20" width="130" height="160" fill="url(#ln' + id + ')"/></mask>' +
      '<filter id="gr' + id + '" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="' + (id % 5 + 1) + '" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -' + (PEN > 1 ? 1.0 : 1.5) + ' ' + (PEN > 1 ? 1.9 : 1.75) + '" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>' +
      '<filter id="bl' + id + '" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>' +
      '<pattern id="ht' + id + '" width="' + (PEN > 1 ? 2.1 : 2.7) + '" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><path d="M0 0 V3.2" stroke="' + OL + '" stroke-width="' + (.55 * PW) + '"/></pattern>' +
      '<pattern id="hx' + id + '" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><path d="M0 0 V3" stroke="' + OL + '" stroke-width=".5"/></pattern>' +
      '<clipPath id="lh' + id + '"><rect x="0" y="-30" width="14" height="32"/></clipPath>' +
      '<clipPath id="sd' + id + '"><rect x="' + (PEN > 1 ? 30 : 46) + '" y="-5" width="60" height="125"/></clipPath><clipPath id="sx' + id + '"><rect x="56" y="-5" width="30" height="125"/></clipPath>' +
      '<radialGradient id="rg' + id + '"><stop offset=".72" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>' +
      '<mask id="mk' + id + '" maskUnits="userSpaceOnUse" x="0" y="0" width="' + w + '" height="' + h + '"><rect width="' + w + '" height="' + h + '" fill="#000"/><ellipse cx="' + (w / 2) + '" cy="' + (h / 2) + '" rx="' + (w / 2 * 1.12) + '" ry="' + (h / 2 * 1.2) + '" fill="url(#rg' + id + ')"/></mask></defs>';
  }
  // Charcoal ground strokes under an object, dense in the middle like a cast shadow.
  function scribbleGround(cx, y, hw, seed, n) {
    var r = rng(seed), g = '', i, x, len, yy, wd;
    for (i = 0; i < n; i++) {
      len = hw * (.35 + r() * .9); x = cx - hw + r() * (2 * hw - len); yy = y + (r() - .5) * 9 * (1 - Math.abs((x + len / 2 - cx) / hw) * .5);
      wd = (.6 + r() * 1.3) * PW;
      g += '<path d="M' + f1(x) + ' ' + f1(yy) + ' q' + f1(len / 2) + ' ' + f1((r() - .5) * 2.4) + ' ' + f1(len) + ' ' + f1((r() - .5) * 1.4) + '" fill="none" stroke="' + OL + '" stroke-width="' + f1(wd) + '" stroke-linecap="round" opacity="' + f1(Math.min(1, (.35 + r() * .45) * (PEN > 1 ? 1.25 : 1))) + '"/>';
    }
    return g;
  }
  // Faint blue-grey underdrawing, like the pencil sketches that show through the page.
  function ghostSketch(seed, w, h, n) {
    var r = rng(seed), g = '', i, x, y;
    for (i = 0; i < n; i++) {
      x = r() * w; y = r() * h;
      g += '<path d="M' + f1(x) + ' ' + f1(y) + ' c' + f1(r() * 30 - 8) + ' ' + f1(r() * 22 - 14) + ' ' + f1(r() * 40) + ' ' + f1(r() * 26 - 6) + ' ' + f1(r() * 50 + 10) + ' ' + f1(r() * 14 - 4) + '" fill="none" stroke="#7d8aa6" stroke-width="' + f1((.6 + r() * .9) * PW) + '" stroke-linecap="round" opacity="' + f1((.18 + r() * .22) * (PEN > 1 ? 1.5 : 1)) + '"/>';
    }
    return g;
  }
  function pln(d) { return '<path d="' + d + '" fill="none"/>'; }
  function pshp(d) { return '<path d="' + d + '"/>'; }
  function pchain(x1, y1, x2, y2, n) {
    var s = '', i, t, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), a = Math.atan2(dy, dx) * 180 / Math.PI, cx, cy;
    for (i = 0; i < n; i++) {
      t = (i + .5) / n; cx = x1 + dx * t; cy = y1 + dy * t;
      s += i % 2 ? pln('M' + f1(cx - dx / n * .3) + ' ' + f1(cy - dy / n * .3) + ' L' + f1(cx + dx / n * .3) + ' ' + f1(cy + dy / n * .3))
                 : '<ellipse cx="' + f1(cx) + '" cy="' + f1(cy) + '" rx="' + f1(L / n * .58) + '" ry="1.15" transform="rotate(' + f1(a) + ' ' + f1(cx) + ' ' + f1(cy) + ')" fill="none"/>';
    }
    return s;
  }
  var PENOBJ = [
    function scales() {
      var s = '';
      s += pshp('M13 108 L67 108 L65 103 L15 103 Z') + pshp('M20 103 H60 V98.4 H20 Z') + pshp('M28 98.4 H52 L50 94 H30 Z');
      s += pshp('M34.6 94 C35.8 70 36.4 50 37 36 L43 36 C43.6 50 44.2 70 45.4 94 Z') + pln('M38 92 C38.4 70 38.8 52 39 38 M40.2 92 V38 M42.2 92 C41.8 70 41.4 52 41.2 38');
      s += pshp('M35.4 36 C35.6 33.4 44.4 33.4 44.6 36 L43.4 38.6 H36.6 Z');
      s += pshp('M8 32.6 C22 27 58 27 72 32.6 L72 35.2 C58 30 22 30 8 35.2 Z') + pln('M40 27.6 V25.4');
      s += '<circle cx="40" cy="30.6" r="4.3"/><circle cx="40" cy="30.6" r="1.4"/><circle cx="40" cy="21.6" r="3.4"/><circle cx="8" cy="34" r="2.5"/><circle cx="72" cy="34" r="2.5"/>';
      [[8, 1, 14, 27], [8, 14, 14, 14], [72, 53, 66, 79]].forEach(function () {});
      s += pchain(8, 36, 1.4, 66, 6) + pchain(8, 36, 14, 63.2, 6) + pchain(8, 36, 26.6, 66, 7);
      s += pchain(72, 36, 53.4, 66, 7) + pchain(72, 36, 66, 63.2, 6) + pchain(72, 36, 78.6, 66, 6);
      [14, 66].forEach(function (cx) {
        s += '<ellipse cx="' + cx + '" cy="66" rx="13.2" ry="3.4"/>' + pshp('M' + (cx - 13.2) + ' 66 C' + (cx - 12) + ' 77 ' + (cx + 12) + ' 77 ' + (cx + 13.2) + ' 66 C' + (cx + 9) + ' 69.4 ' + (cx - 9) + ' 69.4 ' + (cx - 13.2) + ' 66 Z');
        s += pln('M' + (cx - 7) + ' 72 C' + (cx - 2) + ' 74.2 ' + (cx + 2) + ' 74.2 ' + (cx + 7) + ' 72');
      });
      return s;
    },
    function gavel() {
      var s = pshp('M6 98 V104.5 C8 111 72 111 74 104.5 V98 C70 103.5 10 103.5 6 98 Z') + '<ellipse cx="40" cy="98" rx="34" ry="6.4"/><ellipse cx="40" cy="98" rx="21" ry="3.5" fill="none"/><ellipse cx="40" cy="98" rx="9" ry="1.5" fill="none"/>';
      s += pln('M7.5 102 C22 108 58 108 72.5 102 M12 106 C26 110 54 110 68 106');
      s += '<g transform="translate(0 5) rotate(-32 38 44)">';
      s += pshp('M34.6 46 C35.8 58 37 68 37.2 78 C37.3 86 35 90 35.2 95 C35.4 100.6 42.6 100.6 42.8 95 C43 90 40.8 86 40.9 78 C41 68 42.2 58 43.4 46 Z') + pln('M38 50 V90 M40.2 52 V82 M36.6 64 Q39 65.4 41.4 64 M36.8 72 Q39 73.4 41.2 72');
      s += pshp('M16 27.5 L19.5 24 H56.5 L60 27.5 V42.5 L56.5 46 H19.5 L16 42.5 Z') + pln('M22.5 24 V46 M26.5 24 V46 M49.5 24 V46 M53.5 24 V46');
      s += pln('M30 29.5 H46 M31 33.5 H47.5 M30 37.5 H46 M32 41.8 H45 M17.5 33 H21 M17.5 38 H21 M56 33 H59 M56 38 H59');
      s += '</g>';
      return s;
    },
    function courthouse() { return OBJECTS[2](); },
    function book() {
      var s = '', i, y, S = [64, 5, 59, 28, 54, 50, 50, 66], p, t, r = rng(7), len;
      s += pshp('M3 99 L1 103.5 C18 95.5 33 97.5 40 105.5 C47 97.5 62 95.5 79 103.5 L77 99 C61 91 47 93 40 101 C33 93 19 91 3 99 Z');
      s += pshp('M3 74.5 C19 66.5 33 68.5 40 76.5 C47 68.5 61 66.5 77 74.5 L77 99 C61 91 47 93 40 101 C33 93 19 91 3 99 Z') + pln('M40 76.5 V101');
      s += pln('M5 77.4 C19 70.4 32 72.4 38 79.4 M5 80.4 C19 73.4 32 75.4 38 82.4 M75 77.4 C61 70.4 48 72.4 42 79.4 M75 80.4 C61 73.4 48 75.4 42 82.4');
      for (i = 0; i < 6; i++) {
        y = 84 + i * 2.9; len = 20 + r() * 7;
        s += pln('M' + f1(9) + ' ' + f1(y - 4.2 + i * .15) + ' C16 ' + f1(y - 7 + i * .1) + ' 25 ' + f1(y - 6.6) + ' ' + f1(9 + len) + ' ' + f1(y - 1.8 + r()));
        s += pln('M' + f1(71) + ' ' + f1(y - 4.2 + i * .15) + ' C64 ' + f1(y - 7 + i * .1) + ' 55 ' + f1(y - 6.6) + ' ' + f1(71 - len * .9) + ' ' + f1(y - 1.8 + r()));
      }
      s += pshp('M42.6 100.5 L44 110 L46.4 107.6 L48.8 110 L49 99 Z');
      s += pshp('M64 5 C79 18 75 44 50 66.5 C55 48 60 28 64 5 Z') + pln('M64 5 C59 28 54 50 50 66.5 M50 66.5 L48.6 71.5');
      for (t = .1; t < .9; t += .055) {
        p = bez(S, t); var a = (p[2] - 70) * Math.PI / 180, L = 13 * Math.pow(Math.sin(Math.PI * Math.min(t * 1.05, 1)), .6) * (.8 + r() * .35);
        s += pln('M' + f1(p[0]) + ' ' + f1(p[1]) + ' l' + f1(Math.cos(a) * L) + ' ' + f1(Math.sin(a) * L));
      }
      return s;
    },
    function scroll() {
      var s = '', i, r = rng(13), w;
      s += pshp('M14 24 C13 40 15 60 14 84 H66 C67 60 65 40 66 24 Z');
      s += pshp('M12 14.5 H68 C73.5 14.5 73.5 24.5 68 24.5 H12 C6.5 24.5 6.5 14.5 12 14.5 Z') + pln('M12 14.5 C7.4 14.5 7.4 24.5 12 24.5 C14.6 24.5 14.6 18.6 12 18.6 M68 14.5 C72 16 72 23 68 24.5');
      s += pshp('M12 83.5 H68 C73.5 83.5 73.5 93.5 68 93.5 H12 C6.5 93.5 6.5 83.5 12 83.5 Z') + pln('M12 83.5 C7.4 83.5 7.4 93.5 12 93.5 C14.6 93.5 14.6 87.6 12 87.6 M68 83.5 C72 85 72 92 68 93.5');
      s += pln('M22 31 H58 M26 33.8 H54');
      for (i = 0; i < 6; i++) {
        w = 34 + r() * 8; s += pln('M20 ' + f1(40 + i * 5.4) + ' C28 ' + f1(38.6 + i * 5.4) + ' 36 ' + f1(42 + i * 5.4) + ' ' + f1(20 + w) + ' ' + f1(40.4 + i * 5.4));
      }
      s += pshp('M36 80 L31 99 L35.4 96 L38 101 L40 88 Z') + pshp('M44 80 L49 99 L44.6 96 L42 101 L40 88 Z');
      s += '<circle cx="40" cy="76.5" r="8.2"/><circle cx="40" cy="76.5" r="5.4" fill="none"/>' + pln('M40 72.4 L41.2 75.4 L44.2 75.6 L41.9 77.5 L42.7 80.5 L40 78.8 L37.3 80.5 L38.1 77.5 L35.8 75.6 L38.8 75.4 Z');
      return s;
    },
    function books() {
      var s = '', i, S = [64, 7, 60, 22, 54, 34, 50, 46], p, t, a, L, r = rng(3);
      function bk(x, y, w, h, k) {
        var o = '', i, py = y + 3.2, ph = h - 6.4;
        o += pshp('M' + x + ' ' + y + ' H' + (x + w) + ' V' + (y + 3.2) + ' H' + x + ' Z') + pshp('M' + x + ' ' + (y + h - 3.2) + ' H' + (x + w) + ' V' + (y + h) + ' H' + x + ' Z');
        o += pshp('M' + (x + 1.6) + ' ' + py + ' H' + (x + w - 1) + ' V' + (py + ph) + ' H' + (x + 1.6) + ' Z');
        for (i = 1; i < 5; i++) o += pln('M' + (x + 3) + ' ' + f1(py + ph * i / 5) + ' H' + (x + w - 2.4));
        o += pshp('M' + x + ' ' + y + ' C' + (x - 5.5 - k) + ' ' + (y + h * .3) + ' ' + (x - 5.5 - k) + ' ' + (y + h * .7) + ' ' + x + ' ' + (y + h) + ' Z') + pln('M' + (x - 2.6) + ' ' + (y + 3) + ' V' + (y + h - 3));
        return o;
      }
      s += bk(10, 86, 62, 19, 0) + bk(16, 66, 52, 18, 1) + bk(11, 48, 58, 17, 2);
      for (t = .08; t < .9; t += .07) {
        p = bez(S, t); a = (p[2] - 68) * Math.PI / 180; L = 11 * Math.pow(Math.sin(Math.PI * Math.min(t * 1.05, 1)), .6) * (.8 + r() * .35);
        s += pln('M' + f1(p[0]) + ' ' + f1(p[1]) + ' l' + f1(Math.cos(a) * L) + ' ' + f1(Math.sin(a) * L));
      }
      s += pshp('M64 7 C77 17 73 36 50 46 C55 34 60 20 64 7 Z') + pln('M64 7 C60 22 54 34 50 46');
      return s;
    }
  ];
  // Real drawn extent of each design (in its own 80x110 box), so the art can be centered and the ground and cream wash can follow it.
  var OBOX = {};
  function objBox(k) {
    k = k % PENOBJ.length;
    if (OBOX[k]) return OBOX[k];
    var ns = 'http://www.w3.org/2000/svg', sv = document.createElementNS(ns, 'svg'), g = document.createElementNS(ns, 'g'), b;
    sv.setAttribute('width', 300); sv.setAttribute('height', 300); sv.setAttribute('viewBox', '-60 -60 200 220');
    sv.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden';
    g.innerHTML = PENOBJ[k]();
    sv.appendChild(g); document.body.appendChild(sv);
    try { b = g.getBBox(); b = { x: b.x, y: b.y, w: b.width, h: b.height }; } catch (e) { b = { x: 0, y: 0, w: 80, h: 110 }; }
    document.body.removeChild(sv);
    if (!(b.w > 4 && b.h > 4)) b = { x: 0, y: 0, w: 80, h: 110 };
    return (OBOX[k] = b);
  }
  function placeObj(k, cx, cy, maxW, maxH, sc0) {
    var b = objBox(k), sc = Math.min(maxW / b.w, maxH / b.h, sc0);
    return { tx: cx - (b.x + b.w / 2) * sc, ty: cy - (b.y + b.h / 2) * sc, sc: sc, w: b.w * sc, h: b.h * sc };
  }
  function penObject(k, tx, ty, sc, id) {
    var o = (PENOBJ[k % PENOBJ.length]()).replace(/ stroke-width="[^"]*"/g, ''), T = 'translate(' + tx + ' ' + ty + ') scale(' + sc + ')';
    return '<g transform="' + T + '" stroke-linejoin="round" stroke-linecap="round">' +
      '<g fill="' + WASH + '" stroke="none">' + o + '</g>' +
      '<g mask="url(#sm' + id + ')" fill="url(#ht' + id + ')" stroke="none" opacity="' + (PEN > 1 ? .95 : .7) + '">' + o + '</g>' +
      '<g mask="url(#sn' + id + ')" fill="url(#hx' + id + ')" stroke="none" opacity="' + (PEN > 1 ? .8 : .55) + '">' + o + '</g>' +
      '<g filter="url(#wa' + id + ')" fill="none" stroke="' + OL + '" stroke-width="' + (1.1 * PW) + '" opacity=".95">' + o + '</g>' +
      '<g filter="url(#wb' + id + ')" transform="translate(-.5 .5)" fill="none" stroke="' + OL + '" stroke-width="' + (.65 * PW) + '" opacity=".55">' + o + '</g>' +
      '<g filter="url(#wc' + id + ')" transform="translate(.7 -.3)" fill="none" stroke="' + OL + '" stroke-width="' + (.45 * PW) + '" opacity=".4">' + o + '</g></g>';
  }
  function penWrap(id, w, h, inner) {
    return penDefs(id, w, h) + '<g mask="url(#mk' + id + ')"><g filter="url(#gr' + id + ')"><g filter="url(#wb' + id + ')">' + inner + '</g></g></g>';
  }
  function penPlate(k) {
    var id = ++ARTN, o = placeObj(k, 100, 84, 88, 104, 1.1), gy = 84 + o.h / 2 + 5,
      inner = '<ellipse cx="100" cy="90" rx="66" ry="64" fill="' + BLOB + '" filter="url(#bl' + id + ')"/>' + ghostSketch(31 + k * 7, 200, 160, 9) +
      '<g opacity=".72">' + vine(VL, { fruit: 2, leaf: .9, sparse: 1, id: id, seed: 3 + k * 5 }) + '<g transform="translate(200 0) scale(-1 1)">' + vine(VL, { fruit: 1, leaf: .9, sparse: 1, id: id, seed: 11 + k * 7 }) + '</g></g>' +
      scribbleGround(100, gy, Math.max(40, o.w * .55), 17 + k * 3, PEN > 1 ? 44 : 26) + penObject(k, o.tx, o.ty, o.sc, id);
    return '<svg class="ornsvg plate" viewBox="0 0 200 170" aria-hidden="true">' + penWrap(id, 200, 170, inner) + '</svg>';
  }
  function penBand(k, medal) {
    var id = ++ARTN, vb = medal ? '0 0 302 100' : '0 12 302 56', inner = '', o, cy = 47, vineSvg;
    vineSvg = vine(BL.map(function (a) { return a.map(function (n, i) { return i % 2 ? n + (medal ? 10 : 0) : n; }); }), { fruit: 1, leaf: .85, w: 1.8, id: id, seed: 19 + k * 3 });
    if (medal) {
      o = placeObj(k, 151, cy, 62, 52, .8);
      inner += '<ellipse cx="151" cy="' + (cy + 3) + '" rx="48" ry="38" fill="' + BLOB + '" filter="url(#bl' + id + ')"/>' + ghostSketch(5 + k * 3, 302, 90, 6);
      // the vine tucks behind the drawing: an oval cut-out where the object sits
      inner += '<mask id="vc' + id + '" maskUnits="userSpaceOnUse" x="0" y="0" width="302" height="100"><rect width="302" height="100" fill="#fff"/>' +
        '<ellipse cx="151" cy="' + (cy + 2) + '" rx="' + f1(o.w / 2 + 9) + '" ry="' + f1(o.h / 2 + 8) + '" fill="#000" filter="url(#bl' + id + ')"/></mask>' +
        '<g mask="url(#vc' + id + ')">' + vineSvg + '</g>' +
        scribbleGround(151, cy + o.h / 2 + 3, Math.max(30, o.w * .6), 9 + k * 5, 16) + penObject(k, o.tx, o.ty, o.sc, id);
    } else {
      inner += ghostSketch(5 + k * 3, 302, 56, 6) + vineSvg;
    }
    return '<svg class="ornsvg band' + (medal ? ' med' : '') + '" viewBox="' + vb + '" aria-hidden="true">' + penWrap(id, 302, medal ? 100 : 68, inner) + '</svg>';
  }
  var VL = [[50,166, 22,160, 24,136, 44,128],[44,128, 68,120, 36,100, 44,84],[44,84, 52,66, 30,52, 40,36],[40,36, 46,22, 60,14, 80,8]];
  function svgPlate(k) {
    if (PEN) return penPlate(k);
    var v = vine(VL, { fruit: 2, leaf: 1 });
    return '<svg class="ornsvg plate" viewBox="0 0 200 170" aria-hidden="true">' + latticePanel(64, 16, 72, 140, 9, 11 + k * 5) + objectG(k, 66.4, 40, .84) + vignette(64, 16, 72, 140) +
      '<rect x="64" y="16" width="72" height="140" fill="none" stroke="' + TLD + '" stroke-width="2.2"/>' +
      v + '<g transform="translate(200 0) scale(-1 1)">' + vine(VL, { fruit: 1, leaf: 1 }) + '</g></svg>';
  }
  var BL = [[4,40, 30,10, 54,68, 92,40],[92,40, 120,16, 138,64, 168,40],[168,40, 198,14, 216,62, 252,38],[252,38, 270,26, 286,40, 298,34]];
  function svgBand(k, medal) {
    if (PEN) return penBand(k, medal);
    var h = medal ? 100 : 56, y0 = medal ? 50 : 28, sy = 1;
    var s = '<svg class="ornsvg band' + (medal ? ' med' : '') + '" viewBox="0 ' + (medal ? 0 : 12) + ' 302 ' + (medal ? 100 : 56) + '" aria-hidden="true">';
    s += vine(BL.map(function (a) { return a.map(function (n, i) { return i % 2 ? n + (medal ? 10 : 0) : n; }); }), { fruit: 1, leaf: .9, w: 1.8 });
    if (medal) {
      s += '<circle cx="151" cy="50" r="30" fill="' + TL + '"/><circle cx="151" cy="50" r="30" fill="none" stroke="' + TLD + '" stroke-width="2.4"/><circle cx="151" cy="50" r="25" fill="none" stroke="' + LL + '" stroke-width=".8" opacity=".7"/>' + objectG(k, 151 - 40 * .34, 50 - 55 * .34, .34) + vignette(121, 20, 60, 60, 'c');
    }
    return s + '</svg>';
  }


  // ?gallery shows every design for review.
  if (/[?&]gallery\b/.test(location.search)) window.addEventListener('load', function () {
    var n = PEN ? PENOBJ.length : OBJECTS.length, names = ['Scales', 'Gavel', 'Courthouse', 'Book and quill', 'Scroll and seal', 'Law books'], h = '', k;
    for (k = 0; k < n; k++) h += '<div class="gc"><div class="gp">' + svgPlate(k) + '</div><div class="gb">' + svgBand(k, true) + '</div><p>' + (k + 1) + '. ' + (names[k] || '') + '</p></div>';
    var d = document.createElement('div');
    d.id = 'gallery'; d.innerHTML = h;
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;overflow:auto;background:#e6dcc3;display:flex;flex-wrap:wrap;gap:28px;padding:28px;font:16px "Times New Roman",serif;color:#3a2e1d';
    document.body.appendChild(d);
    var st = document.createElement('style');
    st.textContent = '#gallery .gc{width:330px;text-align:center}#gallery .gp svg{height:260px;width:auto;max-width:100%}#gallery .gb svg{width:100%;height:auto}#gallery p{margin:6px 0 0}';
    document.head.appendChild(st);
  });

  // Free height, in px, under the last element of a page that sits in the measuring leaf.
  function pageRoom(pg, slack) {
    var cs = getComputedStyle(pg), fsz = parseFloat(cs.fontSize) || 16;
    var limit = pg.clientHeight - parseFloat(cs.paddingBottom) - (slack || 0) * fsz;
    var last = pg.lastElementChild, bottom = parseFloat(cs.paddingTop) || 0;
    if (last) bottom = last.offsetTop + last.offsetHeight + (parseFloat(getComputedStyle(last).marginBottom) || 0);
    return { room: limit - bottom, em: fsz, limit: limit };
  }

  /* The pencil art is drawn with SVG filters (turbulence, displacement, grain). Left live inside a page face that is
     rotated and clipped on every frame of the cover swing, they make the swing stutter. So each piece is drawn once into
     a bitmap while the book is being built, and the swing waits for the bitmaps (whenArtReady). The vector version shows
     at once and is swapped for the bitmap as soon as it is decoded. */
  var ARTJOBS = [], BLOBS = [], ARTLIVE = {}, ARTURL = {}, ARTKEY = 0;
  function bakeArt(box, sv, str) {
    var r = sv.getBoundingClientRect();
    if (!(r.width > 4 && r.height > 4)) return;
    var sc = Math.min(2, Math.max(1.5, window.devicePixelRatio || 1)),
      W = Math.round(r.width * sc), Hp = Math.round(r.height * sc), im = new Image(), uri;
    uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      str.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + Hp + '" '));
    im.className = sv.getAttribute('class'); im.alt = ''; im.draggable = false; im.setAttribute('aria-hidden', 'true');
    im.style.height = sv.style.height; im.src = uri;
    var key = ++ARTKEY; im.setAttribute('data-art', key);
    box.replaceChild(im, sv);
    ARTJOBS.push(new Promise(function (res) {
      var raw = new Image();
      raw.onload = function () {
        try {
          var c = document.createElement('canvas');
          c.width = W; c.height = Hp;
          c.getContext('2d').drawImage(raw, 0, 0, W, Hp);
          c.toBlob(function (b) {
            if (!b) { res(); return; }
            var u = URL.createObjectURL(b), live = ARTLIVE[key] || [];
            BLOBS.push(u); ARTURL[key] = u;
            // the book shows clones of these pages (fillFace), so the bitmap goes to every live copy
            Promise.all(live.map(function (i) { i.src = u; return i.decode ? i.decode().catch(function () {}) : null; })).then(res, res);
          }, 'image/png');
        } catch (e) { res(); }
      };
      raw.onerror = function () { res(); };
      raw.src = uri;
    }));
  }
  // Paginating and baking take a while, so they start as soon as a book is picked, while it is still flying off the shelf
  // (that flight runs on the compositor and does not mind a busy main thread). buildBook picks the result up if the
  // book size has not changed in the meantime.
  var PRE = null;
  function resetArt() {
    BLOBS.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} });
    BLOBS = []; ARTJOBS = []; ARTLIVE = {}; ARTURL = {};
  }
  function bookFs(P) { return tight ? MINTXT : clamp(P / 28, 13.5, 19); }
  function prepBook(v) {
    var d = dual, dm = bookDims(), P = dm.P, Hh = dm.Hh, fs = bookFs(P);
    resetArt();
    var pages = paginate(v.pages, d, P, Hh, fs);
    PRE = { id: v.id, d: d, P: P, Hh: Hh, pages: pages, ready: ARTJOBS.length ? Promise.all(ARTJOBS) : null };
  }
  function whenArtReady(fn) {
    var done = false;
    function go() { if (!done) { done = true; fn(); } }
    if (!S.artReady) { go(); return; }
    S.artReady.then(go, go);
    setTimeout(go, 900 * K);
  }

  function paginate(src, dual, P, Hh, fs) {
    var sh = el('div', 'book ' + (dual ? 'dual' : 'single') + (tight ? ' tight' : ''));
    sh.style.cssText = 'position:absolute;left:-99999px;top:0;visibility:hidden;pointer-events:none;width:' + (dual ? 2 * P : P) + 'px;height:' + Hh + 'px;font-size:' + fs + 'px';
    var base = el('div', 'base'), face = el('div', 'face sheet r');
    base.appendChild(face); sh.appendChild(base); mount.appendChild(sh);

    function fits(pg) { return pageRoom(pg, .6).room >= -0.5; }
    function fresh(model, more) {
      var p = model.cloneNode(false);
      if (more) p.className += ' more';
      face.innerHTML = ''; face.appendChild(p); return p;
    }
    function textsOf(n) {
      var w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT), t, a = [];
      while ((t = w.nextNode())) a.push(t);
      return a;
    }
    function boundaries(n) {
      var ts = textsOf(n), out = [], i, re, m, s, e;
      for (i = 0; i < ts.length; i++) {
        s = ts[i].nodeValue; re = /\s+/g;
        while ((m = re.exec(s))) { e = m.index + m[0].length; if (e < s.length || i < ts.length - 1) out.push([i, e]); }
      }
      return out;
    }
    function cutAt(n, b) {
      var c = n.cloneNode(true), t = textsOf(c)[b[0]], r = document.createRange();
      r.setStart(t, b[1]); r.setEnd(c, c.childNodes.length);
      var frag = r.extractContents(), tail = n.cloneNode(false);
      tail.removeAttribute('id'); tail.appendChild(frag); tail.className += ' cont';
      return { head: c, tail: tail };
    }
    // Split a paragraph at a word boundary so the head just fills the page. Returns the tail, or null.
    function splitPara(cur, node) {
      var bs = boundaries(node), lo = -1, hi = bs.length - 1, mid, cut, lh;
      if (bs.length < 6) return null;
      while (lo < hi) {
        mid = Math.ceil((lo + hi + 1) / 2); cut = cutAt(node, bs[mid]);
        cur.appendChild(cut.head); var ok = fits(cur); cur.removeChild(cut.head);
        if (ok) lo = mid; else hi = mid - 1;
      }
      while (lo > 0 && bs.length - lo < 5) lo--;           // keep a few words for the next page
      if (lo < 0) return null;
      cut = cutAt(node, bs[lo]); cur.appendChild(cut.head);
      lh = parseFloat(getComputedStyle(cut.head).lineHeight) || (parseFloat(getComputedStyle(cut.head).fontSize) * 1.42);
      if (cut.head.offsetHeight < lh * 1.9 || !fits(cur)) { cur.removeChild(cut.head); return null; }   // no orphan lines
      return cut.tail;
    }
    // Split a list between items. Returns the remainder list, or null.
    function splitList(cur, node) {
      var shell = node.cloneNode(false), k = 0, li;
      shell.removeAttribute('id'); cur.appendChild(shell);
      while ((li = node.firstElementChild)) {
        shell.appendChild(li);
        if (!fits(cur)) { shell.removeChild(li); node.insertBefore(li, node.firstChild); break; }
        k++;
      }
      if (!k) { cur.removeChild(shell); return null; }
      if (!node.firstElementChild) return 'done';
      if (node.tagName === 'OL') node.setAttribute('start', (parseInt(node.getAttribute('start') || '1', 10) + k));
      return node;
    }
    function keepNext(e) {
      return e.tagName === 'H3' || e.tagName === 'H4' || e.classList.contains('orgmark') || e.classList.contains('orgline') || e.classList.contains('roleline') ||
        (e.classList.contains('meta') && e.previousElementSibling && e.previousElementSibling.tagName === 'H4');
    }

    var out = [];
    src.forEach(function (page) {
      if (!page) { out.push(page); return; }
      var model = page.cloneNode(true);
      $$('.orgmark', model).forEach(function (f) { var im = f.querySelector('img'); if (!im || IMGOK[im.getAttribute('src')] === false) f.parentNode.removeChild(f); });
      $$('img', model).forEach(function (im) { im.setAttribute('data-src', im.getAttribute('src') || ''); im.removeAttribute('src'); });
      if (model.className.indexOf('title') >= 0) { out.push(model); return; }
      // Upright spread on a phone: each position gets the whole spread, as on a desktop. The left page carries the logo, the
      // organization, the role and the dates; the right page carries the description. If either would overflow, flow normally.
      if (dual && tight && model.classList.contains('org')) {
        var kids = [].slice.call(model.children), hd = [], bd = [];
        kids.forEach(function (c) { (c.classList.contains('orgmark') || c.classList.contains('orgline') || c.classList.contains('roleline') ? hd : bd).push(c); });
        if (bd.length) {
          kids.forEach(function (c) { model.removeChild(c); });
          var pl = fresh(model, false); hd.forEach(function (c) { pl.appendChild(c); }); var okL = fits(pl);
          var pr = fresh(model, true); bd.forEach(function (c) { pr.appendChild(c); }); var okR = fits(pr);
          if (okL && okR) { if (out.length % 2) out.push(null); out.push(pl, pr); return; }
          kids.forEach(function (c) { model.appendChild(c); });
        }
      }
      var queue = [].slice.call(model.children), cur = fresh(model, false), node, tail, held, guard = 0;
      queue.forEach(function (c) { model.removeChild(c); });
      while (queue.length && guard++ < 400) {
        node = queue.shift(); cur.appendChild(node);
        if (fits(cur)) continue;
        cur.removeChild(node);
        tail = node.tagName === 'P' ? splitPara(cur, node) : (node.tagName === 'OL' || node.tagName === 'UL') ? splitList(cur, node) : null;
        if (tail === 'done') continue;
        held = [];
        if (!tail) {
          if (!cur.children.length) { cur.appendChild(node); out.push(cur); cur = fresh(model, true); continue; }   // taller than a leaf: let it be
          while (cur.children.length > 1 && keepNext(cur.lastElementChild)) held.unshift(cur.removeChild(cur.lastElementChild));
          tail = node;
        }
        out.push(cur); cur = fresh(model, true);
        queue.unshift.apply(queue, held.concat([tail]));
      }
      if (cur.children.length) out.push(cur);
    });

    // Dress leftover room with a period plate: a vine band, or a lattice panel for the big gaps.
    var oi = 0;
    out.forEach(function (pg) {
      if (!pg || pg.className.indexOf('title') >= 0) return;
      face.innerHTML = ''; face.appendChild(pg);
      var r = pageRoom(pg, 0), gap = r.room / r.em, box, k, sv, hh, str;
      if (gap < 5) return;
      k = oi++;
      str = gap < 10 ? svgBand(k, false) : gap < 17 ? svgBand(k, true) : svgPlate(k);
      box = el('div', 'fillr', str);
      box.style.height = Math.floor(r.room - r.em * .7) + 'px';
      box.style.marginTop = (r.em * .35) + 'px';
      pg.appendChild(box);
      sv = box.firstChild;
      hh = gap < 10 ? Math.min(gap - 2.5, 3.4) : gap < 17 ? Math.min(gap - 2.5, 8) : Math.min(gap - 2.2, 17.5);
      sv.style.height = hh + 'em';
      if (PEN) bakeArt(box, sv, str);
    });
    face.innerHTML = '';
    mount.removeChild(sh);
    return out;
  }

  function buildBook(v, startSpread, instant) {
    mount.innerHTML = '';
    var d = dual, dm = bookDims(), P = dm.P, Hh = dm.Hh, pages;
    var fs = bookFs(P);
    if (PRE && PRE.id === v.id && PRE.d === d && PRE.P === P && PRE.Hh === Hh) {
      pages = PRE.pages; S.artReady = PRE.ready;
    } else {
      resetArt();
      pages = paginate(v.pages, d, P, Hh, fs);
      S.artReady = ARTJOBS.length ? Promise.all(ARTJOBS) : null;
    }
    PRE = null;
    if (d && pages.length % 2) pages.push(null);
    var n = pages.length;
    var color = THEMES[v.id] || '#5b2229';

    var wrap = el('div', 'bookwrap' + (rotBook ? ' rot' : ''));
    wrap.style.top = Math.round(H * 0.5 - 4) + 'px';
    var book = el('div', 'book ' + (d ? 'dual' : 'single') + (tight ? ' tight' : ''));
    book.style.width = (d ? 2 * P : P) + 'px';
    book.style.height = Hh + 'px';
    book.style.left = (d ? -P : -P / 2) + 'px';
    book.style.top = (-Hh / 2) + 'px';
    book.style.fontSize = fs + 'px';

    var bl = el('div', 'bd bl'), br = el('div', 'bd br');
    bl.style.backgroundColor = br.style.backgroundColor = color;
    var kl = el('div', 'stk l'), kr = el('div', 'stk r');
    book.appendChild(bl); book.appendChild(br); book.appendChild(kl); book.appendChild(kr);

    var base = el('div', 'base');
    var bf = el('div', 'face sheet r'); fillFace(bf, pages[n - 1], n - 1); base.appendChild(bf);
    book.appendChild(base);

    var leaves = [];
    function mkLeaf(cls) { var l = el('div', 'leaf ' + (cls || '')); leaves.push(l); book.appendChild(l); return l; }

    var cover = mkLeaf('cover');
    var cf = el('div', 'face front cv', coverInner(v)); cf.style.backgroundImage = coverImg(v);
    var cb = el('div', 'face back sheet l');
    if (d) fillFace(cb, pages[0], 0); else cb.className += ' blank';
    cover.appendChild(cf); cover.appendChild(cb);

    var j;
    if (d) {
      for (j = 1; j <= (n - 2) / 2; j++) {
        var lf = mkLeaf();
        var f1 = el('div', 'face front sheet r'); fillFace(f1, pages[2 * j - 1], 2 * j - 1);
        var f2 = el('div', 'face back sheet l'); fillFace(f2, pages[2 * j], 2 * j);
        lf.appendChild(f1); lf.appendChild(f2);
      }
    } else {
      for (j = 1; j <= n - 1; j++) {
        var lf2 = mkLeaf();
        var g1 = el('div', 'face front sheet r'); fillFace(g1, pages[j - 1], j - 1);
        var g2 = el('div', 'face back sheet l blank');
        lf2.appendChild(g1); lf2.appendChild(g2);
      }
    }

    // logos and any other page images are decoded before the cover swings, not on the first frames of the swing
    var dec = [].slice.call(book.querySelectorAll('img[data-src]')).map(function (im) { return im.decode ? im.decode().catch(function () {}) : null; });
    if (dec.length) { S.artReady = Promise.all([S.artReady].concat(dec)); }

    var hl = el('button', 'hot l'); hl.type = 'button'; hl.setAttribute('aria-label', 'Previous pages');
    var hr = el('button', 'hot r'); hr.type = 'button'; hr.setAttribute('aria-label', 'Next pages');
    hl.addEventListener('click', function () { step(-1); });
    hr.addEventListener('click', function () { step(1); });
    book.appendChild(hl); book.appendChild(hr);

    var sx = 0, sy = 0, st = 0, sid = null;
    book.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') { return; }
      sx = e.clientX; sy = e.clientY; st = e.timeStamp; sid = e.pointerId;
    });
    book.addEventListener('pointerup', function (e) {
      if (e.pointerId !== sid) { return; }
      sid = null;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (rotBook) { var t0 = dx; dx = dy; dy = -t0; }   // the book is turned a quarter, so its sideways is the screen's up and down
      var ax = Math.abs(dx), ay = Math.abs(dy);
      var flick = ax > 26 && ax / Math.max(1, e.timeStamp - st) > 0.35;
      if ((ax > 44 || flick) && ax > ay * 1.2) { step(dx < 0 ? 1 : -1); }
    });
    book.addEventListener('pointercancel', function () { sid = null; });
    book.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a, button, input, textarea, select, label')) { return; }
      var r = book.getBoundingClientRect();
      step((rotBook ? e.clientY >= r.top + r.height / 2 : e.clientX >= r.left + r.width / 2) ? 1 : -1);
    });

    wrap.appendChild(book); mount.appendChild(wrap);

    S.stkL = kl; S.stkR = kr; S.stkT = clamp(P * 0.02, 5, 9);
    S.dual = d; S.leaves = leaves; S.book = book; S.wrap = wrap; S.hotL = hl; S.hotR = hr;
    S.total = d ? n / 2 : n;
    S.spread = startSpread || 0;
    S.vol = v; S.base = base;
    showLeaves(S.spread - 3, S.spread + 2);

    book.classList.add('noanim');
    leaves.forEach(function (l, i) {
      var fl = i < S.spread;
      l.classList.toggle('flipped', fl);
      l.style.zIndex = fl ? i : leaves.length - i;
    });
    book.classList.toggle('open', S.spread > 0);
    book.classList.toggle('seal', S.spread === 0);
    book.classList.toggle('snug', S.spread === 0); book.classList.toggle('tuck', S.spread === 0);
    if (leaves[1]) { leaves[1].classList.add('top'); }
    tuckSet(leaves[1], S.spread === 0 ? 1 : 0, S.spread === 0 ? 1 : 0);
    S.queued = null;
    if (instant) wrap.classList.add('landed');
    void book.offsetWidth;
    requestAnimationFrame(function () { requestAnimationFrame(function () { book.classList.remove('noanim'); }); });
    updateUI();
  }

  /* ==================================================================
     Turning pages
     ================================================================== */
  /* The cover leaf turns with this curve. The left board, the page-edge strips and the
     recentering of the book all follow the same curve, so nothing moves ahead of the cover. */
  var LEAF_EASE = 'cubic-bezier(.45,.05,.25,1)';
  function bezier(x1, y1, x2, y2) {
    return function (t) {
      var lo = 0, hi = 1, m = t, i;
      for (i = 0; i < 24; i += 1) {
        m = (lo + hi) / 2;
        var x = 3 * (1 - m) * (1 - m) * m * x1 + 3 * (1 - m) * m * m * x2 + m * m * m;
        if (x < t) { lo = m; } else { hi = m; }
      }
      return 3 * (1 - m) * (1 - m) * m * y1 + 3 * (1 - m) * m * m * y2 + m * m * m;
    };
  }
  var leafCurve = bezier(0.45, 0.05, 0.25, 1);
  var CROSS = (function () { var lo = 0, hi = 1, m, i; for (i = 0; i < 30; i += 1) { m = (lo + hi) / 2; if (leafCurve(m) < 0.5) { lo = m; } else { hi = m; } } return m; })();
  // The left board is the inside of the cover once it has swung past vertical,
  // so its width is the cover's horizontal reach to the left: max(0, -cos(angle)).
  function trackBoard(bl, opening, ms) {
    var kf = [], n = 32, i;
    for (i = 0; i <= n; i += 1) {
      var t = i / n, a = leafCurve(t);
      if (!opening) { a = 1 - a; }
      kf.push({ offset: t, transform: 'scaleX(' + Math.max(0, -Math.cos(Math.PI * a)).toFixed(4) + ')' });
    }
    if (!bl.animate) { return; }
    bl.getAnimations().forEach(function (x) { x.cancel(); });
    var an = bl.animate(kf, { duration: Math.max(1, ms), easing: 'linear', fill: 'forwards' });
    an.onfinish = function () { an.cancel(); };
  }

  // The page block is tucked inside the cover while the cover is nearly flat. --tk (edges) fades out over the first
  // few degrees of the turn, --tl (spine side) over the first quarter turn. Both follow the cover's own angle, so
  // opening and closing are mirror images and no frame can show paper outside the cover's silhouette.
  var BARE_OPEN = 0.43, BARE_CLOSE = 0.30;   // fractions of the turn: cover is about 105 degrees open at 0.43 opening, about 125 at 0.30 closing
  var TK_DEG = 8, TL_DEG = 90;
  function tuckAt(deg) { return [Math.max(0, 1 - deg / TK_DEG), Math.max(0, 1 - deg / TL_DEG)]; }
  function tuckSet(el, tk, tl) { if (!el) { return; } el.style.setProperty('--tk', tk); el.style.setProperty('--tl', tl); }
  function trackTuck(book, opening, ms) {
    var bk = book.querySelector('.leaf.top'), end = tuckAt(opening ? 180 : 0), kf = [], n = 24, i;
    if (!bk) { return; }
    if (bk.getAnimations) { bk.getAnimations().forEach(function (x) { if (x.__tuck) { x.cancel(); } }); }
    tuckSet(bk, end[0], end[1]);
    if (!bk.animate) { return; }
    // Both values are already 0 once the cover is past 90 degrees (CROSS is the moment it gets there), so only that
    // half of the turn is animated. Running the animation to the end would restyle every page face on every frame for nothing.
    for (i = 0; i <= n; i += 1) {
      var t = opening ? CROSS * i / n : CROSS + (1 - CROSS) * i / n, a = leafCurve(t), v;
      if (!opening) { a = 1 - a; }
      v = tuckAt(a * 180);
      kf.push({ offset: i / n, '--tk': v[0].toFixed(4), '--tl': v[1].toFixed(4) });
    }
    var span = opening ? CROSS : 1 - CROSS;
    var an = bk.animate(kf, { duration: Math.max(1, ms * span), delay: opening ? 0 : ms * CROSS, easing: 'linear', fill: opening ? 'forwards' : 'both' });
    an.__tuck = true;
    an.onfinish = function () { an.cancel(); };
  }

  /* At any moment only the leaves around the current spread can be seen (the one turning and the pages it uncovers).
     Every other leaf is taken out of the render (class "far"), which cuts the overdraw a long book would otherwise
     cost on every frame of a turn. lo and hi are leaf indices; the cover (0) is never touched here. */
  function showLeaves(lo, hi) {
    if (!S.leaves) { return; }
    S.leaves.forEach(function (l, i) { if (i) { l.classList.toggle('far', i < lo || i > hi); } });
    if (S.base) { S.base.classList.toggle('far', hi < S.leaves.length - 1); }
  }

  function flipEl(j, fwd, dur, delay) {
    var l = S.leaves[j], N = S.leaves.length;
    setTimeout(function () {
      if (!S.leaves[j] || S.leaves[j] !== l) return;
      var d = dur * K;
      l.style.transition = 'transform ' + d + 'ms ' + LEAF_EASE + ', opacity ' + (fwd ? '160ms linear ' + Math.round(d * 0.62) + 'ms' : '100ms linear 0ms');
      // Turning forward, later leaves land on top of earlier ones. Turning back, a leaf starts
      // above the pile on the left, then drops beneath the leaves that follow it once it has
      // swung past vertical, so the next leaf (and finally the cover) always lands on top.
      l.style.zIndex = fwd ? 200 + j : 200 + j;
      if (!fwd) { setTimeout(function () { l.style.zIndex = 200 + N - j; }, d * CROSS); }
      l.classList.toggle('flipped', fwd);
      setTimeout(function () { l.style.zIndex = fwd ? j : N - j; }, d + 30);
    }, delay * K);
  }

  function turnTo(target, opts, done) {
    var cur = S.spread;
    if (target === cur) { if (done) done(); return; }
    var dir = target > cur ? 1 : -1, n = Math.abs(target - cur);
    if (cur === 0 && S.book) { S.book.classList.remove('seal'); S.book.classList.remove('snug'); S.book.classList.add('bare'); S.book.classList.add('tuck'); }
    var dur = (opts && opts.dur) || (n > 1 ? 560 : 900);
    var stagger = n > 1 ? 130 : 0;
    var list = [], s;
    for (s = cur; s !== target; s += dir) list.push(dir > 0 ? s : s - 1);
    showLeaves(Math.min(cur, target) - 3, Math.max(cur, target) + 2);
    list.forEach(function (j, i) { flipEl(j, dir > 0, dur, i * stagger); });
    S.spread = target;
    S.turning = true;
    var edge = (cur === 0 || target === 0), cdl = edge ? list.indexOf(0) * stagger : 0;
    [S.stkL, S.stkR].forEach(function (k, ki) {
      if (!k) { return; }
      if (ki === 0 && target === 0) { k.style.transition = 'width ' + Math.round((cdl + dur * 0.16) * K) + 'ms ease-in'; return; }
      k.style.transition = edge ? ('width ' + Math.round(dur * (target === 0 ? 0.36 : 0.4) * K) + 'ms ease ' + Math.round((cdl + dur * (target === 0 ? 0.04 : 0.6)) * K) + 'ms') : '';
    });
    updateUI();
    if (cur === 0 || target === 0) {
      var cd = list.indexOf(0) * stagger;
      var bk = S.book;
      setTimeout(function () {
        if (S.book !== bk) return;
        bk.style.transitionDuration = (dur * K) + 'ms';
        bk.style.transitionTimingFunction = LEAF_EASE;
        $$('.bd.bl', bk).forEach(function (x) { trackBoard(x, target > 0, dur * K); });
        trackTuck(bk, target > 0, dur * K);
        bk.classList.toggle('open', target > 0);
      }, cd * K);
      // boards and page edges stay out of sight until the cover has swung past vertical (opening), and go again before it
      // comes back through vertical (closing)
      if (target > 0) {
        setTimeout(function () { if (S.book === bk && S.spread > 0) { bk.classList.remove('bare'); } }, (cd + dur * BARE_OPEN) * K);
        setTimeout(function () { if (S.book === bk && S.spread > 0) { bk.classList.remove('tuck'); } }, (cd + dur * CROSS) * K);
      } else {
        setTimeout(function () { if (S.book === bk) { bk.classList.add('bare'); } }, (cd + dur * BARE_CLOSE) * K);
        setTimeout(function () { if (S.book === bk && S.spread === 0) { bk.classList.add('tuck'); } }, (cd + dur * CROSS) * K);
      }
      if (target === 0) {
        setTimeout(function () { if (S.book === bk && S.spread === 0) { bk.classList.add('snug'); } }, (cd + dur * 0.12) * K);
        setTimeout(function () { if (S.book === bk && S.spread === 0) { bk.classList.add('seal'); } }, (cd + dur * 0.82) * K);
      }
    }
    var total = (n - 1) * stagger + dur;
    var sealBook = S.book;
    later(total + 60, function () {
      S.turning = false;
      if (S.book === sealBook && sealBook) { showLeaves(S.spread - 3, S.spread + 2); }
      if (target === 0 && S.book === sealBook && sealBook) { sealBook.classList.add('seal'); }
      if (done) done();
      if (S.queued && S.open && !S.busy) { var q = S.queued; S.queued = null; step(q); }
    });
  }

  function step(dir) {
    if (!S.open || S.busy) return;
    if (S.turning) { S.queued = dir; return; }
    var t = S.spread + dir;
    if (t < 1 || t > S.total) return;
    turnTo(t);
  }

  function updateUI() {
    var s = S.spread, d = S.dual;
    if (s < 1) { ui.label.textContent = ''; }
    else if (d) { ui.label.textContent = 'Pages ' + (2 * s - 1) + '-' + (2 * s) + ' of ' + (S.total * 2); }
    else { ui.label.textContent = 'Page ' + s + ' of ' + S.total; }
    ui.prev.disabled = s <= 1;
    ui.next.disabled = s >= S.total;
    if (S.hotL) { S.hotL.disabled = s <= 1; S.hotR.disabled = s >= S.total; }
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
  }

  /* ==================================================================
     Open and close
     ================================================================== */
  function openVol(id, btn) {
    if (S.open || S.busy) return;
    var v = BY[id]; if (!v) return;
    S.busy = true; S.open = true; S.id = id; S.btn = btn; S.next = null;
    $$('.hs.hov').forEach(function (h) { h.classList.remove('hov'); });
    ui.title.textContent = v.label;
    stage.setAttribute('aria-label', v.label + ' volume');
    room.setAttribute('inert', '');
    viewport.classList.add('opening');

    var dm = bookDims(), L = landRect(), sp = null, tLand, isNews = (id === 'news'), isLetter = (id === 'jefferson');
    if (!isNews && !isLetter) { later(60, function () { if (S.open && S.id === id && !S.book) { try { prepBook(v); } catch (e) { PRE = null; } } }); }
    if (v.hs) {
      var from = shelfRect(v);
      sp = makeSprite(v, from, false);
      S.sp = sp;
      v.slot.classList.add('on'); v.hs.style.visibility = 'hidden';
      var lifted = { cx: from.cx, cy: from.cy - 14, w: from.w, h: from.h };
      anim(sp, [{ transform: tf(from, dm, 0, 1) }, { transform: tf(lifted, dm, -1.5, 1.07) }], 380, 'cubic-bezier(.2,.8,.2,1)');
      later(380, function () {
        sp.classList.add('lit');
        world.classList.add('pushed');
        var mid = { cx: (from.cx + L.cx) / 2, cy: Math.min(from.cy, L.cy) - 30, w: (from.w + L.w) / 2.2, h: (from.h + L.h) / 2.2 };
        anim(sp, [{ transform: tf(lifted, dm, -1.5, 1.07) }, { transform: tf(mid, dm, 2.5, 1), offset: 0.5 }, { transform: tf(L, dm, 0, 1) }], 1050, 'cubic-bezier(.45,.05,.2,1)');
      });
      tLand = 1450;
    } else {
      if (isNews && S.globe) { S.globe.classList.add('flare'); }
      if (isLetter && S.bust) { S.bust.classList.add('flare'); }
      later(isNews ? 420 : (isLetter ? 300 : 60), function () { world.classList.add('pushed'); });
      tLand = isNews ? 1150 : (isLetter ? 900 : 800);
    }

    later(tLand, function () {
      if (isNews) { openPaper(v); return; }
      if (isLetter) { openLetter(v); return; }
      buildBook(v, 0, !!sp);
      stage.classList.add('on', 'dimmed');
      stage.setAttribute('aria-hidden', 'false');
      if (sp) {
        if (S.wrap && S.wrap.animate) { S.wrap.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150 * K, easing: 'ease-out' }); }
        anim(sp, [{ opacity: 1, transform: tf(L, dm, 0, 1) }, { opacity: 1, transform: tf(L, dm, 0, 1), offset: 0.5 }, { opacity: 0, transform: tf(L, dm, 0, 1) }], 300, 'linear');
        later(380, function () { if (sp.parentNode) sp.parentNode.removeChild(sp); if (S.sp === sp) S.sp = null; });
      } else {
        later(40, function () { if (S.wrap) S.wrap.classList.add('landed'); });
      }
      later(sp ? 300 : 700, function () {
        var bk0 = S.book;
        whenArtReady(function () {
          if (!S.open || S.book !== bk0) return;
          turnTo(1, { dur: 1150 }, function () {
            S.busy = false;
            if (S.dirty) { S.dirty = false; rebuildOpen(); }
          });
        });
        later(500, function () { ui.top.classList.add('show'); ui.bot.classList.add('show'); ui.close.focus({ preventScroll: true }); });
      });
    });
  }

  /* ==================================================================
     Legal Wire: the newspaper that unfolds when the globe is clicked
     Stories come from news.json, refreshed daily by a GitHub Action.
     ================================================================== */
  var SECTIONS = [
    { id: 'sec', label: 'SEC' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'regs', label: 'Regulations' },
    { id: 'congress', label: 'Congress' },
    { id: 'scotus', label: 'Supreme Court' }
  ];
  var SECLABEL = {};
  SECTIONS.forEach(function (x) { SECLABEL[x.id] = x.label; });
  var NEWS_URLS = ['news.json', 'https://raw.githubusercontent.com/jjwillis111/The-Willis-Writ/main/news.json'];
  var SOURCE_LINKS = [
    ['SEC press releases', 'https://www.sec.gov/newsroom/press-releases'],
    ['FTC press releases', 'https://www.ftc.gov/news-events/news/press-releases'],
    ['Federal Register', 'https://www.federalregister.gov/'],
    ['Congress.gov', 'https://www.congress.gov/'],
    ['Supreme Court opinions', 'https://www.supremecourt.gov/opinions/opinions.aspx']
  ];

  function escA(t) { return esc(t).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function safeUrl(u) { return /^https?:\/\//i.test(String(u || '')) ? String(u) : '#'; }
  function fmtDay(iso) {
    var t = Date.parse(iso);
    if (isNaN(t)) { return ''; }
    return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function byDate(list) {
    return list.slice().sort(function (a, b) { return (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0); });
  }

  function fetchJson(u) {
    var p = fetch(u, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) { throw new Error('bad status'); }
      return r.json();
    }).then(function (d) {
      if (!d || !d.items) { throw new Error('bad data'); }
      return d;
    }).catch(function () { return null; });
    var t = new Promise(function (res) { setTimeout(function () { res(null); }, 7000); });
    return Promise.race([p, t]);
  }

  // Load the site's own copy and the GitHub copy, then keep the newest one.
  // The GitHub copy can be up to five minutes stale, so it never wins on its own.
  function loadNews() {
    if (S.newsP) { return S.newsP; }
    S.newsP = Promise.all(NEWS_URLS.map(fetchJson)).then(function (all) {
      var best = null;
      all.forEach(function (d) {
        if (d && (!best || (Date.parse(d.updated) || 0) > (Date.parse(best.updated) || 0))) { best = d; }
      });
      if (!best) { S.newsP = null; }
      return best;
    });
    return S.newsP;
  }

  function storyHtml(it, lead, i) {
    var when = fmtDay(it.date), sec = SECLABEL[it.section] || '';
    return '<article class="st' + (lead ? ' lead' : '') + '" style="--i:' + (i || 0) + '">' +
      '<p class="sk">' + esc(sec) + (when ? ' &middot; ' + esc(when) : '') + '</p>' +
      '<h3><a href="' + escA(safeUrl(it.url)) + '" target="_blank" rel="noopener noreferrer">' + esc(it.title) + '</a></h3>' +
      '<p class="ss">' + esc(it.source || '') + '</p></article>';
  }

  function emptyHtml(failed) {
    var links = SOURCE_LINKS.map(function (l) {
      return '<li><a href="' + escA(l[1]) + '" target="_blank" rel="noopener noreferrer">' + esc(l[0]) + '</a></li>';
    }).join('');
    return '<div class="p-empty"><h3>' + (failed ? 'The wire is quiet right now.' : 'No stories have been filed yet.') + '</h3>' +
      '<p>' + (failed ? 'The latest edition could not be loaded. Try again in a moment, or read at the source:' : 'The paper fills in each morning. In the meantime, read at the source:') + '</p>' +
      '<ul>' + links + '</ul></div>';
  }

  function renderPaperBody(tab) {
    var body = $('#p-body', S.paper); if (!body) { return; }
    var data = S.newsData, items = (data && data.items) || [], list;
    if (tab === 'all') {
      list = [];
      SECTIONS.forEach(function (x) {
        list = list.concat(byDate(items.filter(function (it) { return it.section === x.id; })).slice(0, 5));
      });
      list = byDate(list);
    } else {
      list = byDate(items.filter(function (it) { return it.section === tab; }));
    }
    if (!list.length) { body.innerHTML = emptyHtml(!data); if (S.scroller) { S.scroller.scrollTop = 0; } return; }
    var rest = list.slice(1);
    body.innerHTML = '<div class="p-lead">' + storyHtml(list[0], true, 0) + '</div>' +
      (rest.length ? '<div class="p-cols">' + rest.map(function (it, n) { return storyHtml(it, false, n + 1); }).join('') + '</div>' : '');
    if (S.scroller) { S.scroller.scrollTop = 0; }
  }

  // keep the folded-over copy of the left half in step with the real sheet while it is still on screen
  function syncFlap(paper) {
    if (!S.flapFronts || !S.pw || S.pw.classList.contains('opened')) { return; }
    var src = $('.p-scroll', paper);
    S.flapFronts.forEach(function (cl) {
      var dst = $('.p-scroll', cl);
      if (src && dst) { dst.innerHTML = src.innerHTML; $$('[id]', dst).forEach(function (n) { n.removeAttribute('id'); }); }
    });
  }

  function buildPaper() {
    var ds = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    var pw = el('div', 'paperwrap');
    var paper = el('article', 'paper');
    paper.setAttribute('aria-label', 'The Willis Writ, Legal Wire');
    paper.innerHTML =
      '<div class="p-head"><header class="mast">' +
        '<h2 class="mast-name" aria-label="The Willis Writ">The <span class="kw" aria-hidden="true">W</span><span aria-hidden="true">illis</span> <span class="kw" aria-hidden="true">W</span><span aria-hidden="true">rit</span></h2>' +
        '<div class="mast-date"><span>' + esc(ds) + '</span><span class="mast-loc"><span>Washington, D.C.</span><i aria-hidden="true">&middot;</i><span class="loc-kc">Kansas City</span></span><span class="mast-r">Legal Wire</span></div>' +
      '</header>' +
      '<nav class="p-tabs" role="tablist" aria-label="Sections"></nav></div>' +
      '<div class="p-scroll">' +
        '<div class="p-body" id="p-body"><p class="p-load">Setting the type</p></div>' +
        '<footer class="p-foot">Headlines and links from public sources. Each story opens at its source.</footer>' +
      '</div>';
    pw.appendChild(el('div', 'paper-shadow-mid'));
    pw.appendChild(el('div', 'paper-shadow'));
    pw.appendChild(paper);
    mount.innerHTML = '';
    mount.appendChild(pw);
    S.pw = pw; S.paper = paper;
    // The masthead stays pinned and shrinks smoothly as the page is scrolled
    var scroller = $('.p-scroll', paper); S.scroller = scroller;
    var pend = false, nameEl = $('.mast-name', paper), dateEl = $('.mast-date', paper);
    scroller.addEventListener('scroll', function () {
      if (pend) { return; }
      pend = true;
      requestAnimationFrame(function () {
        pend = false;
        var p = Math.max(0, Math.min(1, scroller.scrollTop / 150));
        var full = Math.max(42, Math.min(100, window.innerWidth * 0.074));
        nameEl.style.fontSize = (full * (1 - 0.6 * p)).toFixed(1) + 'px';
        nameEl.style.marginTop = (0.1 * (1 - p)).toFixed(3) + 'em';
        var df = Math.max(13, Math.min(17, window.innerWidth * 0.013));
        dateEl.style.fontSize = (df * (1 - 0.15 * p)).toFixed(1) + 'px';
        dateEl.style.paddingTop = dateEl.style.paddingBottom = (7 - 4 * p).toFixed(1) + 'px';
      });
    }, { passive: true });

    var tabs = $('.p-tabs', paper), cur = 'all';
    [{ id: 'all', label: 'Front Page' }].concat(SECTIONS).forEach(function (t) {
      var b = el('button', 'p-tab' + (t.id === 'all' ? ' on' : ''), esc(t.label));
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', t.id === 'all' ? 'true' : 'false');
      b.addEventListener('click', function () {
        cur = t.id;
        $$('.p-tab', tabs).forEach(function (x) {
          var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        renderPaperBody(cur);
      });
      tabs.appendChild(b);
    });

    // the two outer quarters of the sheet, hinged where they fold over the middle half, each with a blank back
    S.flapFronts = [];
    ['l', 'r'].forEach(function (side) {
      var flap = el('div', 'p-flap ' + side), ff = el('div', 'p-flap-front'), fb = el('div', 'p-flap-back');
      var cl = paper.cloneNode(true), bl = paper.cloneNode(false);
      [cl, bl].forEach(function (c) {
        c.classList.add('p-clone'); c.removeAttribute('aria-label'); c.setAttribute('aria-hidden', 'true'); c.setAttribute('inert', '');
        $$('[id]', c).forEach(function (n) { n.removeAttribute('id'); });
      });
      bl.innerHTML = '<span></span>';
      ff.appendChild(cl); fb.appendChild(bl); flap.appendChild(ff); flap.appendChild(fb);
      pw.appendChild(flap);
      S.flapFronts.push(cl);
    });

    loadNews().then(function (d) {
      if (S.paper !== paper) { return; }
      S.newsData = d;
      renderPaperBody(cur);
      syncFlap(paper);
    });
    return pw;
  }

  function openPaper(v) {
    S.vol = v; S.spread = 0; S.total = 0; S.leaves = []; S.book = null; S.wrap = null;
    var pw = buildPaper();
    stage.classList.add('on', 'dimmed');
    stage.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () { requestAnimationFrame(function () { pw.classList.add('on', 'unfolded'); }); });
    later(2040, function () { if (S.pw === pw && pw.classList.contains('unfolded')) { pw.classList.add('opened'); } });
    later(700, function () {
      S.busy = false;
      ui.top.classList.add('show');
      ui.close.focus({ preventScroll: true });
    });
  }


  /* ==================================================================
     Jefferson: click the bust for a notable passage, set as a letter
     ================================================================== */
  var JQ = [
    { place: 'Paris', date: 'January 16, 1787', to: 'To Edward Carrington',
      text: ['The basis of our governments being the opinion of the people, the very first object should be to keep that right; and were it left to me to decide whether we should have a government without newspapers, or newspapers without a government, I should not hesitate a moment to prefer the latter.'] },
    { place: 'Paris', date: 'January 30, 1787', to: 'To James Madison',
      text: ['I hold it that a little rebellion now and then is a good thing, and as necessary in the political world as storms in the physical.'] },
    { place: 'Paris', date: 'August 10, 1787', to: 'To Peter Carr',
      text: ['Fix reason firmly in her seat, and call to her tribunal every fact, every opinion.'] },
    { place: 'Paris', date: 'December 20, 1787', to: 'To James Madison',
      text: ['A bill of rights is what the people are entitled to against every government on earth, general or particular, and what no just government should refuse, or rest on inference.'] },
    { place: 'Monticello', date: 'September 23, 1800', to: 'To Dr. Benjamin Rush',
      text: ['I have sworn upon the altar of God eternal hostility against every form of tyranny over the mind of man.'] },
    { place: 'Washington', date: 'March 4, 1801', to: 'From the First Inaugural Address',
      text: ['If there be any among us who would wish to dissolve this Union or to change its republican form, let them stand undisturbed as monuments of the safety with which error of opinion may be tolerated where reason is left free to combat it.'] },
    { place: 'Washington', date: 'January 1, 1802', to: 'To the Danbury Baptist Association',
      text: ['Believing with you that religion is a matter which lies solely between man and his God, that he owes account to none other for his faith or his worship, that the legitimate powers of government reach actions only, and not opinions, I contemplate with sovereign reverence that act of the whole American people which declared that their legislature should "make no law respecting an establishment of religion, or prohibiting the free exercise thereof," thus building a wall of separation between Church and State.'] },
    { place: 'Washington', date: 'June 11, 1807', to: 'To John Norvell',
      text: ['The man who never looks into a newspaper is better informed than he who reads them; inasmuch as he who knows nothing is nearer to truth than he whose mind is filled with falsehoods and errors.'] },
    { place: 'Monticello', date: 'August 13, 1813', to: 'To Isaac McPherson',
      text: ['He who receives an idea from me, receives instruction himself without lessening mine; as he who lights his taper at mine, receives light without darkening me.'] },
    { place: 'Monticello', date: 'October 28, 1813', to: 'To John Adams',
      text: ['I agree with you that there is a natural aristocracy among men. The grounds of this are virtue and talents. The natural aristocracy I consider as the most precious gift of nature for the instruction, the trusts, and government of society.'] },
    { place: 'Monticello', date: 'January 6, 1816', to: 'To Charles Yancey',
      text: ['If a nation expects to be ignorant and free, in a state of civilization, it expects what never was and never will be. The functionaries of every government have propensities to command at will the liberty and property of their constituents. There is no safe deposit for these but with the people themselves; nor can they be safe with them without information. Where the press is free and every man able to read, all is safe.'] },
    { place: 'Monticello', date: 'May 28, 1816', to: 'To John Taylor',
      text: ['I sincerely believe, with you, that banking establishments are more dangerous than standing armies; and that the principle of spending money to be paid by posterity, under the name of funding, is but swindling futurity on a large scale.'] },
    { place: 'Monticello', date: 'July 12, 1816', to: 'To Samuel Kercheval',
      text: ['I am certainly not an advocate for frequent and untried changes in laws and constitutions. ... But I know also, that laws and institutions must go hand in hand with the progress of the human mind. ... We might as well require a man to wear still the coat which fitted him when a boy, as civilized society to remain ever under the regimen of their barbarous ancestors.'] },
    { place: 'Monticello', date: 'August 1, 1816', to: 'To John Adams',
      text: ['I like the dreams of the future better than the history of the past.'] },
    { place: 'Poplar Forest', date: 'September 6, 1819', to: 'To Spencer Roane',
      text: ['The Constitution, on this hypothesis, is a mere thing of wax in the hands of the judiciary, which they may twist, and shape into any form they please.'] },
    { place: 'Monticello', date: 'September 28, 1820', to: 'To William Charles Jarvis',
      text: ['. . . the ultimate arbiters of all constitutional questions; a very dangerous doctrine indeed, and one which would place us under the despotism of an oligarchy. Our judges are as honest as other men, and not more so.'] },
    { place: 'Monticello', date: 'February 21, 1825', to: 'To Thomas Jefferson Smith',
      text: ['A Decalogue of Canons for observation in practical life.', '1. Never put off till tomorrow what you can do to-day.', '2. Never trouble another for what you can do yourself.', '3. Never spend your money before you have it.', '. . .', '10. When angry, count ten, before you speak; if very angry, an hundred.'] },
    { place: 'Monticello', date: 'June 24, 1826', to: 'To Roger C. Weightman',
      text: ['The general spread of the light of science has already laid open to every view the palpable truth, that the mass of mankind has not been born with saddles on their backs, nor a favored few booted and spurred, ready to ride them legitimately, by the grace of God.'] },
    { place: '', date: '1776', to: 'From the Declaration of Independence',
      text: ['We hold these truths to be self-evident, that all men are created equal, that they are endowed by their Creator with certain unalienable Rights, that among these are Life, Liberty and the pursuit of Happiness.'] },
    { place: '', date: '1785', to: 'From Notes on the State of Virginia, Query XVII',
      text: ['The legitimate powers of government extend to such acts only as are injurious to others. But it does me no injury for my neighbor to say there are twenty gods, or no god. It neither picks my pocket nor breaks my leg.'] }
  ];
  var jbag = [], jlast = -1;
  function nextQuote() {
    if (!jbag.length) {
      var i, j, t;
      for (i = 0; i < JQ.length; i += 1) { jbag.push(i); }
      for (i = jbag.length - 1; i > 0; i -= 1) { j = Math.floor(Math.random() * (i + 1)); t = jbag[i]; jbag[i] = jbag[j]; jbag[j] = t; }
      if (jbag[jbag.length - 1] === jlast && jbag.length > 1) { t = jbag[0]; jbag[0] = jbag[jbag.length - 1]; jbag[jbag.length - 1] = t; }
    }
    jlast = jbag.pop();
    return JQ[jlast];
  }

  /* Jefferson's signature (public domain, Wikimedia Commons): outline plus traced pen path */
  var SIG_D = 'M66.22,59.077c-6.01,2.462-16.241,5.708-21.208-0.033c-8.285-9.578,16.086-20.258,21.454-22.517 c9.893-4.162,20.476-6.964,30.746-10.039c9.52-2.851,19.069-5.615,28.667-8.193c3.074-0.826,6.157-1.629,9.263-2.328 c0.688-0.155,1.421-0.351,2.126-0.403c-1.464,0.109-0.214-1.102-1.077-0.279c-0.469,0.447-0.961,0.87-1.448,1.297 c-7.046,6.199-13.933,12.506-20.44,19.277C97.356,53.489,82.474,73.091,65.699,90.925c-9.152,9.73-18.603,19.192-28.53,28.134 c-8.13,7.323-16.708,14.725-26.403,19.905c-1.319,0.705-5.112,3.072-6.596,1.685c-1.461-1.365,1.227-5.186,1.893-6.215 c6.378-9.852,16.606-17.556,25.712-24.685c33.375-26.133,69.213-48.264,104.921-70.937c14.732-9.354,29.57-18.703,43.633-29.05 c1.78-1.31,7.917-4.75,8.063-7.425c0.149-2.736-7.013,1.716-7.559,2.078c-12.309,8.157-23.94,17.519-35.431,26.777 c-6.65,5.358-12.329,11.776-18.176,17.977c-14.867,15.766-29.534,31.725-44.053,47.812 c-11.834,13.112-24.161,26.126-34.755,40.287c-1,1.337,2.896,0.692,3.562-0.055c9.915-11.118,20.126-21.99,30.588-32.596 c7.728-7.834,15.669-15.421,24.184-22.398c9.771-8.006,19.973-16.32,31.138-22.332c0.62-0.334,1.271-0.669,1.943-0.888 c-0.958,0.312-0.682-0.52-0.865,0.072c-0.213,0.685-0.651,1.318-1.021,1.923c-1.558,2.549-3.364,4.957-5.137,7.357 c-5.339,7.229-10.992,14.233-16.708,21.166c-5.891,7.145-11.914,14.194-18.224,20.974c-2.733,2.936-5.625,5.678-8.513,8.458 c-1.066,1.027-5.569,4.499-4.951,6.488c1.046,3.365,10.586-4.554,11.31-5.225c4.256-3.948,9.172-7.283,13.865-10.677 c18.873-13.646,38.582-26.408,59.232-37.201c10.065-5.261,21.277-11.166,32.66-12.768c0.438-0.062,3.886-0.439,2.995,0.918 c-1.139,1.733-4.45,1.991-6.229,2.102c-13.041,0.817-3.426-19.83,0.089-24.161c4.977-6.133,11.432-11.247,17.522-16.215 c5.915-4.825,12.034-9.416,18.358-13.69c1.28-0.865,11.472-7.77,11.973-5.922c0.575,2.124-1.455,5.348-2.348,7.12 c-2.021,4.01-4.563,7.773-7.098,11.47c-5.737,8.37-12.14,16.328-18.977,23.822c-11.453,12.555-21.41,26.227-31.86,39.616 c-11.895,15.239-24.522,31.922-40.874,42.658c1.03,0.06,2.06,0.119,3.089,0.179c7.802-14.003,25.315-23.15,39.07-31.328 c16.248-9.66,32.334-19.75,47.575-30.945c3.187-2.34,25.038-16.761,19.476-22.716c-2.882-3.085-8.995-0.339-11.924,1.096 c-7.26,3.556-13.547,9.426-19.373,14.909c-12.527,11.787-25.715,25.53-33.503,41.054c-1.757,3.502-4.825,10.133-1.617,13.698 c3.062,3.404,10.08-0.129,13.073-1.687c10.093-5.255,18.341-13.888,26.644-21.495c8.882-8.138,17.768-16.273,26.657-24.404 c13.935-12.746,27.844-25.524,41.874-38.165c0.837-0.753,2.895-2.702,3.207-2.901c-0.907,0.137-1.815,0.273-2.723,0.41 c-0.813-0.444,0.023-1.032-1.022,0.069c-0.702,0.74-1.422,1.464-2.138,2.191c-2.626,2.664-5.276,5.302-7.924,7.943 c-6.441,6.426-12.9,12.834-19.326,19.276c-9.679,9.704-18.367,20.167-26.925,30.87c-9.264,11.586-19.64,23.475-26.534,36.698 c-1.085,2.083-1.853,5.147,1.7,4.104c2.91-0.854,5.325-3.318,7.529-5.275c34.931-31.01,64.152-68.6,101.305-97.151 c-1.102-0.065-2.203-0.13-3.304-0.196c-11.609,13.693-24.415,26.279-36.262,39.757c-14.19,16.146-28.084,32.549-42.351,48.627 c-6.426,7.242-12.915,14.438-19.671,21.375c-4.856,4.986-10.046,9.592-15.929,13.337c-4.254,2.708-10.5,6.2-15.651,4.163 c-7.164-2.834-1.925-15.072,0.197-19.727c3.749-8.22,9.647-15.448,16.208-21.582c19.271-18.014,45.136-24.123,70.436-28.23 c16.973-2.756,33.761-3.166,50.844-1.542c1.061,0.101,4.514-1.71,2.416-1.909c-16.695-1.587-33.071-1.295-49.695,1.115 c-24.417,3.539-49.123,9.167-69.42,23.85c-12.781,9.245-24.746,23.039-27.993,38.883c-1.334,6.508,1.518,11.417,8.296,11.713 c9.043,0.395,18.2-6.327,24.805-11.661c10.316-8.33,19.062-18.995,27.851-28.861c10.116-11.356,20.038-22.884,29.987-34.386 c16.136-18.653,33.554-36.175,49.491-54.974c1.104-1.301-2.743-0.626-3.304-0.196c-13.126,10.087-25.019,21.829-36.85,33.37 c-14.063,13.718-27.826,27.74-41.692,41.656c-8.677,8.708-17.21,18.577-27.224,25.808c-1.483,1.071-0.068-0.509,1.093,0.419 c-0.198-0.158,0.161-1.041,0.214-1.201c0.724-2.222,2.161-4.27,3.402-6.222c4.151-6.53,8.861-12.721,13.547-18.87 c10.146-13.315,20.463-26.977,32.213-38.942c6.979-7.108,14.074-14.104,21.132-21.134c3.16-3.147,6.319-6.295,9.464-9.458 c1.406-1.415,3.359-2.885,4.432-4.591c0.246-0.392,0.176-0.622-0.225-0.84c-0.005-0.002-0.009-0.005-0.014-0.007 c-0.718-0.393-2.094,0.01-2.723,0.409c-3.159,2.007-5.89,5.146-8.645,7.645c-6.863,6.223-13.704,12.47-20.546,18.716 c-17.521,15.997-34.946,32.098-52.512,48.044c-4.639,4.211-9.535,8.242-14.878,11.531c-2.132,1.313-6.504,4.304-8.933,2.188 c-4.048-3.526,2.233-13.759,4.048-16.825c9.372-15.835,23.389-30.31,37.325-42.151c4.049-3.44,10.095-9.249,15.728-9.638 c4.963-0.343,1.419,5.374,0.106,6.985c-9.022,11.074-22.998,19.184-34.764,26.94c-12.999,8.569-26.342,16.572-39.784,24.42 c-10.884,6.355-23.489,15.146-29.813,26.499c-0.607,1.089,2.767,0.391,3.089,0.179c17.622-11.568,31.033-29.396,43.818-45.831 c6.458-8.301,12.727-16.748,19.271-24.981c5.703-7.174,12.185-13.632,18.036-20.681c6.688-8.055,13.238-16.607,18.268-25.819 c0.945-1.731,6.24-10.521,1.297-10.869c-4.634-0.325-9.703,3.445-13.376,5.758c-7.323,4.612-14.255,9.872-20.999,15.285 c-10.693,8.583-28.633,21.713-25.612,37.706c1.288,6.821,9.769,6.35,14.823,4.701c1.085-0.354,7.355-2.875,5.307-4.998 c-2.803-2.905-10.791,0.091-13.752,0.968c-11.069,3.275-21.604,8.558-31.752,13.988c-19.841,10.615-38.783,23.106-57.007,36.283 c-4.646,3.359-9.401,6.711-13.612,10.617c-1.218,1.129-2.564,2.147-3.959,3.046c-1.996,1.286,0.301-0.028,0.143,0.865 c0.098-0.554,0.779-1.203,1.106-1.61c2.82-3.512,6.462-6.376,9.61-9.601c12.684-12.992,24.2-27.357,35.19-41.79 c2.957-3.883,6.836-8.109,8.646-12.719c1.399-3.562-8.288,1.019-8.796,1.304c-19.72,11.086-37.214,27.033-53.13,42.958 c-11.156,11.163-21.963,22.71-32.467,34.489c1.187-0.019,2.375-0.036,3.562-0.055c8.174-10.926,17.539-21.039,26.612-31.212 c12.453-13.965,25.09-27.767,37.811-41.488c8.739-9.426,17.443-18.917,26.5-28.041c8.125-8.185,18.197-14.891,27.375-21.81 c5.088-3.835,10.19-7.963,15.747-11.111c1.215-0.688-1.201-0.85-1.745-0.092c-0.427,0.595-1.011,1.084-1.553,1.567 c-2.117,1.887-4.438,3.558-6.727,5.228c-14.579,10.638-29.95,20.248-45.193,29.894C94.9,62.872,59.041,85.303,25.646,111.729 c-8.344,6.604-17.086,13.896-23.146,22.76c-1.361,1.991-4.686,7.599-0.335,8.395c5.225,0.956,11.189-2.979,15.343-5.559 c9.424-5.852,17.873-13.359,26.024-20.833C61.893,99.656,78.729,81.122,94.958,62.25c7.965-9.261,15.566-18.81,24.039-27.624 c6.326-6.581,13.177-12.518,19.943-18.621c1.919-1.731,1.516-2.617-1.104-2.311c-4.833,0.565-9.681,2.198-14.358,3.463 c-15.693,4.245-31.301,8.887-46.777,13.865c-9.151,2.943-18.147,6.422-26.248,11.673c-4.805,3.114-11.205,8.071-10.519,14.524 c1.241,11.676,21.49,5.749,27.744,3.188C70.193,59.376,67.858,58.406,66.22,59.077L66.22,59.077 M285.115,84.553c14.089-2.976,28.271-7.576,40.981-14.375c7.961-4.259,15.152-10.253,20.037-17.924 c3.766-5.913-3.794-4.235-6.919-2.908c-9.809,4.165-18.505,11.527-26.267,18.683c-9.301,8.573-17.699,18.215-25.167,28.414 c-4.837,6.606-11.247,14.928-12.242,23.321c-0.622,5.243,5.454,3.717,8.399,2.446c6.927-2.988,12.838-8.588,18.331-13.606 c7.153-6.537,13.941-13.483,21.048-20.076c13.267-12.309,26.8-24.391,40.763-35.907c1.9-1.567,3.818-3.115,5.779-4.608 c0.599-0.456,1.208-0.897,1.83-1.32c0.783-0.438,0.282-0.511-1.504-0.22c0.123,0.228-0.507,1.131-0.595,1.283 c-5.096,8.883-14.15,16.523-21.408,23.554c-16.661,16.139-31.509,34.118-45.247,52.778c-0.938,1.273,2.775,0.385,3.261,0.032 c7.223-5.234,13.47-11.695,19.141-18.538c6.088-7.348,13.003-14.067,19.921-20.621c18.159-17.203,38.189-31.142,59.749-43.714 c1.03-0.601,2.08-1.228,3.189-1.673c-2.095,0.842-1.08-0.149-2.416,1.771c-2.83,4.071-6.381,7.725-9.665,11.421 c-8.297,9.337-16.416,18.809-24.398,28.416c-10.355,12.464-21.848,24.521-35.545,33.381c-1.033,0.668-2.336,2.062-2.606,0.555 c-0.191-1.069,0.66-2.332,1.227-3.138c2.439-3.47,6.368-5.965,9.859-8.237c10.545-6.865,22.45-11.175,34.083-15.776 c18.472-7.307,37.485-14.569,54.69-24.597c2.807-1.636,9.29-4.721,9.488-8.634c0.279-5.51-11.252-1.135-13.039-0.331 c-20.884,9.394-37.457,27.8-51.855,45.087c-5.248,6.302-10.906,12.938-14.562,20.344c-1.618,3.28-0.411,5.061,3.128,3.817 c3.182-1.118,6.01-3.885,8.546-5.989c4.917-4.08,9.653-8.379,14.373-12.683c12.539-11.435,24.829-23.141,37.237-34.716 c8.726-8.138,17.35-17.249,27.219-24.034c1.684-1.158-0.489-0.727-0.793,0.001c-0.61,1.466-1.848,2.765-2.826,3.988 c-4.173,5.217-8.682,10.178-13.067,15.216c-14.599,16.771-28.812,33.869-41.838,51.901c-0.922,1.277,2.958,0.324,3.525-0.189 c6.773-6.126,12.98-12.979,19.327-19.532c9.587-9.897,18.791-20.331,29.398-29.167c2.667-2.222,5.487-4.39,8.587-5.977 c0.946-0.484,1.727-0.754,1.327,0.729c-0.388,1.439-1.626,2.643-2.665,3.636c-2.799,2.677-5.68,5.269-8.484,7.941 c-6.551,6.242-13.42,12.704-18.553,20.206c-2.54,3.711-5.482,8.932,0.748,10.108c7.34,1.384,15.851-0.816,22.966-2.403 c11.215-2.502,22.313-5.756,33.029-9.911c2.556-0.991,0.153-1.667-1.387-1.07c-10.619,4.117-21.629,7.345-32.761,9.746 c-3.281,0.708-20.572,5.389-21.864,0.021c-0.646-2.688,2.677-6.571,4.073-8.446c2.925-3.93,6.342-7.506,9.747-11.017 c5.461-5.629,11.624-10.62,16.974-16.337c1.043-1.114,3.598-4.406,1.039-5.301c-3.487-1.22-8.404,2.392-11.002,4.17 c-9.743,6.67-17.834,15.738-25.957,24.197c-6.98,7.268-13.98,14.518-21.066,21.681c-2.302,2.327-4.572,4.72-7.002,6.916 c1.175-0.063,2.351-0.126,3.525-0.189c15.303-21.185,32.35-40.893,49.435-60.634c2.444-2.824,8.124-7.522,8.773-11.479 c0.379-2.311-5.179,0.276-5.948,0.77c-9.468,6.067-17.654,15.024-25.84,22.633c-12.469,11.591-24.801,23.329-37.34,34.843 c-4.994,4.587-10.019,9.146-15.193,13.528c-1.717,1.454-3.466,2.874-5.275,4.211c-0.6,0.443-1.215,0.865-1.845,1.264 c-1.312,0.831,0.864,0.432,0.721-0.382c-0.349-1.976,2.061-5.009,3.007-6.527c2.63-4.22,5.729-8.164,8.816-12.054 c6.894-8.686,14.327-16.985,22.172-24.821c9.248-9.238,20.074-18.556,32.27-23.641c1.687-0.703,7.899-1.999,6.03,1.859 c-1.129,2.33-4.386,3.979-6.465,5.283c-17.204,10.792-37.21,17.883-56.014,25.321c-10.647,4.211-21.369,8.259-31.256,14.116 c-4.885,2.894-13.82,7.51-15.254,13.731c-1.147,4.978,7.22,0.995,8.684,0.095c7.596-4.671,14.314-10.927,20.875-16.917 c13.576-12.398,24.445-27.83,36.59-41.576c3.864-4.373,7.807-8.678,11.517-13.184c0.976-1.185,3.237-3.327,3.164-5.054 c-0.107-2.559-10.044,3.326-10.48,3.587c-9.577,5.742-19.279,11.44-28.371,17.928c-10.217,7.29-19.761,15.548-28.933,24.099 c-6.965,6.492-13.744,13.249-19.986,20.443c-6.049,6.972-12.09,13.821-19.613,19.274c1.087,0.011,2.174,0.021,3.261,0.032 c8.958-12.168,18.395-23.96,28.456-35.235c8.991-10.075,18.92-19.194,28.142-29.041c3.468-3.703,6.951-7.512,9.837-11.696 c0.748-1.084,2.092-3.152-0.223-3.029c-4.261,0.228-8.556,4.979-11.589,7.468c-16.697,13.703-32.787,28.231-48.471,43.077 c-8.916,8.44-17.306,17.774-27.738,24.399c-10.255,6.512-2.56-9.364-0.561-12.907c7.519-13.321,18.033-25.257,28.871-35.957 c5.433-5.364,11.248-10.303,17.521-14.656c3.393-2.353,6.935-4.649,10.747-6.268c2.876-1.221,1.678,1.38,0.855,2.826 c-6.759,11.879-20.55,18.381-32.738,22.998c-7.521,2.849-16.48,5.51-23.79,7.054C284.193,83.267,282.428,85.12,285.115,84.553 L285.115,84.553 M156.85,56.093c1.322,2.84,4.357,3.759,7.281,3.352c0.671-0.093,1.963-0.422,2.234-1.167 c0.275-0.756-1.286-0.615-1.6-0.572c-1.673,0.233-3.375-1.196-4.052-2.648C160.19,53.934,156.439,55.211,156.85,56.093 L156.85,56.093 M168.641,88.138c0.071-0.061,0.145-0.12,0.219-0.178c0.067-0.053,0.135-0.104,0.203-0.154 c0.039-0.028,0.078-0.057,0.117-0.084c0.246-0.175-0.362,0.232-0.104,0.068c0.084-0.054,0.172-0.103,0.26-0.149 c-0.334,0.152-0.418,0.193-0.251,0.122c-0.556,0.234-1.311,0.333-1.88,0.15c-0.129-0.036-0.218-0.114-0.264-0.236 c0.026,0.05,0.026,0.114,0.029,0.168c-0.012-0.191-0.083,0.255-0.111,0.341c-0.251,0.799,1.243,0.728,1.626,0.672 c0.694-0.1,1.971-0.436,2.219-1.224c0.127-0.404,0.275-0.977-0.107-1.296c-0.75-0.626-2.108-0.243-2.914,0.057 c-0.762,0.283-1.476,0.761-2.093,1.287c-0.201,0.172-0.489,0.438-0.406,0.746c0.081,0.301,0.466,0.404,0.725,0.443 C166.792,89.002,167.954,88.724,168.641,88.138L168.641,88.138z';
  var SIG_PEN = [["M67.47 59.36L62.25 61.25 57.75 62.36 52.75 63 47.5 62.56 44.25 61 42.61 59.25 41.5 55.75 41.94 53 44 49.25 49.25 44.56 58.25 39.06 67 35.14 78 31.25 112.75 20.81 132.75 15.33 136.83 15.06 138.19 14.53 137 15.22 135 17.64 126.25 25.5 116.5 35 94.69 59.75 91.97 64.33 80.81 74.67 77 75.83 45.5 97.78 24.75 113.64 12.75 124 8.39 128.75 3.42 135.5 2.14 138.5 2.06 140 2.44 140.94 3.75 141.69 6 141.61 11 139.75 21.5 133.25 31.25 125.58 45.75 112.5 61.75 96.75 78.64 78.5 79.72 76.75 78.89 75.86",431.0,14],["M94 63.42L95 63.75 135 38.47 138.19 37.78 150.25 28.53 186.19 2.97 165.5 17.5 139.25 36.92 136.75 40.75 115.25 63.5 88.94 92.25 87.89 93.75 87 96.25 67 117.5 51.39 135.5 49.31 137.11 51.39 135.5 67 117.5 87.69 95.58 88.36 95.39 89 95.72 90.25 94.94 106 80.92 118 71.33 123.75 67.25 134.75 60.31 138.25 58.72 140.94 58.5 135.42 67 117.58 89.75 104 105.5 90.03 119.75 89.33 120.75 89.39 121.92 86.31 124.19 88.39 122.72 90.97 122.08",517.6,14],["M158.28 56L162.25 58.28 164 58.33 165.47 57.92",7.9,150],["M169.72 86.83L165.53 88.19",4.4,70],["M91.53 121.89L103.25 112.53 127.75 95.44 146.75 83.36 168.25 71.31 177.75 66.56 190.25 61.11 191.25 61.08 193.5 62.78 195.5 63.25 204.03 62.64 205.06 61.5 206.14 59.31 208.42 57.5 225.61 37.75 236.69 23.5 242.06 15.5 246.19 8.25 247.58 4.25 247.69 2.5 247.14 1.42 245.5 1.14 242 2.31 229.5 10.25 220.5 16.83 207 27.64 199.5 34.75 194.69 40.75 191.42 47 190.03 51.25 189.5 55 190.25 60.22",294.2,14],["M192.53 61L197.25 59.28 201.5 58.42 203.75 58.25 205.72 58.81",13.7,14],["M203.14 63.53L202.03 65.75 177.69 97 175.97 100.17 165.75 109.28 163.69 112.75 157.5 118.75 153.25 122.28 150.42 123 144.81 127.89 149.72 123.47 151.53 120 154.5 116.75 162 110.58 162.94 110.25 163.64 110.92",114.5,14],["M177.33 99.53L179.5 99.25 191 92.5 193.97 91.89 195 91.22 200.86 84.97 203.39 80.75 213.75 68.75 227.25 55.75 235.5 48.83 240.75 45.11 245.25 42.92 250 42.03 251.22 42.36 251.97 43.06 252.56 45.25 251.39 48.5 248.61 52.25 241.75 58.61 229.75 67.44 216.75 76.33 203.75 84.47 201.81 84.64",164.9,14],["M194.39 92.53L189.36 103 188.33 106.75 188.19 109.25 188.64 111 189.75 112.44 191.25 113.19 194.25 113.11 198.5 111.58 201.25 111.25 218.5 97.64 221.75 96.83 231.5 92.11 233.61 92.22 235.5 91.22 239.25 87.89 240.5 85.5 247.64 76.5 260.97 61.25 262.75 57.75 290.5 31 298.44 23.97 290.5 31 262.36 58.11 259.75 58.86 222.75 92.5 220.03 95.25 219.89 95.89 220.39 96.61",274.3,14],["M234.19 92.53L233.25 94.75 226.03 104 218.17 115.25 215.06 120.5 214.11 123.97 216.5 123.44 217.75 122.75 224.75 116.75 252 89.75 255.56 85.17 259 83 268 82.14 270.89 80.44 272.56 77.75 288.5 59.75 309.56 37 312 32.75 319.75 25.19 322.44 23.17 319.75 25.19 311.47 33.19 307.75 34.81 296 45.5 261.5 79.75 260.06 82.22",274.9,14],["M254.72 85.08L252.25 85.11 241.5 88.22 239.78 88.36",15.4,14],["M267.39 83.03L266.11 85.25 230.5 125.75 221.25 135.25 214.75 141.08 206.25 147.33 200.5 150.36 195.5 151.86 189.5 151.75 186.5 149.97 184.97 147.5 184.5 144 185.72 137.5 188.06 131.25 191.14 125.5 194.28 120.75 200.03 113.75 200.92 112.03",153.2,14],["M271.53 80.44L272.75 80.75 283 79.22 300 77.86 300.75 78.03 300.97 78.47 300.75 79.36 300 79.86 284.81 83.83 300 79.86 302.75 78.33 305.5 77.44 310.5 77.33 327.25 78.42 329 78.25 330.56 78.67",94.4,14],["M330.97 79.75L311.25 98 303.5 105.75 293 115.11 288.25 118.58 284.25 120.94 281.5 121.83 278.78 121.72 277.89 120.75 277.69 119.75 278.22 115.5 282 107.25 290.03 95.25 300.58 82 301.67 79.06",118.2,14],["M306.56 76.72L307.56 74.75 313.25 69 320.75 62.39 329 56.06 335.5 51.89 340.75 49.36 343 48.92 344.67 49.61 344.03 52.25 341.72 55.75 337.75 60.5 333.75 63.89 326.75 68.58 321 71.69 312.5 75.42 310.94 76.72",93.0,14],["M331.28 79.03L366.25 49.11 367.75 48.22 370.19 47.53 372.19 46 369.33 48.36 369.06 49.14 369.33 49.75 368.86 50.75 363.25 57.75 355 66.25 343.5 77.25 328.67 93.5 313.33 112.25 312.42 114 312.83 114.5 312.72 115.19 305.92 122.28 303.81 123.92 305.92 122.28 311.78 116.22 315.5 114.25 330.5 97.5 339.5 88.5 359.5 70.67 370.25 62.31 386.25 51.42 403.25 41.06 404.75 40.39 407.5 40.03 409.19 38.78 407.75 40.11 406.31 42.5 391.94 59 366.53 89 364.94 91.33 359.03 95.97 357 98.75 351 104.31 342.75 110.94 335 115.86 333 116.17 332.03 115.61 331.94 114 333.19 111.5 335.75 108.58 338 106.81 350.5 99.06 355.5 96.58 357.28 96.69",438.7,14],["M365.78 91.36L368.25 91.06 390.75 82.19 395 81.42 400.19 77.33 402.25 74.64 410 67.89 417.75 62 424.25 57.89 433.25 53.72 438.25 53 440.81 53.92 441.75 53.75 443.5 52.78 450.75 47.11 452.25 46.42 454.25 46.11 455.44 45.31 450.58 52 441.42 62.25 416.14 92.25 410.17 99.75 408.97 103.25 398.36 115.44 396.31 117.06 398.36 115.44 409.19 103.08 410.14 102.39 411.5 102.31 439 74.25 450.5 64.78 453.75 62.61 456.75 61.19 458.22 61.17 458.97 62.25 458.5 64 457.08 66 437.5 85 428.75 95.75 426.92 100 426.89 101.75 427.58 102.94 429.5 104.06 432.5 104.5 436.75 104.5 443.25 103.61 463.75 98.69 484.97 91.86",395.4,14],["M440.47 54.78L440.08 56.25 439 57.64 428.25 66.14 426 69.19 381.25 110.75 369 121.06 366.5 122.33 365.33 122.22 364.86 121 365.39 119 370.06 111.5 378.39 100.75 392.56 84.5 393.86 82.53",151.6,14],["M401.03 77.36L402.75 77.31 424.75 67.08 426.28 67.19",27.5,14]];

  function signHtml(t0, K) {
    var tot = 0, i, run = 0, out = '', gaps = 0;
    SIG_PEN.forEach(function (p) { tot += p[1]; gaps += p[2]; });
    var span = Math.max(1200, 2900 - gaps) * K;
    for (i = 0; i < SIG_PEN.length; i++) {
      var du = Math.max(30 * K, span * SIG_PEN[i][1] / tot);
      out += '<path pathLength="1" d="' + SIG_PEN[i][0] + '" style="transition-duration:' + Math.round(du) + 'ms;transition-delay:' + Math.round(t0 + run) + 'ms"/>';
      run += du + SIG_PEN[i][2] * K;
    }
    return '<svg class="lt-sig" viewBox="0 0 486 154" role="img" aria-label="Th: Jefferson">' +
      '<defs><mask id="sigmask" maskUnits="userSpaceOnUse" x="-10" y="-10" width="506" height="174"><g>' + out + '</g></mask></defs>' +
      '<path class="lt-ink" mask="url(#sigmask)" d="' + SIG_D + '"/></svg>';
  }

  function buildLetter() {
    var q = nextQuote();
    var lw = el('div', 'letterwrap');
    var lt = el('article', 'letter' + (reduce ? ' still' : ''));
    lt.setAttribute('aria-label', 'A passage from Thomas Jefferson');
    var n = 0, i;
    q.text.forEach(function (p) { n += p.split(/\s+/).length; });
    var per = Math.min(70, 3000 / Math.max(1, n)), k = 0;
    var body = q.text.map(function (p) {
      return '<p>' + p.split(/\s+/).map(function (w) {
        var d = Math.round((600 + k * per) * K); k += 1;
        return '<span class="w" style="transition-delay:' + d + 'ms">' + esc(w) + '</span> ';
      }).join('') + '</p>';
    }).join('');
    var tEnd = Math.round((600 + k * per) * K);
    var dateLine = (q.place ? q.place + ', ' : '') + q.date;
    lt.innerHTML =
      '<div class="lt-scroll">' +
        '<div class="lt-date">' + esc(dateLine) + '</div>' +
        '<div class="lt-to">' + esc(q.to) + '</div>' +
        '<div class="lt-body">' + body + '</div>' +
        '<div class="lt-sign">' + signHtml(tEnd + Math.round(250 * K), K) + '</div>' +
      '</div>';
    lw.appendChild(el('div', 'letter-shadow'));
    lw.appendChild(lt);
    mount.innerHTML = '';
    mount.appendChild(lw);
    S.pw = lw; S.paper = null; S.scroller = null;
    return lw;
  }

  function openLetter(v) {
    S.vol = v; S.spread = 0; S.total = 0; S.leaves = []; S.book = null; S.wrap = null;
    var lw = buildLetter();
    stage.classList.add('on', 'dimmed');
    stage.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () { requestAnimationFrame(function () { lw.classList.add('on'); }); });
    later(700, function () {
      S.busy = false;
      ui.top.classList.add('show');
      ui.close.focus({ preventScroll: true });
    });
  }

  function closePaper() {
    S.busy = true;
    var v = S.vol, pw = S.pw;
    ui.top.classList.remove('show');
    var fold = !!(pw && pw.classList.contains('unfolded') && !reduce);
    if (fold) {
      // the sheet folds back together before it falls away: bring the folded-over copies in line with what is on screen
      var live = S.paper;
      pw.classList.remove('opened');
      void pw.offsetWidth;
      (S.flapFronts || []).forEach(function (cl) {
        cl.innerHTML = live.innerHTML;
        $$('[id]', cl).forEach(function (n) { n.removeAttribute('id'); });
        var a = $('.p-scroll', live), b = $('.p-scroll', cl);
        if (a && b) { b.scrollTop = a.scrollTop; }
      });
      void pw.offsetWidth;
      pw.classList.remove('unfolded');
    }
    later(fold ? 1250 : 0, function () {
      if (pw) { pw.classList.remove('on'); }
      later(800, function () {
        stage.classList.remove('dimmed');
        world.classList.remove('pushed');
        viewport.classList.remove('opening');
        later(900, function () { finishClose(v); });
      });
    });
  }

  function finishClose(v) {
    stage.classList.remove('on', 'dimmed');
    stage.setAttribute('aria-hidden', 'true');
    room.removeAttribute('inert');
    mount.innerHTML = '';
    var b = S.btn, nxt = S.next;
    S.open = false; S.busy = false; S.turning = false; S.leaves = []; S.book = null; S.wrap = null; S.dirty = false; S.sp = null;
    S.pw = null; S.paper = null; S.scroller = null;
    if (S.globe) { S.globe.classList.remove('flare', 'hov'); }
    if (S.bust) { S.bust.classList.remove('flare', 'hov'); }
    viewport.classList.remove('opening');
    if (nxt && BY[nxt]) {
      var nb = btnFor(nxt);
      if (nb) { later(150, function () { openVol(nxt, nb); }); return; }
    }
    if (b) b.focus({ preventScroll: true });
  }

  function closeVol() {
    S.queued = null;
    if (!S.open || S.busy || S.turning) return;
    if (S.vol && (S.vol.id === 'news' || S.vol.id === 'jefferson')) { closePaper(); return; }
    // the closing flight is drawn for the upright book, so the sideways one steps back to it first
    if (rmode === 'turn') {
      if (wide) { setMode('open', closeVol); return; }
      rmode = 'open'; syncModes();
    }
    S.busy = true;
    var v = S.vol;
    ui.top.classList.remove('show'); ui.bot.classList.remove('show');
    turnTo(0, { dur: 950 }, function () {
      later(160, function () {
        var dm = bookDims(), L = landRect();
        if (v.hs) {
          var from = shelfRect(v);
          var sp = makeSprite(v, L, true);
          S.sp = sp;
          // Hand-off mirrors the opening: the flat cover fades in over the real book first,
          // then the book (with its leather border) fades away underneath, so nothing pops.
          sp.style.opacity = '0';
          anim(sp, [{ opacity: 0 }, { opacity: 1 }], 200, 'ease');
          later(200, function () {
            S.wrap.style.transition = 'opacity 240ms ease'; S.wrap.style.opacity = '0';
            stage.classList.remove('dimmed');
            world.classList.remove('pushed');
            viewport.classList.remove('opening');
            var lifted = { cx: from.cx, cy: from.cy - 14, w: from.w, h: from.h };
            var mid = { cx: (from.cx + L.cx) / 2, cy: Math.min(from.cy, L.cy) - 30, w: (from.w + L.w) / 2.2, h: (from.h + L.h) / 2.2 };
            anim(sp, [{ transform: tf(L, dm, 0, 1) }, { transform: tf(mid, dm, -2.5, 1), offset: 0.5 }, { transform: tf(lifted, dm, -1.5, 1.07) }], 1000, 'cubic-bezier(.45,.05,.2,1)');
          });
          later(1200, function () {
            sp.classList.remove('lit');
            var lifted = { cx: from.cx, cy: from.cy - 14, w: from.w, h: from.h };
            var settle = anim(sp, [{ transform: tf(lifted, dm, -1.5, 1.07) }, { transform: tf(from, dm, 0, 1) }], 260, 'cubic-bezier(.3,.7,.3,1)');
            // The shelf cover takes over only once the flying cover has fully settled into its slot, however busy the screen is.
            var handed = false;
            function handOff() {
              if (handed) return; handed = true;
              v.hs.style.visibility = ''; v.slot.classList.remove('on');
              if (sp.parentNode) sp.parentNode.removeChild(sp);
              finishClose(v);
            }
            if (settle && settle.finished && settle.finished.then) { settle.finished.then(handOff, handOff); }
            later(900, handOff);   // safety net
          });
        } else {
          S.wrap.classList.remove('landed');
          stage.classList.remove('dimmed');
          world.classList.remove('pushed');
          viewport.classList.remove('opening');
          later(900, function () { finishClose(v); });
        }
      });
    });
  }

  function rebuildOpen() {
    if (!S.open || !S.vol || S.vol.id === 'news' || S.vol.id === 'jefferson') return;
    var oldDual = S.dual, sp = S.spread, pageIdx = sp < 1 ? -1 : (oldDual ? 2 * (sp - 1) : sp - 1);
    var ns = pageIdx < 0 ? 0 : (dual ? Math.floor(pageIdx / 2) + 1 : pageIdx + 1);
    buildBook(S.vol, ns, true);
  }

  // Page by page, upright spread, or turned spread (phones only). The book is rebuilt in place at the same page, with a short fade.
  function syncModes() {
    $$('button', ui.modes).forEach(function (b) {
      var on = b.getAttribute('data-mode') === rmode;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function setMode(m, done) {
    if (!S.open || S.busy || S.turning || !S.vol || S.vol.id === 'news' || S.vol.id === 'jefferson' || W >= 760 || rmode === m) { if (done) done(); return; }
    S.busy = true; S.queued = null;
    function rebuild() {
      rmode = m; syncModes();
      layout(); S.dirty = false;
      rebuildOpen();
      S.busy = false;
      if (S.wrap && S.wrap.animate) { S.wrap.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 * K, easing: 'ease-out' }); }
      if (done) done();
    }
    var old = S.wrap;
    if (old && old.animate) {
      var a = old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120 * K, easing: 'ease-in', fill: 'forwards' });
      a.onfinish = rebuild;
    } else { rebuild(); }
  }
  $$('button', ui.modes).forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); }); });
  syncModes();

  /* ==================================================================
     Events
     ================================================================== */
  ui.close.addEventListener('click', closeVol);
  stage.addEventListener('click', function (e) {
    if (!S.open) { return; }
    var t = e.target;
    if (t === stage || t === mount || t.id === 'dim') {
      // a thumb that just misses a button must not close the book: ignore taps within a finger's width of any control
      var m = 30, hit = $$('.ui button').some(function (b) {
        if (b.hidden || b.offsetParent === null) return false;
        var r = b.getBoundingClientRect();
        return e.clientX >= r.left - m && e.clientX <= r.right + m && e.clientY >= r.top - m && e.clientY <= r.bottom + m;
      });
      if (!hit) closeVol();
    }
  });
  ui.prev.addEventListener('click', function () { step(-1); });
  ui.next.addEventListener('click', function () { step(1); });
  doc.addEventListener('keydown', function (e) {
    if (!S.open) return;
    if (e.key === 'Escape') { closeVol(); }
    else if (e.key === 'ArrowRight') { step(1); }
    else if (e.key === 'ArrowLeft') { step(-1); }
  });
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(layout, 120); });

  buildScene();
  layout();
  if (doc.fonts && doc.fonts.ready) { doc.fonts.ready.then(layout); }
})();
