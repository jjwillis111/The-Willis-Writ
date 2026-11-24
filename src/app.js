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
    }, globe: [1234, 105, 156, 184], bust: [548, 112, 126, 178] },
    p: { img: 'library-m.jpg', w: 941, h: 1672, rect: {
      about:      [105, 539, 146, 241],
      experience: [265, 539, 144, 241],
      writing:    [426, 539, 146, 241],
      research:   [586, 539, 144, 241],
      contact:    [746, 539, 146, 241]
    }, globe: [718, 320, 162, 190], bust: [250, 332, 126, 178] }
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
    face.appendChild(c);
    if (c.className.indexOf('title') < 0) face.appendChild(el('div', 'folio', '&middot; ' + (idx + 1) + ' &middot;'));
    $$('a[data-open]', c).forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); S.next = a.getAttribute('data-open'); closeVol(); });
    });
  }

  function buildBook(v, startSpread, instant) {
    mount.innerHTML = '';
    var d = dual, dm = bookDims(), P = dm.P, Hh = dm.Hh;
    var fs = clamp(P / 28, 13.5, 19);
    var pages = v.pages.slice();
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
  var BARE_OPEN = 0.40, BARE_CLOSE = 0.35;   // fractions of the turn at which the cover is about 100 degrees open
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
        turnTo(1, { dur: 1150 }, function () {
          S.busy = false;
          if (S.dirty) { S.dirty = false; rebuildOpen(); }
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
    paper.setAttribute('aria-label', 'The Willis Writ, The Legal Wire');
    paper.innerHTML =
      '<div class="p-head"><header class="mast">' +
        '<h2 class="mast-name" aria-label="The Willis Writ">The <span class="kw" aria-hidden="true">W</span><span aria-hidden="true">illis</span> <span class="kw" aria-hidden="true">W</span><span aria-hidden="true">rit</span></h2>' +
        '<div class="mast-date"><span>' + esc(ds) + '</span><span>The Legal Wire</span></div>' +
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
