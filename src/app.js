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
    l: { img: 'library.jpg', w: 1672, h: 941, rect: {
      about:      [474, 313, 173, 209],
      experience: [671, 313, 173, 209],
      writing:    [866, 313, 169, 209],
      research:   [1055, 313, 174, 209],
      contact:    [1250, 313, 172, 209]
    }, globe: [1234, 105, 156, 184], bust: [548, 112, 126, 178], desk: [711, 850, 302, 70] },
    p: { img: 'library-m.jpg', w: 941, h: 1672, rect: {
      about:      [105, 539, 146, 241],
      experience: [265, 539, 144, 241],
      writing:    [426, 539, 146, 241],
      research:   [586, 539, 144, 241],
      contact:    [746, 539, 146, 241]
    }, globe: [718, 320, 162, 190], bust: [250, 332, 126, 178], desk: [281, 1348, 385, 80] }
  };
  var IW = 1672, IH = 941;
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
             close: $('#btn-close'), prev: $('#btn-prev'), next: $('#btn-next') };

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
        hs.classList.add('hov');
      };
      var off = function () { hs.classList.remove('hov'); };
      b.addEventListener('click', function () { openVol(v.id, b); });
      b.addEventListener('mouseenter', on); b.addEventListener('focus', on);
      b.addEventListener('mouseleave', off); b.addEventListener('blur', off);
      v.nav.addEventListener('mouseenter', on); v.nav.addEventListener('mouseleave', off);
      world.appendChild(slot); world.appendChild(hs); world.appendChild(b);
      v.slot = slot; v.hs = hs; v.hot = b;
    });

    var rl = el('a', 'nv nv-resume', 'R&eacute;sum&eacute;');
    rl.href = 'resume.pdf'; rl.target = '_blank'; rl.rel = 'noopener';
    nav.appendChild(rl);

    var gb = el('button', 'hot-globe', '<span class="vh">Open the Legal Wire newspaper</span>');
    gb.type = 'button'; gb.setAttribute('data-id', 'news');
    var gc = el('div', 'globe-cap', '<span>Legal Wire</span>');
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
  var sc = { s: 1, ox: 0, oy: 0 };

  function fitHero(fs, availW) {
    hero.style.fontSize = fs + 'px';
    var w = hero.offsetWidth;
    if (w > availW && availW > 80) { fs = fs * availW / w; hero.style.fontSize = fs + 'px'; }
  }

  function layout() {
    W = window.innerWidth; H = window.innerHeight;
    dual = W >= 760;
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
      hero.style.top = Math.round(Math.max(oy + 538 * s, 0)) + 'px';
      fitHero(Math.max(20, 52 * s), (ox + 680 * s) - left - 16);
      org = [840 * s, 860 * s];
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
    if (S.desk) S.desk.style.fontSize = (PLATES[S.plateKey].desk[2] * s / 15.5) + 'px';
    VOLS.forEach(function (v) { if (v.hs) v.hs.style.fontSize = (v.rect[2] * s / 28) + 'px'; });

    if (S.open && !S.busy) rebuildOpen();
    else if (S.open) S.dirty = true;
  }

  function bookDims() {
    var P, Hh;
    if (dual) {
      P = Math.min(W * 0.455, 560);
      Hh = Math.min(H * 0.76, P * 1.38);
      P = Math.min(P, Hh * 0.8);
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
    sp.style.fontSize = clamp(d.P / 28, 13.5, 19) + 'px';
    fly.appendChild(sp);
    sp.style.transform = tf(from, d, 0, 1);
    return sp;
  }
  function tf(r, d, rot, mul) {
    return 'translate(' + Math.round(r.cx - d.P / 2) + 'px,' + Math.round(r.cy - d.Hh / 2) + 'px) rotate(' + rot + 'deg) scale(' + ((r.w / d.P) * mul) + ',' + ((r.h / d.Hh) * mul) + ')';
  }
  function anim(sp, frames, dur, easing) {
    if (!sp.animate) { sp.style.transform = frames[frames.length - 1].transform; return { onfinish: null, finished: null }; }
    return sp.animate(frames, { duration: Math.max(1, dur * K), easing: easing || 'ease', fill: 'forwards' });
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
    var sc = Math.min(3, Math.max(2, (window.devicePixelRatio || 1) * 1.5)),
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
  function whenArtReady(fn) {
    var done = false;
    function go() { if (!done) { done = true; fn(); } }
    if (!S.artReady) { go(); return; }
    S.artReady.then(go, go);
    setTimeout(go, 900 * K);
  }

  function paginate(src, dual, P, Hh, fs) {
    var sh = el('div', 'book ' + (dual ? 'dual' : 'single'));
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
      return e.tagName === 'H3' || e.tagName === 'H4' || (e.classList.contains('orgmark')) ||
        (e.classList.contains('meta') && e.previousElementSibling && e.previousElementSibling.tagName === 'H4');
    }

    var out = [];
    src.forEach(function (page) {
      if (!page) { out.push(page); return; }
      var model = page.cloneNode(true);
      $$('.orgmark', model).forEach(function (f) { var im = f.querySelector('img'); if (!im || IMGOK[im.getAttribute('src')] === false) f.parentNode.removeChild(f); });
      $$('img', model).forEach(function (im) { im.setAttribute('data-src', im.getAttribute('src') || ''); im.removeAttribute('src'); });
      if (model.className.indexOf('title') >= 0) { out.push(model); return; }
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
    BLOBS.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} });
    BLOBS = []; ARTJOBS = []; ARTLIVE = {}; ARTURL = {};
    var d = dual, dm = bookDims(), P = dm.P, Hh = dm.Hh;
    var fs = clamp(P / 28, 13.5, 19);
    var pages = paginate(v.pages, d, P, Hh, fs);
    S.artReady = ARTJOBS.length ? Promise.all(ARTJOBS) : null;
    if (d && pages.length % 2) pages.push(null);
    var n = pages.length;
    var color = THEMES[v.id] || '#5b2229';

    var wrap = el('div', 'bookwrap');
    wrap.style.top = Math.round(H * 0.5 - 4) + 'px';
    var book = el('div', 'book ' + (d ? 'dual' : 'single'));
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
      var dx = e.clientX - sx, dy = e.clientY - sy, ax = Math.abs(dx), ay = Math.abs(dy);
      var flick = ax > 26 && ax / Math.max(1, e.timeStamp - st) > 0.35;
      if ((ax > 44 || flick) && ax > ay * 1.2) { step(dx < 0 ? 1 : -1); }
    });
    book.addEventListener('pointercancel', function () { sid = null; });

    wrap.appendChild(book); mount.appendChild(wrap);

    S.stkL = kl; S.stkR = kr; S.stkT = clamp(P * 0.02, 5, 9);
    S.dual = d; S.leaves = leaves; S.book = book; S.wrap = wrap; S.hotL = hl; S.hotR = hr;
    S.total = d ? n / 2 : n;
    S.spread = startSpread || 0;
    S.vol = v;

    book.classList.add('noanim');
    leaves.forEach(function (l, i) {
      var fl = i < S.spread;
      l.classList.toggle('flipped', fl);
      l.style.zIndex = fl ? i : leaves.length - i;
    });
    book.classList.toggle('open', S.spread > 0);
    book.classList.toggle('seal', S.spread === 0);
    book.classList.toggle('snug', S.spread === 0); tuckSet(book, S.spread === 0 ? 1 : 0, S.spread === 0 ? 1 : 0);
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
  function tuckSet(bk, tk, tl) { bk.style.setProperty('--tk', tk); bk.style.setProperty('--tl', tl); }
  function trackTuck(bk, opening, ms) {
    var end = tuckAt(opening ? 180 : 0), kf = [], n = 48, i;
    if (bk.getAnimations) { bk.getAnimations().forEach(function (x) { if (x.__tuck) { x.cancel(); } }); }
    tuckSet(bk, end[0], end[1]);
    if (!bk.animate) { return; }
    for (i = 0; i <= n; i += 1) {
      var t = i / n, a = leafCurve(t), v;
      if (!opening) { a = 1 - a; }
      v = tuckAt(a * 180);
      kf.push({ offset: t, '--tk': v[0].toFixed(4), '--tl': v[1].toFixed(4) });
    }
    var an = bk.animate(kf, { duration: Math.max(1, ms), easing: 'linear', fill: 'forwards' });
    an.__tuck = true;
    an.onfinish = function () { an.cancel(); };
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
    if (cur === 0 && S.book) { S.book.classList.remove('seal'); S.book.classList.remove('snug'); S.book.classList.add('bare'); }
    var dur = (opts && opts.dur) || (n > 1 ? 560 : 900);
    var stagger = n > 1 ? 130 : 0;
    var list = [], s;
    for (s = cur; s !== target; s += dir) list.push(dir > 0 ? s : s - 1);
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
      } else {
        setTimeout(function () { if (S.book === bk) { bk.classList.add('bare'); } }, (cd + dur * BARE_CLOSE) * K);
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

  function storyHtml(it, lead) {
    var when = fmtDay(it.date), sec = SECLABEL[it.section] || '';
    return '<article class="st' + (lead ? ' lead' : '') + '">' +
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
    body.innerHTML = '<div class="p-lead">' + storyHtml(list[0], true) + '</div>' +
      (rest.length ? '<div class="p-cols">' + rest.map(function (it) { return storyHtml(it, false); }).join('') + '</div>' : '');
    if (S.scroller) { S.scroller.scrollTop = 0; }
  }

  function buildPaper() {
    var ds = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    var pw = el('div', 'paperwrap');
    var paper = el('article', 'paper');
    paper.setAttribute('aria-label', 'The Willis Writ, Legal Wire');
    paper.innerHTML =
      '<div class="p-head"><header class="mast">' +
        '<h2 class="mast-name" aria-label="The Willis Writ">The <span class="kw" aria-hidden="true">W</span><span aria-hidden="true">illis</span> <span class="kw" aria-hidden="true">W</span><span aria-hidden="true">rit</span></h2>' +
        '<div class="mast-date"><span>' + esc(ds) + '</span><span>Legal Wire</span></div>' +
      '</header>' +
      '<nav class="p-tabs" role="tablist" aria-label="Sections"></nav></div>' +
      '<div class="p-scroll">' +
        '<div class="p-body" id="p-body"><p class="p-load">Setting the type</p></div>' +
        '<footer class="p-foot">Headlines and links from public sources. Each story opens at its source.</footer>' +
      '</div>';
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

    loadNews().then(function (d) {
      if (S.paper !== paper) { return; }
      S.newsData = d;
      renderPaperBody(cur);
    });
    return pw;
  }

  function openPaper(v) {
    S.vol = v; S.spread = 0; S.total = 0; S.leaves = []; S.book = null; S.wrap = null;
    var pw = buildPaper();
    stage.classList.add('on', 'dimmed');
    stage.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () { requestAnimationFrame(function () { pw.classList.add('on'); }); });
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
        '<div class="lt-sign"><span class="lt-name" style="transition-delay:' + (tEnd + Math.round(250 * K)) + 'ms">Th: Jefferson</span>' +
          '<svg class="lt-flourish" viewBox="0 0 320 44" aria-hidden="true"><path pathLength="1" style="transition-delay:' + (tEnd + Math.round(900 * K)) + 'ms" d="M6 30 C46 8 92 40 146 24 S226 8 268 28 C282 34 292 24 282 19 C274 15 268 26 286 31 C300 34 312 26 316 20"/></svg>' +
        '</div>' +
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
    var v = S.vol;
    ui.top.classList.remove('show');
    if (S.pw) { S.pw.classList.remove('on'); }
    later(800, function () {
      stage.classList.remove('dimmed');
      world.classList.remove('pushed');
      viewport.classList.remove('opening');
      later(900, function () { finishClose(v); });
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
            anim(sp, [{ transform: tf(lifted, dm, -1.5, 1.07) }, { transform: tf(from, dm, 0, 1) }], 260, 'cubic-bezier(.3,.7,.3,1)');
          });
          later(1490, function () {
            v.hs.style.visibility = ''; v.slot.classList.remove('on');
            if (sp.parentNode) sp.parentNode.removeChild(sp);
            finishClose(v);
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

  /* ==================================================================
     Events
     ================================================================== */
  ui.close.addEventListener('click', closeVol);
  var tapAway = window.matchMedia ? window.matchMedia('(pointer: coarse), (max-width: 759px)') : null;
  stage.addEventListener('click', function (e) {
    if (!tapAway || !tapAway.matches || !S.open) { return; }
    var t = e.target;
    if (t === stage || t === mount || t.id === 'dim' || t.id === 'uitop' || t.id === 'uibot') { closeVol(); }
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
