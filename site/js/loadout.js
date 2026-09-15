/* The Fix Energy & Nutrition Lounge — drinks engine. Built 2026-09-15 on The Tower’s LOADOUT engine.
   Five cutout cups, each one cut out of The Fix’s own photographs, drawn over the page, with the
   name BEHIND the cup, particles behind and in front, mouse tilt, idle bob, velocity streaks, code-driven 3D
   swipes between cups, and scroll-driven motion through every section below (pinned horizontal lineup,
   stacking board cards, word/char reveals, counters, sticker bomb, rotating badge, curtain footer).
   Dev contract: ?jump=<scrollY> (Lenis off, force-settled), ?flat (one tall capture), ?jank (console meter),
   ?nolenis ?noblur ?nofx. window.__ready fires when the jumped-to chapter is decoded. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var smooth = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  var Q = new URLSearchParams(location.search);
  var JUMP = Q.get('jump'), FLAT = Q.has('flat'), JANK = Q.has('jank'), NOLENIS = Q.has('nolenis'), NOBLUR = Q.has('noblur'), NOFX = Q.has('nofx');
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STATIC = RM || FLAT;
  var TOUCH = window.matchMedia('(hover: none)').matches;
  /* LITE = phones and small tablets: half-size frames, smaller cup, fewer particles, no swipe blur, load only what is near */
  var LITE = Math.min(window.innerWidth, window.innerHeight) < 820 || (TOUCH && window.innerWidth < 1100);
  var FRAMEDIR = LITE ? 'frames-m/' : 'frames/';
  var CUP = LITE ? 0.70 : 1;          /* fraction of the stage height the cup frame is drawn at */
  var CUPY = LITE ? 0.03 : 0;         /* push the cup down a touch on phones so the top name line clears the lid */
  if (JUMP !== null) { try { history.scrollRestoration = 'manual'; } catch (e) {} }
  document.documentElement.classList.remove('no-js');
  if (FLAT) document.documentElement.classList.add('flat');
  if (RM) document.documentElement.classList.add('rm');

  /* accents sampled from the real cup photos, in lineup order */
  var DRINKS = [
    { id: '01', accent: '#35A7FF' },
    { id: '02', accent: '#FF5A2B' },
    { id: '03', accent: '#FF6E86' },
    { id: '04', accent: '#F0C89A' },
    { id: '05', accent: '#A98BFF' }
  ];
  var N = DRINKS.length;
  var FR = window.FRAMES || {};
  var TURN = 1, SWIPE = 0.62, UNIT = TURN + SWIPE;

  var film = $('#film'), stage = $('#stage'), head = $('#top'), loadbar = $('#loadbar i'), loadwrap = $('#loadbar');
  var rig = $('.rig'), glow = $('.glow'), shadow = $('.shadow');
  var slots = $$('.slot'), titles = $$('.title'), huds = $$('.hud'), dots = $$('.dchip'), chipbox = $('.dchips'), counter = $('#cur');
  var root = document.documentElement;
  var hasGsap = typeof gsap !== 'undefined', hasST = hasGsap && typeof ScrollTrigger !== 'undefined';
  if (hasST) gsap.registerPlugin(ScrollTrigger);

  /* the hero is ONE screen. Drinks are browsed with the arrows, the name buttons or a swipe —
     scrolling carries you down the page instead of through all five cups. */

  /* ---------- frame store + loader ---------- */
  var store = DRINKS.map(function (d) {
    var n = FR[d.id] || 0;
    return { n: n, imgs: new Array(n), loaded: 0, bitmaps: new Map(), decoding: new Set(), center: -999 };
  });
  var queue = [], inflight = 0, MAXF = 8;
  function src(i, f) { return FRAMEDIR + DRINKS[i].id + '/f_' + String(f + 1).padStart(3, '0') + '.webp'; }
  function enqueue(i, front) {
    var st = store[i], items = [];
    for (var f = 0; f < st.n; f++) if (!st.imgs[f]) items.push([i, f]);
    queue = queue.filter(function (q) { return q[0] !== i; });
    queue = front ? items.concat(queue) : queue.concat(items);
    pump();
  }
  /* frames are fetched as encoded Blobs, never HTMLImageElements: an <img> would sit in Chrome's decoded-image cache
     (4.7 MB each, 305 of them) on a box that runs with ~1 GB free. The only decoded pixels are the bitmap window. */
  function pump() {
    while (inflight < MAXF && queue.length) {
      var q = queue.shift(), i = q[0], f = q[1], st = store[i];
      if (st.imgs[f]) continue;
      st.imgs[f] = 'pending'; inflight++;
      (function (i, f) {
        fetch(src(i, f)).then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
          .then(function (b) { store[i].imgs[f] = b; inflight--; store[i].loaded++; onLoaded(i); pump(); })
          .catch(function () { store[i].imgs[f] = null; inflight--; pump(); });
      })(i, f);
    }
  }
  function onLoaded(i) {
    if (i === 0 && loadbar) {
      var pct = store[0].n ? store[0].loaded / store[0].n : 1;
      loadbar.style.width = (pct * 100).toFixed(1) + '%';
      if (pct >= 1) loadwrap.classList.add('done');
    }
  }
  function ready(i) { var st = store[i]; return st.n === 0 || st.loaded >= st.n * 0.9; }

  /* ImageBitmap sliding window, BUDGETED (3 decodes per call, nearest-first) — an un-budgeted window lands as one
     allocation burst = a 150 ms frame. Draws only from decoded bitmaps; never a sync HTMLImageElement decode. */
  var B_AHEAD = LITE ? 6 : 8, B_KEEP = LITE ? 8 : 10, BUDGET = 2;   /* 1084x1080 RGBA bitmaps are 4.7 MB each; this box runs with ~1 GB free */
  /* decode: createImageBitmap(blob) everywhere modern; older Safari gets an <img> from an object URL */
  function decodeBlob(b) {
    if (window.createImageBitmap) return createImageBitmap(b).catch(function () { return decodeImg(b); });
    return decodeImg(b);
  }
  function decodeImg(b) {
    return new Promise(function (res, rej) { var u = URL.createObjectURL(b), im = new Image(); im.onload = function () { URL.revokeObjectURL(u); im.close = function () {}; res(im); }; im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('decode')); }; im.src = u; });
  }
  function ensureBitmaps(i, center) {
    var st = store[i];
    if (!st.n) return;
    st.center = center;
    st.bitmaps.forEach(function (b, k) { if (k < center - B_KEEP || k > center + B_KEEP) { b.close(); st.bitmaps.delete(k); } });
    var budget = BUDGET;
    for (var d = 0; d <= B_AHEAD && budget > 0; d++) {
      var cands = d === 0 ? [center] : [center + d, center - d];
      for (var c = 0; c < cands.length && budget > 0; c++) {
        var f = cands[c];
        if (f < 0 || f >= st.n || st.bitmaps.has(f) || st.decoding.has(f)) continue;
        var im = st.imgs[f]; if (!im || im === 'pending') continue;
        st.decoding.add(f); budget--;
        (function (f) {
          decodeBlob(im).then(function (b) {
            st.decoding.delete(f);
            if (Math.abs(f - st.center) > B_KEEP) { b.close(); return; }
            st.bitmaps.set(f, b);
            if (f === Math.round(lastFrame[i]) && slots[i].classList.contains('is-vis')) draw(i, lastFrame[i], true);
          }).catch(function () { st.decoding.delete(f); });
        })(f);
      }
    }
  }
  /* a drink that is neither active nor incoming holds NO decoded bitmaps — five windows of 1280x720 RGBA would be ~800 MB and the GC stalls for a second at a time */
  function release(i) { var st = store[i]; if (!st.bitmaps.size) return; st.bitmaps.forEach(function (b) { b.close(); }); st.bitmaps.clear(); st.center = -999; drawn[i] = -1; }
  function nearest(st, idx) {
    for (var d = 1; d <= 30; d++) { var a = st.bitmaps.get(idx - d); if (a) return a; var b = st.bitmaps.get(idx + d); if (b) return b; }
    return null;
  }

  /* ---------- canvases (alpha) ---------- */
  var DPR = Math.min(LITE ? 1.25 : 1.5, window.devicePixelRatio || 1), FXDPR = Math.min(LITE ? 1 : 1.25, window.devicePixelRatio || 1);
  var lastFrame = [], drawn = [];
  slots.forEach(function (sl, i) {
    var cv = $('canvas', sl);            /* real-photo stills carry no canvas; the frame engine below no-ops */
    sl._cv = cv; sl._ctx = cv ? cv.getContext('2d', { alpha: true, desynchronized: true }) : null;
    lastFrame[i] = 0; drawn[i] = -1;
  });
  function size() {
    var w = Math.round(window.innerWidth * DPR), h = Math.round(stage.clientHeight * DPR);
    slots.forEach(function (sl, i) { if (!sl._cv) return; if (sl._cv.width !== w || sl._cv.height !== h) { sl._cv.width = w; sl._cv.height = h; drawn[i] = -1; } });
    fxSize();
  }
  function draw(i, f, force) {
    var st = store[i], sl = slots[i];
    if (!st.n || !sl._cv) return false;
    var idx = clamp(Math.round(f), 0, st.n - 1);
    if (!force && drawn[i] === idx) return true;
    var img = st.bitmaps.get(idx) || nearest(st, idx);
    if (!img) return false;
    var cv = sl._cv, ctx = sl._ctx, iw = img.width, ih = img.height, cw = cv.width, ch = cv.height;
    var sc = ch / ih * CUP, dw = iw * sc, dh = ih * sc;   /* native-res centre crops: fit by HEIGHT (x CUP on phones), centred; the void is transparent */
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2 + ch * CUPY, dw, dh);
    drawn[i] = idx;
    if (!sl.classList.contains('is-live')) sl.classList.add('is-live');
    return true;
  }

  /* ---------- motion state: tilt, bob, velocity ---------- */
  var mx = 0, my = 0, tx = 0, ty = 0, vel = 0, velT = 0, lastY = window.scrollY, bob = 0, clock = 0;
  if (!STATIC && !TOUCH) {
    window.addEventListener('mousemove', function (e) { tx = (e.clientX / window.innerWidth) * 2 - 1; ty = (e.clientY / window.innerHeight) * 2 - 1; }, { passive: true });
    window.addEventListener('mouseleave', function () { tx = 0; ty = 0; });
  }

  /* ---------- transforms ---------- */
  function slotXf(sl, e, dir, bobPx) {
    /* e: 0 = at rest, 1 = fully off-stage; dir: -1 out to the left, +1 in from the right */
    var rest = 1 - e;
    var x = dir * e * 62, ry = LITE ? 0 : dir * e * 55, rz = (LITE ? 0 : dir * e * -9) + (sl._sway || 0) * rest;
    var s = (1 - 0.26 * e) * (sl._zoom || 1);
    bobPx = (bobPx || 0) + (sl._drift || 0) * rest;
    sl.style.transform = 'translate3d(' + x + 'vw,' + bobPx.toFixed(1) + 'px,0) rotateY(' + ry + 'deg) rotateZ(' + rz.toFixed(2) + 'deg) scale(' + s.toFixed(3) + ')';
    sl.style.opacity = String(1 - e);
    sl.style.filter = (!NOBLUR && !LITE && e > 0.02) ? 'blur(' + (e * 4).toFixed(1) + 'px)' : '';
  }
  function textOut(el, s, dx, dy) { var e = smooth(s * 2); el.style.transform = 'translate3d(' + (-dx * e) + 'px,' + (dy * e) + 'px,0)'; el.style.opacity = String(1 - e); }
  function textIn(el, s, dx, dy) { var e = 1 - smooth((s - 0.5) * 2); el.style.transform = 'translate3d(' + (dx * e) + 'px,' + (dy * e) + 'px,0)'; el.style.opacity = String(1 - e); }
  function textRest(el) { el.style.transform = ''; el.style.opacity = ''; }

  /* ---------- chapter bookkeeping ---------- */
  var cur = -1, curVis = 0, accentTween = null;
  var fromIdx = -1, navDir = 1, trT = 1, TRDUR = 620;   /* trT: 0 = switch just started, 1 = settled */
  function setVisual(k) {
    if (k === curVis && cur !== -1) return;
    curVis = k; cur = k;
    counter.textContent = DRINKS[k].id;
    dots.forEach(function (d, j) { d.classList.toggle('is-on', j === k); d.setAttribute('aria-selected', j === k ? 'true' : 'false'); });
    /* keep the active name in view inside its own scroller — on a phone only about two chips fit.
       scrollTo on the container (not scrollIntoView) so the PAGE never moves. */
    if (chipbox && dots[k]) {
      /* measure from rects, not offsetLeft: .dchips is not positioned, so offsetLeft is relative to
         .selector and includes the prev arrow — which overshot and pushed long names back out of view. */
      var ce = dots[k], cr = chipbox.getBoundingClientRect(), er = ce.getBoundingClientRect();
      var want = chipbox.scrollLeft + (er.left - cr.left) - (cr.width - er.width) / 2;
      try { chipbox.scrollTo({ left: want, behavior: STATIC ? 'auto' : 'smooth' }); } catch (e) { chipbox.scrollLeft = want; }
    }
    if (hasGsap) {
      if (accentTween) accentTween.kill();
      if (LITE) root.style.setProperty('--accent', DRINKS[k].accent);   /* a tween on a :root var restyles the whole page every frame — too much for a phone */
      else accentTween = gsap.to(root, { '--accent': DRINKS[k].accent, duration: 0.55, ease: 'power2.out' });
      var bars = $$('.bar i', huds[k]);
      gsap.killTweensOf(bars);
      gsap.fromTo(bars, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'steps(5)', stagger: 0.07 });
    } else root.style.setProperty('--accent', DRINKS[k].accent);
    fxTint(DRINKS[k].accent);
    enqueue(k, true); if (k + 1 < N) enqueue(k + 1, false);
  }

  /* ---------- the render ---------- */
  var settled = false, scrolledOnce = false, stageVisible = true;
  function progress() {
    var r = film.getBoundingClientRect(), H = stage.clientHeight;
    stageVisible = r.bottom > 0;
    return clamp(-r.top / Math.max(1, r.height - H), 0, 1);
  }
  function render(dt) {
    clock += dt || 16;
    if (trT < 1) trT = Math.min(1, trT + (dt || 16) / TRDUR);
    var t = smooth(trT), moving = trT < 1;

    /* ambient: tilt toward the cursor, idle bob */
    mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
    bob = STATIC ? 0 : Math.sin(clock / 1000 * 1.35) * 8;
    if (!STATIC) {
      rig.style.transform = 'rotateX(' + (-my * 4).toFixed(2) + 'deg) rotateY(' + (mx * 7).toFixed(2) + 'deg)';
      glow.style.transform = 'translate3d(' + (mx * 26).toFixed(1) + 'px,' + (my * 18 + bob * 0.6).toFixed(1) + 'px,0)';
      var sh = 1 - bob / 90;
      shadow.style.transform = 'translate(-50%, 42vh) scale(' + sh.toFixed(3) + ',' + sh.toFixed(3) + ')';
      shadow.style.opacity = String(0.42 - (bob + 8) / 16 * 0.16);
    }

    for (var k = 0; k < N; k++) {
      var sl = slots[k], ti = titles[k], h = huds[k], on = false;
      if (k === curVis) {
        on = true;
        /* the resting cup breathes on the clock now, not on scroll position */
        var ph = clock / 1000;
        sl._sway = STATIC ? 0 : Math.sin(ph * 0.55) * 3.2;
        sl._drift = STATIC ? 0 : Math.sin(ph * 0.42 + 1.1) * 10;
        sl._zoom = STATIC ? 1 : 1 + Math.sin(ph * 0.33) * 0.012;
        slotXf(sl, moving ? 1 - t : 0, navDir, bob);
        if (moving) { textIn(ti, trT, 140 * navDir, 30); textIn(h, trT, 0, 30); }
        else { textRest(ti); textRest(h); }
        ti.style.transform = (ti.style.transform || '') + ' translate3d(' + (-mx * 18).toFixed(1) + 'px,' + (-my * 10).toFixed(1) + 'px,0) skewY(' + (-vel * 5).toFixed(2) + 'deg)';
      } else if (moving && k === fromIdx) {
        on = true;
        slotXf(sl, t, -navDir, bob);
        textOut(ti, trT, 140 * navDir, 30); textOut(h, trT, 0, 30);
      }
      if (on !== sl.classList.contains('is-vis')) { sl.classList.toggle('is-vis', on); ti.classList.toggle('is-vis', on); h.classList.toggle('is-vis', on); }
      if (!on) { sl.style.transform = ''; sl.style.opacity = ''; sl.style.filter = ''; textRest(ti); textRest(h); release(k); }
    }
  }
  var lastT = 0, tickN = 0;
  function tick(time) {
    var now = performance.now(), dt = lastT ? Math.min(50, now - lastT) : 16; lastT = now;
    var y = window.scrollY; velT = clamp((y - lastY) / Math.max(1, window.innerHeight) * 12, -1, 1); lastY = y;
    vel += (velT - vel) * 0.12;
    progress();                                  /* still needed: keeps stageVisible honest */
    if (stageVisible) { render(dt); fxTick(dt); }
    if ((++tickN & 3) === 0 || !stageVisible) headTheme();
    tickerSkew();
  }

  /* the fixed header takes the theme of whichever section is under it */
  var themed = $$('[data-theme]');
  function headTheme() {
    var y = 40, light = false;
    for (var k = 0; k < themed.length; k++) {
      var r = themed[k].getBoundingClientRect();
      if (r.top <= y && r.bottom > y) { light = themed[k].getAttribute('data-theme') === 'light'; break; }
    }
    head.classList.toggle('on-light', light);
  }

  /* ---------- particles (two canvases: behind the cup, in front) ---------- */
  var fxB = $('.fx-back'), fxF = $('.fx-front'), fxOn = !STATIC && !NOFX && fxB && fxF;
  if (LITE && fxF) { fxF.style.display = 'none'; }
  var pb = [], pf = [], spriteB, spriteF, fxW = 0, fxH = 0, ctxB, ctxF, tint = DRINKS[0].accent;
  function sprite(size, color, soft) {
    var c = document.createElement('canvas'); c.width = c.height = size;
    var g = c.getContext('2d'), r = size / 2, gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(soft ? 0.25 : 0.55, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
  }
  function hexA(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function fxTint(accent) { tint = accent; if (!fxOn) return; spriteB = sprite(32, hexA(accent, 0.9), false); spriteF = sprite(96, hexA(accent, 0.55), true); }
  function fxSize() {
    if (!fxOn) return;
    fxW = Math.round(window.innerWidth * FXDPR); fxH = Math.round(stage.clientHeight * FXDPR);
    [fxB, fxF].forEach(function (c) { c.width = fxW; c.height = fxH; });
    ctxB = fxB.getContext('2d'); ctxF = fxF.getContext('2d');
    if (!pb.length) {
      for (var i = 0; i < (LITE ? 24 : 70); i++) pb.push({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2.2, vy: 0.00025 + Math.random() * 0.0006, ph: Math.random() * 6.28, a: 0.25 + Math.random() * 0.55, d: 0.2 + Math.random() * 0.6 });
      for (var j = 0; j < (LITE ? 4 : 8); j++) pf.push({ x: Math.random(), y: Math.random(), r: 14 + Math.random() * 30, vy: 0.0006 + Math.random() * 0.0009, ph: Math.random() * 6.28, a: 0.10 + Math.random() * 0.18, d: 0.8 + Math.random() * 0.7 });
    }
  }
  var fxScroll = 0;
  function fxTick(dt) {
    if (!fxOn || !ctxB) return;
    var k = dt / 16, sp = 1 + Math.abs(vel) * 8, streak = 1 + Math.min(3.5, Math.abs(vel) * 22);
    var dy = (window.scrollY - fxScroll) / Math.max(1, stage.clientHeight); fxScroll = window.scrollY;
    var stageAlpha = parseFloat(stage.style.opacity || '1');
    ctxB.clearRect(0, 0, fxW, fxH); ctxF.clearRect(0, 0, fxW, fxH);
    ctxB.globalCompositeOperation = 'lighter'; ctxF.globalCompositeOperation = 'lighter';
    var t = clock / 1000;
    function run(ctx, list, spr, big) {
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        p.y -= p.vy * k * sp + dy * p.d * 0.9; p.x += Math.sin(t * 0.6 + p.ph) * 0.00035 * k;
        if (p.y < -0.08) { p.y = 1.08; p.x = Math.random(); } if (p.y > 1.08) { p.y = -0.08; p.x = Math.random(); }
        if (p.x < -0.05) p.x = 1.05; if (p.x > 1.05) p.x = -0.05;
        var tw = big ? 1 : 0.6 + 0.4 * Math.sin(t * 2.2 + p.ph);
        var r = p.r * FXDPR, hgt = r * 2 * streak;
        ctx.globalAlpha = p.a * tw * stageAlpha;
        ctx.drawImage(spr, p.x * fxW - r, p.y * fxH - hgt / 2, r * 2, hgt);
      }
    }
    run(ctxB, pb, spriteB, false); if (!LITE) run(ctxF, pf, spriteF, true);
    ctxB.globalAlpha = 1; ctxF.globalAlpha = 1;
  }

  /* ---------- tickers: skew with velocity ---------- */
  var skews = $$('.ticker-skew');
  function tickerSkew() { if (STATIC) return; var sk = (-vel * 14).toFixed(2); for (var i = 0; i < skews.length; i++) skews[i].style.transform = 'skewX(' + sk + 'deg)'; }

  /* ---------- static / reduced-motion path ---------- */
  function renderStatic() {
    if (cur === -1) setVisual(0);
    for (var k = 0; k < N; k++) {
      var on = k === curVis;
      slots[k].classList.toggle('is-vis', on); titles[k].classList.toggle('is-vis', on); huds[k].classList.toggle('is-vis', on);
    }
    headTheme();
  }

  /* ---------- selector ---------- */
  var lenis = null;
  function switchTo(k, dir) {
    k = clamp(k, 0, N - 1);
    if (k === curVis) return;
    navDir = dir || (k > curVis ? 1 : -1);
    fromIdx = curVis; trT = 0;
    setVisual(k);
    if (!scrolledOnce) { scrolledOnce = true; stage.classList.add('scrolled'); }
  }
  function goTo(k) { switchTo(k); }

  /* swipe the stage left/right to change drink; vertical intent is left alone so the page still scrolls */
  (function () {
    if (STATIC) return;
    var sx = 0, sy = 0, live = false, axis = '';
    stage.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; live = true; axis = '';
    }, { passive: true });
    stage.addEventListener('touchmove', function (e) {
      if (!live) return;
      var dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
      if (!axis && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (axis === 'x' && Math.abs(dx) > 56) { step(dx < 0 ? 1 : -1); live = false; }
    }, { passive: true });
    stage.addEventListener('touchend', function () { live = false; }, { passive: true });
    /* trackpad / shift-wheel horizontal flicks on desktop */
    var wlock = 0;
    stage.addEventListener('wheel', function (e) {
      var dx = e.shiftKey ? e.deltaY : e.deltaX;
      if (Math.abs(dx) < 24 || Math.abs(dx) < Math.abs(e.deltaY) * (e.shiftKey ? 0 : 1.2)) return;
      var now = performance.now(); if (now - wlock < 700) return; wlock = now;
      step(dx > 0 ? 1 : -1);
    }, { passive: true });
  })();

  /* the photo strips are native horizontal scrollers: drag with a pointer, swipe on touch */
  $$('.strip').forEach(function (st, si) {
    var down = false, px = 0, pl = 0, moved = 0;
    st.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;            /* let the browser do native touch scrolling */
      down = true; moved = 0; px = e.clientX; pl = st.scrollLeft; st.classList.add('is-drag');
      try { st.setPointerCapture(e.pointerId); } catch (err) {}
    });
    st.addEventListener('pointermove', function (e) {
      if (!down) return;
      var d = e.clientX - px; moved = Math.max(moved, Math.abs(d));
      st.scrollLeft = pl - d; e.preventDefault();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      st.addEventListener(ev, function () { down = false; st.classList.remove('is-drag'); });
    });
    st.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    st.setAttribute('tabindex', '0');
    st.setAttribute('role', 'region');
    st.setAttribute('aria-label', 'Photos from The Tower, row ' + (si + 1) + ' of 2, scroll sideways');
  });
  /* the ends wrap, so neither arrow is ever a dead control */
  function step(d) { switchTo((curVis + d + N) % N, d); }
  $('.arrow.prev').addEventListener('click', function () { step(-1); });
  $('.arrow.next').addEventListener('click', function () { step(1); });
  $$('[data-go]').forEach(function (el) { el.addEventListener('click', function (e) { e.preventDefault(); goTo(+el.getAttribute('data-go')); }); });
  window.addEventListener('keydown', function (e) {
    var r = film.getBoundingClientRect(); if (r.top > 0 || r.bottom < stage.clientHeight) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });
  $$('.nav a, .lockup').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href'); if (!id || id.charAt(0) !== '#') return;
      var el = $(id); if (!el) return; e.preventDefault();
      scrollToY(id === '#film' ? 0 : el.getBoundingClientRect().top + window.scrollY, 1.3);
    });
  });

  /* ---------- text splitting ---------- */
  function splitWords(el) {
    var words = el.textContent.trim().split(/\s+/); el.textContent = '';
    words.forEach(function (w, i) { var o = document.createElement('span'); o.className = 'w'; var s = document.createElement('span'); s.textContent = w; o.appendChild(s); el.appendChild(o); if (i < words.length - 1) el.appendChild(document.createTextNode(' ')); });
  }
  /* chars, but grouped into words: bare inline-block chars let the browser break a line mid-word,
     which orphaned the "E." of "AVE." on narrow screens. Each word is one unbreakable inline-block. */
  function splitChars(el) {
    var words = el.textContent.trim().split(/\s+/); el.textContent = '';
    words.forEach(function (w, wi) {
      var wrap = document.createElement('span'); wrap.className = 'cw';
      for (var i = 0; i < w.length; i++) { var s = document.createElement('span'); s.className = 'c'; s.textContent = w[i]; wrap.appendChild(s); }
      el.appendChild(wrap);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }
  $$('[data-words]').forEach(splitWords);
  $$('[data-chars]').forEach(splitChars);

  /* ---------- sticker bomb (story) ---------- */
  var bomb = $('.bomb');
  function stickerSVG(l1, l2, bg, fg) {
    var id = 'bp' + Math.random().toString(36).slice(2, 7);
    return '<svg class="sticker" viewBox="0 0 160 160" style="--sc:' + bg + ';--st:' + fg + '"><defs><path id="' + id + '" d="M80 80m-62 0a62 62 0 1 1 124 0a62 62 0 1 1-124 0"/></defs><circle cx="80" cy="80" r="76"/><g class="rim"><text textLength="386" lengthAdjust="spacing"><textPath href="#' + id + '">THE FIX · 2100 W LINDSEY · NORMAN, OK ·</textPath></text></g>' +
      (l2 ? '<text class="slogan sm" x="80" y="74">' + l1 + '</text><text class="slogan sm" x="80" y="104">' + l2 + '</text>' : '<text class="slogan" x="80" y="92">' + l1 + '</text>') + '</svg>';
  }
  if (bomb) {
    var B = [
      ['4.4 ★', 'GOOGLE', '#2BB3F3', '#04121B', 6, 12, 1.1, -14],
      ['FIX', 'FAM', '#fff', '#111', 78, 4, 0.7, 10],
      ['DAILY', 'FIX', '#F6E24B', '#111', 44, 14, 1.4, -6],
      ['CAFFEINE', 'DEALER', '#FF5FA2', '#111', 2, 62, 0.9, 8],
      ['THE', 'OG', '#7ED957', '#111', 62, 82, 1.2, -18],
      ['SEVEN', 'DAYS', '#FF5A2B', '#111', 30, 90, 0.6, 14]
    ];
    bomb.innerHTML = B.map(function (b) { return '<div class="bomb-it" style="position:absolute;left:' + b[4] + '%;top:' + b[5] + '%" data-speed="' + b[6] + '" data-rot="' + b[7] + '">' + stickerSVG(b[0], b[1], b[2], b[3]) + '</div>'; }).join('');
  }

  /* ---------- scroll choreography below the film (pins FIRST, then everything else) ---------- */
  function choreography() {
    if (!hasST || STATIC) return;
    var headH = parseFloat(getComputedStyle(root).getPropertyValue('--head-h')) || 72;

    /* 1. BOARD — stacking cards */
    var fams = $$('.family');
    fams.forEach(function (f, i) {
      var next = fams[i + 1];
      if (next) gsap.to(f, { scale: 0.92, y: -18, '--dim': 0.55, ease: 'none', scrollTrigger: { trigger: next, start: 'top bottom', end: 'top ' + headH, scrub: true } });
      gsap.fromTo($('.fam-n', f), { y: 120, rotation: 4 }, { y: -120, rotation: -4, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.from($$('.fam-copy > *', f), { y: 40, opacity: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: f, start: 'top 70%', once: true } });
    });

    /* 2b. SIT DOWN SIP UP — photo strips slide opposite ways with scroll; polaroid + storefront parallax; chips pop in */
    $$('.strip').forEach(function (st) {
      var dir = +st.getAttribute('data-dir') || -1, row = $('.strip-row', st);
      /* the strip is a real scroller now, so the page-scroll pan writes scrollLeft — and hands over
         permanently the moment someone drags, swipes, wheels or tabs into it. */
      var taken = false;
      ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(function (ev) {
        st.addEventListener(ev, function () { taken = true; }, { passive: true });
      });
      ScrollTrigger.create({ trigger: st, start: 'top bottom', end: 'bottom top', onUpdate: function (self) {
        if (taken) return;
        var range = Math.max(0, st.scrollWidth - st.clientWidth), p = self.progress;
        st.scrollLeft = dir < 0 ? p * range * 0.85 : range * (1 - p * 0.85);
      } });
      gsap.from($$('img', row), { y: 40, opacity: 0, stagger: 0.05, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: st, start: 'top 90%', once: true } });
    });
    var pol = $('.polaroid');
    if (pol) gsap.fromTo(pol, { y: 60, rotation: 6 }, { y: -60, rotation: 1, ease: 'none', scrollTrigger: { trigger: $('#story'), start: 'top bottom', end: 'bottom top', scrub: 0.5 } });
    var vp = $('.visit-photo img');
    if (vp) gsap.fromTo(vp, { yPercent: -9, scale: 1.08 }, { yPercent: 9, scale: 1, ease: 'none', scrollTrigger: { trigger: $('.visit-photo'), start: 'top bottom', end: 'bottom top', scrub: 0.4 } });
    var chips = $$('.flavor-wall .chip');   /* scoped: the hero's drink buttons are .dchip and must never be hidden by this */
    if (chips.length) gsap.from(chips, { y: 30, opacity: 0, rotation: function (i) { return i % 2 ? 4 : -4; }, stagger: 0.04, duration: 0.7, ease: 'back.out(1.6)', scrollTrigger: { trigger: $('.flavor-wall'), start: 'top 88%', once: true } });

    /* 3. word + char reveals */
    $$('[data-words]').forEach(function (h) {
      gsap.from($$('.w > span', h), { yPercent: 115, duration: 1, stagger: 0.07, ease: 'power4.out', scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
    });
    $$('[data-chars]').forEach(function (h) {
      gsap.from($$('.c', h), { yPercent: -140, opacity: 0, rotation: -10, duration: 0.9, stagger: 0.025, ease: 'back.out(1.6)', scrollTrigger: { trigger: h, start: 'top 85%', once: true } });
    });

    /* 4. counters */
    $$('[data-count]').forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-count')), dec = +(el.getAttribute('data-dec') || 0), suf = el.getAttribute('data-suffix') || '';
      var o = { v: 0 };
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () {
        gsap.to(o, { v: target, duration: 1.8, ease: 'power3.out', onUpdate: function () { el.textContent = o.v.toFixed(dec) + suf; } });
      } });
    });

    /* 5. sticker bomb parallax + quotes */
    var story = $('#story');
    $$('.bomb-it').forEach(function (b) {
      var sp = +b.getAttribute('data-speed'), rot = +b.getAttribute('data-rot');
      gsap.fromTo(b, { y: 160 * sp, rotation: rot }, { y: -160 * sp, rotation: rot + (rot > 0 ? 24 : -24), ease: 'none', scrollTrigger: { trigger: story, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('.quote').forEach(function (q, i) {
      gsap.from(q, { x: i % 2 ? 80 : -80, y: 30, opacity: 0, rotation: i % 2 ? 2 : -2, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: q, start: 'top 88%', once: true } });
    });

    /* 6. hours lines draw, badge spins with scroll, footer curtain word */
    $$('.hours > div').forEach(function (row, i) {
      gsap.fromTo(row, { '--line-s': 0 }, { '--line-s': 1, duration: 0.9, delay: i * 0.08, ease: 'power3.out', scrollTrigger: { trigger: row, start: 'top 90%', once: true } });
      gsap.from($$('dt, dd', row), { y: 16, opacity: 0, duration: 0.7, delay: i * 0.08, ease: 'power3.out', scrollTrigger: { trigger: row, start: 'top 90%', once: true } });
    });
    var ring = $('.badge .ring'), visit = $('#visit');
    if (ring) gsap.to(ring, { rotation: 300, ease: 'none', scrollTrigger: { trigger: visit, start: 'top bottom', end: 'bottom top', scrub: true } });
    var word = $('.foot-word'), spacer = $('.foot-spacer');
    if (word && spacer) gsap.fromTo(word, { yPercent: 45, opacity: 0.2 }, { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: spacer, start: 'top bottom', end: 'bottom bottom', scrub: true } });

    /* 7. generic reveals */
    $$('.reveal').forEach(function (el) {
      gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
  }

  /* curtain footer: the page ends with a spacer the height of the fixed footer */
  var foot = $('.foot');
  function footSize() { if (!foot) return; root.style.setProperty('--foot-h', foot.offsetHeight + 'px'); }

  /* ---------- intro ---------- */
  function intro() {
    if (!hasGsap || STATIC || JUMP !== null) return;
    var t0 = titles[0], tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.from(slots[0], { scale: 0.72, opacity: 0, y: 60, duration: 1.2, ease: 'back.out(1.4)', clearProps: 'transform,opacity' }, 0)
      .from($$('.ln > span', t0), { yPercent: 118, duration: 1, stagger: 0.1 }, 0.1)
      .from(glow, { opacity: 0, scale: 0.6, duration: 1.2, clearProps: 'opacity' }, 0)
      .from($$('.hud-head, .hud-note, .stats > div, .sticker', huds[0]), { y: 22, opacity: 0, duration: 0.7, stagger: 0.06, clearProps: 'all' }, 0.5)
      .from($$('.eyebrow, .selector, .hint'), { y: 12, opacity: 0, duration: 0.7, stagger: 0.08, clearProps: 'all' }, 0.7);
  }

  /* ---------- boot ---------- */
  function boot() {
    size(); footSize(); fxTint(DRINKS[0].accent);
    window.addEventListener('resize', function () { size(); footSize(); if (!STATIC) { slots.forEach(function (s, i) { drawn[i] = -1; }); render(16); } });

    if (STATIC) {
      renderStatic();
      window.addEventListener('scroll', renderStatic, { passive: true });
      finish(0);
      return;
    }
    if (LITE) { enqueue(0, true); enqueue(1, false); } else { for (var q = 0; q < N; q++) enqueue(q, false); }
    ensureBitmaps(0, 0);

    if (hasGsap && !NOLENIS && JUMP === null && typeof Lenis !== 'undefined') {
      lenis = new Lenis({ lerp: 0.11, smoothWheel: true });
      if (hasST) lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
    if (hasGsap) gsap.ticker.add(tick); else (function raf() { tick(); requestAnimationFrame(raf); })();
    choreography();

    var target = 0;
    if (JUMP !== null) {
      window.scrollTo(0, +JUMP || 0);
      target = Math.min(N - 1, Math.floor(progress() * N * UNIT / UNIT));
      enqueue(target, true);
    }
    finish(target);
  }
  function finish(target) {
    var t0 = performance.now();
    (function wait() {
      var ok = STATIC ? true : ready(target) && (target === 0 ? ready(0) : true);
      if (ok || performance.now() - t0 > 30000) {
        if (!ok) console.warn('[loadout] ready timeout — frames still loading');
        if (!STATIC) {
          if (JUMP !== null) { window.scrollTo(0, +JUMP || 0); lastY = window.scrollY; tx = ty = mx = my = 0; }
          settled = true; render(16);
          if (JUMP !== null && hasST) { ScrollTrigger.refresh(); window.scrollTo(0, +JUMP || 0); ScrollTrigger.update(); render(16); }
          intro();
        }
        window.__ready = true;
        return;
      }
      setTimeout(wait, 100);
    })();
  }

  if (JANK) {
    var jl = performance.now(), maxD = 0, deltas = [];
    (function meter() { var now = performance.now(); var d = now - jl; jl = now; deltas.push(d); if (d > maxD) maxD = d; requestAnimationFrame(meter); })();
    setInterval(function () { deltas.sort(function (a, b) { return a - b; }); var p95 = deltas[Math.floor(deltas.length * 0.95)] || 0; console.log('[jank] max ' + maxD.toFixed(1) + 'ms p95 ' + p95.toFixed(1) + 'ms n=' + deltas.length); maxD = 0; deltas = []; }, 2000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
