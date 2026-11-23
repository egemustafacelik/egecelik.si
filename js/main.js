/* egecelik.si · choreography */
(function () {
  'use strict';

  var html = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var O = window.Ocean || {};
  var hasGsap = !!(window.gsap && window.ScrollTrigger);

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  var startHash = location.hash;
  if (!startHash) window.scrollTo(0, 0);

  /* ---------------------------------------------------------------- */
  /* small helpers                                                     */
  /* ---------------------------------------------------------------- */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* terminals: keep their text in data-type, type it in when a stage lights up */
  var terms = $$('.stage__term');
  terms.forEach(function (t) { t.textContent = reduce || !hasGsap ? t.dataset.type : ''; });
  function typeTerm(t) {
    if (t.dataset.done) return;
    t.dataset.done = '1';
    var text = t.dataset.type, i = 0;
    var caret = document.createElement('span');
    caret.className = 'caret';
    var node = document.createTextNode('');
    t.textContent = '';
    t.appendChild(node);
    t.appendChild(caret);
    (function tick() {
      i += 1 + (Math.random() < 0.3 ? 1 : 0);
      node.data = text.slice(0, i);
      if (i < text.length) setTimeout(tick, 18 + Math.random() * 30);
    })();
  }

  /* ---------------------------------------------------------------- */
  /* voyage HUD: great-circle Istanbul to San Francisco               */
  /* ---------------------------------------------------------------- */
  var RAD = Math.PI / 180;
  var A = [41.0082, 28.9784], B = [37.7749, -122.4194];
  function vec(ll) { return [Math.cos(ll[0] * RAD) * Math.cos(ll[1] * RAD), Math.cos(ll[0] * RAD) * Math.sin(ll[1] * RAD), Math.sin(ll[0] * RAD)]; }
  var va = vec(A), vb = vec(B);
  var omega = Math.acos(va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]);
  var TOTAL_NM = Math.round(omega * 3440.065);
  function along(t) {
    var s1 = Math.sin((1 - t) * omega) / Math.sin(omega), s2 = Math.sin(t * omega) / Math.sin(omega);
    var x = s1 * va[0] + s2 * vb[0], y = s1 * va[1] + s2 * vb[1], z = s1 * va[2] + s2 * vb[2];
    return [Math.asin(z) / RAD, Math.atan2(y, x) / RAD];
  }
  var STOPS = [
    [0.03, 'Departing Istanbul'],
    [0.18, 'Over Eastern Europe'],
    [0.27, 'Over Scandinavia'],
    [0.37, 'Over the North Atlantic'],
    [0.52, 'Over Greenland'],
    [0.58, 'Crossing Baffin Bay'],
    [0.82, 'Over Canada'],
    [0.97, 'Over the American West'],
    [0.995, 'Approaching San Francisco'],
    [2, 'Arrived. San Francisco']
  ];
  var hud = $('.hud'), hLat = $('.hud__lat'), hLon = $('.hud__lon'), hNm = $('.hud__nm'), hTx = $('.hud__text'), hHdg = $('.hud__hdg');
  function bearing(from, to) {
    var p1 = from[0] * RAD, p2 = to[0] * RAD, dl = (to[1] - from[1]) * RAD;
    var y = Math.sin(dl) * Math.cos(p2);
    var x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return (Math.atan2(y, x) / RAD + 360) % 360;
  }
  var bar = $('.progress i');
  $('.hud__of').textContent = '/ ' + TOTAL_NM;
  var lastStatus = '';
  function voyage(p) {
    p = clamp(p, 0, 1);
    var ll = along(p);
    hLat.textContent = Math.abs(ll[0]).toFixed(4) + '° ' + (ll[0] >= 0 ? 'N' : 'S');
    hLon.textContent = Math.abs(ll[1]).toFixed(4) + '° ' + (ll[1] >= 0 ? 'E' : 'W');
    hNm.textContent = String(Math.round(p * TOTAL_NM)).padStart(4, '0');
    var hdg = p < 0.999 ? bearing(ll, B) : bearing(along(0.998), B);
    if (hHdg) hHdg.textContent = String(Math.round(hdg) % 360).padStart(3, '0') + '°';
    var s = '';
    for (var i = 0; i < STOPS.length; i++) { if (p < STOPS[i][0]) { s = STOPS[i][1]; break; } }
    if (s !== lastStatus) { hTx.textContent = s; lastStatus = s; }
    if (bar) bar.style.transform = 'scaleY(' + p.toFixed(4) + ')';
  }
  function docProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? window.scrollY / max : 0;
  }

  /* ---------------------------------------------------------------- */
  /* clocks                                                            */
  /* ---------------------------------------------------------------- */
  var clocks = $$('[data-tz]').map(function (el) {
    return { el: el, fmt: new Intl.DateTimeFormat('en-GB', { timeZone: el.dataset.tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) };
  });
  function tickClocks() { var d = new Date(); clocks.forEach(function (c) { c.el.textContent = c.fmt.format(d); }); }
  tickClocks();
  setInterval(tickClocks, 1000);

  /* ---------------------------------------------------------------- */
  /* console note for the curious                                      */
  /* ---------------------------------------------------------------- */
  try {
    console.log('%c♞ egecelik.si', 'font: italic 28px Georgia, serif; color: #7cf2c9;');
    console.log('%cYou opened the console. That is exactly the kind of curiosity we hire for.\nAtlantic Fellowship: https://getatlantic.ai/fellowship', 'font: 12px ui-monospace, monospace; color: #efe9dc;');
  } catch (e) {}

  /* ---------------------------------------------------------------- */
  /* chessboard                                                        */
  /* ---------------------------------------------------------------- */
  var SVGNS = 'http://www.w3.org/2000/svg';
  var FILES = 'abcdefgh';
  function sq(name) { return { x: FILES.indexOf(name[0]) * 100 + 50, y: (8 - parseInt(name[1], 10)) * 100 + 50 }; }
  var moves = $$('.move');
  var path = moves.map(function (m) { return m.dataset.sq; });
  var gSquares = $('.board__squares'), gCoords = $('.board__coords'), gMarks = $('.board__marks');
  var trail = $('.board__trail'), knightG = $('.board__knight');
  var rects = {};
  (function buildBoard() {
    for (var r = 8; r >= 1; r--) {
      for (var f = 0; f < 8; f++) {
        var rc = document.createElementNS(SVGNS, 'rect');
        rc.setAttribute('x', f * 100); rc.setAttribute('y', (8 - r) * 100);
        rc.setAttribute('width', 100); rc.setAttribute('height', 100);
        if ((f + r) % 2 === 1) rc.setAttribute('class', 'dark');
        gSquares.appendChild(rc);
        rects[FILES[f] + r] = rc;
      }
    }
    for (var i = 0; i < 8; i++) {
      var tf = document.createElementNS(SVGNS, 'text');
      tf.setAttribute('x', i * 100 + 50); tf.setAttribute('y', 826); tf.setAttribute('text-anchor', 'middle');
      tf.textContent = FILES[i];
      gCoords.appendChild(tf);
      var tr = document.createElementNS(SVGNS, 'text');
      tr.setAttribute('x', -16); tr.setAttribute('y', (7 - i) * 100 + 56); tr.setAttribute('text-anchor', 'middle');
      tr.textContent = String(i + 1);
      gCoords.appendChild(tr);
    }
    var d = '';
    path.forEach(function (name, idx) {
      var p = sq(name);
      if (idx === 0) { d = 'M' + p.x + ' ' + p.y; }
      else {
        var q = sq(path[idx - 1]);
        var corner = Math.abs(p.x - q.x) === 200 ? { x: p.x, y: q.y } : { x: q.x, y: p.y };
        d += ' L' + corner.x + ' ' + corner.y + ' L' + p.x + ' ' + p.y;
      }
      var mk = document.createElementNS(SVGNS, 'g');
      mk.setAttribute('class', 'mark');
      mk.style.opacity = '0';
      var c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', p.x - 30); c.setAttribute('cy', p.y - 30); c.setAttribute('r', 15);
      var tx = document.createElementNS(SVGNS, 'text');
      tx.setAttribute('x', p.x - 30); tx.setAttribute('y', p.y - 29);
      tx.textContent = String(idx + 1);
      mk.appendChild(c); mk.appendChild(tx);
      gMarks.appendChild(mk);
    });
    trail.setAttribute('d', d);
  })();
  var SEG = 300; // every knight move is a 2 + 1 square L, 300 units of trail
  var TRAIL = SEG * (path.length - 1);
  trail.style.strokeDasharray = TRAIL + ' ' + TRAIL;
  trail.style.strokeDashoffset = TRAIL;
  var marks = $$('.board__marks .mark');
  var caption = $('.board__move'), captionSq = $('.board__sq');
  var start = sq(path[0]);
  knightG.setAttribute('transform', 'translate(' + start.x + ' ' + start.y + ')');

  function paintBoard(idx) {
    Object.keys(rects).forEach(function (k) { rects[k].classList.remove('is-visited', 'is-here'); });
    for (var i = 0; i <= idx; i++) rects[path[i]].classList.add(i === idx ? 'is-here' : 'is-visited');
    marks.forEach(function (m, i) { m.style.opacity = i < idx ? '1' : '0'; m.style.transition = 'opacity .5s'; });
    moves.forEach(function (m, i) { m.classList.toggle('is-active', i === idx); });
    caption.textContent = String(idx + 1);
    captionSq.textContent = idx === 0 ? path[0] : 'N' + path[idx];
  }

  /* ---------------------------------------------------------------- */
  /* no GSAP (blocked CDN, old browser): show everything, stay useful */
  /* ---------------------------------------------------------------- */
  if (!hasGsap) {
    html.classList.add('no-motion');
    var ld = $('.loader'); if (ld) ld.style.display = 'none';
    if (O) { O.intro = 1; O.active = true; if (O.start) O.start(); }
    hud.classList.add('is-on');
    voyage(docProgress());
    window.addEventListener('scroll', function () { voyage(docProgress()); }, { passive: true });
    paintBoard(0);
    moves.forEach(function (m) { m.style.opacity = 1; });
    setupFilm();
    return;
  }

  /* ================================================================= */
  /* GSAP from here on                                                 */
  /* ================================================================= */
  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  if (window.SplitText) gsap.registerPlugin(window.SplitText);
  var Split = window.SplitText;
  ST.config({ ignoreMobileResize: true });

  /* smooth scroll */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  function scrollToTarget(el) {
    if (el === null || el === undefined) return;
    if (lenis) { lenis.scrollTo(el, { duration: 1.8, easing: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); } }); return; }
    if (typeof el === 'number') window.scrollTo({ top: el, behavior: reduce ? 'auto' : 'smooth' });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var el = id === '#top' ? document.body : $(id);
      if (!el) return;
      e.preventDefault();
      scrollToTarget(id === '#top' ? 0 : el);
      if (id !== '#top') history.replaceState(null, '', id);
      else history.replaceState(null, '', location.pathname);
    });
  });

  /* ---------------------------------------------------------------- */
  /* reveals                                                           */
  /* ---------------------------------------------------------------- */
  function setupReveals() {
    if (reduce) return;

    $$('[data-split]').forEach(function (el) {
      if (!Split) return;
      Split.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true, aria: 'none',
        onSplit: function (self) {
          return gsap.from(self.lines, {
            yPercent: 112, duration: 1.3, ease: 'expo.out', stagger: 0.1,
            scrollTrigger: { trigger: el, start: 'top 86%', once: true }
          });
        }
      });
    });

    /* every reveal is a masked rise: the element slides up from behind its own clip */
    function maskRise(targets, trigger, start, extra) {
      return gsap.fromTo(targets,
        { yPercent: 100, clipPath: 'inset(0% 0% 100% 0%)' },
        Object.assign({
          yPercent: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.out',
          clearProps: 'clipPath,transform',
          scrollTrigger: { trigger: trigger, start: start || 'top 90%', once: true }
        }, extra || {}));
    }

    $$('[data-reveal]').forEach(function (el) {
      if (el.tagName === 'P' && Split) {
        Split.create(el, {
          type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true, aria: 'none',
          onSplit: function (self) {
            return gsap.from(self.lines, {
              yPercent: 108, duration: 1.2, ease: 'expo.out', stagger: 0.07,
              scrollTrigger: { trigger: el, start: 'top 90%', once: true }
            });
          }
        });
      } else if (el.offsetHeight > 240) {
        /* tall blocks (the entry with its photo) rise a short way, not their full height */
        gsap.fromTo(el, { y: 90, clipPath: 'inset(0% 0% 100% 0%)' }, {
          y: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.out', clearProps: 'clipPath,transform',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true }
        });
      } else {
        maskRise(el, el);
      }
    });

    $$('.sec__label').forEach(function (el) {
      gsap.from(el, {
        clipPath: 'inset(0 100% 0 0)', duration: 1.4, ease: 'expo.inOut',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true }
      });
    });

    /* manifesto: words light up with the scroll */
    var man = $('[data-words]');
    if (man && Split) {
      Split.create(man, {
        type: 'words', wordsClass: 'w', autoSplit: true, aria: 'none',
        onSplit: function (self) {
          return gsap.fromTo(self.words, { opacity: 0.13 }, {
            opacity: 1, ease: 'none', stagger: 0.12,
            scrollTrigger: { trigger: man, start: 'top 80%', end: 'bottom 48%', scrub: 0.6 }
          });
        }
      });
    }

    /* counters */
    $$('[data-count]').forEach(function (el) {
      var to = parseInt(el.dataset.count, 10);
      var from = to === 0 ? 12 : 0;
      var o = { v: from };
      el.textContent = String(from);
      ST.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: function () {
          gsap.to(o, { v: to, duration: to === 0 ? 1.6 : 2.2, ease: 'power3.out', onUpdate: function () { el.textContent = String(Math.round(o.v)); } });
        }
      });
    });

    /* stats + clients stagger */
    gsap.from('.stat__num > *', {
      yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.03,
      scrollTrigger: { trigger: '.proof__grid', start: 'top 85%', once: true }
    });
    maskRise('.stat__label', '.proof__grid', 'top 85%', { stagger: 0.08, delay: 0.15 });
    maskRise('.proof__ctas .btn', '.proof__ctas', 'top 94%', { stagger: 0.08 });

    /* principles rows */
    $$('.p').forEach(function (p) {
      maskRise(p.querySelector('.p__t'), p, 'top 92%', { duration: 1.4 });
    });

    /* contact title */
    var ct = $('.contact__title');
    if (ct && Split) {
      Split.create(ct, {
        type: 'chars,lines', mask: 'lines', linesClass: 'split-line', autoSplit: true, aria: 'none',
        onSplit: function (self) {
          self.chars.forEach(function (c) { c.setAttribute('aria-hidden', 'true'); });
          return gsap.from(self.chars, {
            yPercent: 115, rotate: 6, duration: 1.5, ease: 'expo.out', stagger: 0.03,
            scrollTrigger: { trigger: ct, start: 'top 82%', once: true }
          });
        }
      });
    }
    maskRise('.contact__links .btn', '.contact__links', 'top 96%', { stagger: 0.07 });

    /* photos + film: the frame opens from below, the picture settles and drifts with the scroll */
    $$('.media').forEach(function (m) {
      var pic = m.querySelector('img, video');
      gsap.fromTo(m, { clipPath: 'inset(100% 0% 0% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.out', clearProps: 'clipPath',
        scrollTrigger: { trigger: m, start: 'top 90%', once: true }
      });
      if (!pic) return;
      gsap.fromTo(pic, { scale: 1.34 }, {
        scale: 1.12, duration: 1.9, ease: 'expo.out',
        scrollTrigger: { trigger: m, start: 'top 90%', once: true }
      });
      gsap.fromTo(pic, { yPercent: -5 }, {
        yPercent: 5, ease: 'none',
        scrollTrigger: { trigger: m, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    $$('.media__cap').forEach(function (cap) { maskRise(cap, cap, 'top 96%'); });
    if ($('.hero__photo')) gsap.to('.hero__photo', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  function setupScrollState() {
    var navEl = $('.nav'), heroEl = $('.hero');
    function navState() { navEl.classList.toggle('is-scrolled', window.scrollY > heroEl.offsetHeight * 0.85); }
    /* voyage + progress + nav scrim on every scroll frame */
    ST.create({
      start: 0, end: 'max',
      onUpdate: function (self) { voyage(self.progress); navState(); },
      onRefresh: navState
    });

    /* ---------------------------------------------------------------- */
    /* ocean visibility: only hero + contact are transparent            */
    /* ---------------------------------------------------------------- */
    var heroOn = true, contactOn = false;
    function syncOcean() { O.active = heroOn || contactOn; }
    ST.create({
      trigger: '.hero', start: 'top bottom', end: 'bottom top',
      onToggle: function (s) { heroOn = s.isActive; syncOcean(); },
      onUpdate: function (s) { O.dive = clamp((s.progress - 0.5) * 2, 0, 1); }
    });
    ST.create({
      trigger: '.contact', start: 'top bottom', end: 'bottom top',
      onToggle: function (s) { contactOn = s.isActive; syncOcean(); }
    });
    ST.create({
      trigger: '.contact', start: 'top bottom', end: 'top 20%', scrub: true,
      onUpdate: function (s) { O.mix = s.progress; O.amp = 1 + s.progress * 0.55; }
    });

    /* nav active section */
    var navLinks = $$('[data-nav]');
    navLinks.forEach(function (a) {
      var sec = document.getElementById(a.dataset.nav);
      if (!sec) return;
      ST.create({
        trigger: sec, start: 'top 55%', end: 'bottom 55%',
        onToggle: function (s) { a.classList.toggle('is-active', s.isActive); }
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* pipeline                                                          */
  /* ---------------------------------------------------------------- */
  function setupPipeline() {
    var section = $('.pipeline'), track = $('.pipeline__track'), fill = $('.pipeline__fill');
    var stages = $$('.stage'), countEl = $('.pipeline__count b');
    var pulseEl = $('.pipeline__pulse'), wireEl = $('.pipeline__wire');
    var pulse = { len: 0, axis: 'x', on: false };
    var lastOn = -1;
    function runPulse(time) {
      if (!pulse.on || pulse.len < 24) { pulseEl.style.opacity = '0'; return; }
      var period = clamp(pulse.len / 420, 0.9, 2.6);
      var t = (time % period) / period;
      var pos = t * pulse.len;
      pulseEl.style.opacity = String(Math.min(1, t * 8, (1 - t) * 6));
      pulseEl.style.transform = pulse.axis === 'x' ? 'translate3d(' + pos.toFixed(1) + 'px,0,0)' : 'translate3d(0,' + pos.toFixed(1) + 'px,0)';
    }
    if (!reduce) {
      gsap.ticker.add(runPulse);
      ST.create({ trigger: section, start: 'top bottom', end: 'bottom top', onToggle: function (s) { pulse.on = s.isActive; } });
    }
    function light(n) {
      if (n === lastOn) return;
      lastOn = n;
      stages.forEach(function (s, i) {
        s.classList.toggle('is-on', i <= n);
        s.classList.toggle('is-active', i === n);
        if (i <= n) typeTerm(s.querySelector('.stage__term'));
      });
      countEl.textContent = String(Math.max(1, n + 1)).padStart(2, '0');
    }

    if (reduce) {
      light(stages.length - 1);
      fill.style.transform = 'none';
      return;
    }

    var mm = gsap.matchMedia();
    mm.add('(min-width: 960px)', function () {
      section.classList.add('is-hscroll');
      var wire = $('.pipeline__wire');
      function dist() { return Math.max(0, track.scrollWidth - window.innerWidth); }
      /* geometry is measured on refresh only; per frame we just add the track's x */
      var geo = null;
      function measure() {
        var x = gsap.getProperty(track, 'x') || 0;
        geo = {
          base: track.getBoundingClientRect().left - x,
          wl: wire.offsetLeft, ww: wire.offsetWidth,
          st: stages.map(function (s) { return s.offsetLeft; })
        };
      }
      function scan(pr) {
        pr = typeof pr === 'number' ? pr : 0;
        if (!geo) measure();
        var x = gsap.getProperty(track, 'x') || 0;
        var line = window.innerWidth * (0.2 + 0.72 * pr);
        var f = clamp((line - (geo.base + x + geo.wl)) / geo.ww, 0, 1);
        fill.style.transform = 'scaleX(' + f.toFixed(4) + ')';
        pulse.axis = 'x'; pulse.len = f * geo.ww;
        var n = -1;
        for (var i = 0; i < geo.st.length; i++) { if (geo.base + x + geo.st[i] + 32 < line) n = i; }
        light(n);
      }
      /* scan follows the track itself (the scrubbed tween), not the raw scroll,
         so lights stay in sync while the scrub catches up after a fast jump */
      var tw = gsap.to(track, {
        x: function () { return -dist(); },
        ease: 'none',
        onUpdate: function () { scan(this.progress()); },
        scrollTrigger: {
          trigger: section, pin: true, start: 'top top',
          end: function () { return '+=' + Math.round(dist() * 1.05); },
          scrub: 0.8, invalidateOnRefresh: true,
          onRefresh: function () { geo = null; scan(tw ? tw.progress() : 0); }
        }
      });
      return function () {
        section.classList.remove('is-hscroll');
        tw.scrollTrigger && tw.scrollTrigger.kill();
        tw.kill();
        gsap.set(track, { clearProps: 'transform' });
        fill.style.transform = '';
        lastOn = -1;
      };
    });
    mm.add('(max-width: 959px)', function () {
      var geoM = null;
      function measureM() {
        geoM = { wh: wireEl.offsetHeight, tops: stages.map(function (st) { return st.getBoundingClientRect().top + window.scrollY; }) };
      }
      var a = ST.create({
        trigger: track, start: 'top 62%', end: 'bottom 62%', scrub: 0.4,
        onRefresh: function () { geoM = null; },
        onUpdate: function (s) {
          if (!geoM) measureM();
          fill.style.transform = 'scaleY(' + s.progress.toFixed(4) + ')';
          pulse.axis = 'y'; pulse.len = s.progress * geoM.wh;
          var n = -1, line = window.scrollY + window.innerHeight * 0.62;
          for (var i = 0; i < geoM.tops.length; i++) { if (geoM.tops[i] + 28 < line) n = i; }
          light(n);
        }
      });
      return function () { a.kill(); fill.style.transform = ''; lastOn = -1; };
    });
  }

  /* ---------------------------------------------------------------- */
  /* knight's tour                                                     */
  /* ---------------------------------------------------------------- */
  function setupKnight() {
    var tl = gsap.timeline({ paused: true });
    tl.addLabel('m0', 0);
    for (var i = 1; i < path.length; i++) {
      var a = sq(path[i - 1]), b = sq(path[i]);
      var corner = Math.abs(b.x - a.x) === 200 ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
      var long1 = Math.abs(corner.x - a.x) + Math.abs(corner.y - a.y);
      var d1 = long1 === 200 ? 0.42 : 0.26, d2 = 0.68 - d1;
      tl.to(knightG, { attr: { transform: 'translate(' + corner.x + ' ' + corner.y + ')' }, duration: d1, ease: 'power2.in' });
      tl.to(knightG, { attr: { transform: 'translate(' + b.x + ' ' + b.y + ')' }, duration: d2, ease: 'power3.out' });
      tl.to(trail, { strokeDashoffset: TRAIL - SEG * i, duration: 0.68, ease: 'power2.inOut' }, '<' + (-d1));
      tl.addLabel('m' + i);
    }
    var current = 0, tween = null;
    function goTo(idx, instant) {
      idx = clamp(idx, 0, path.length - 1);
      paintBoard(idx);
      if (idx === current && !instant) return;
      var steps = Math.abs(idx - current);
      current = idx;
      if (tween) tween.kill();
      if (instant || reduce) { tl.seek('m' + idx); return; }
      tween = tl.tweenTo('m' + idx, { duration: Math.min(0.75 * steps, 1.6), ease: steps > 1 ? 'power2.inOut' : 'none' });
    }
    paintBoard(0);
    var mmK = gsap.matchMedia();
    function bindMoves(line) {
      var list = moves.map(function (m, i) {
        return ST.create({
          trigger: m, start: 'top ' + line, end: 'bottom ' + line,
          onToggle: function (s) { if (s.isActive) goTo(i); }
        });
      });
      return function () { list.forEach(function (t) { t.kill(); }); };
    }
    mmK.add('(min-width: 960px)', function () { return bindMoves('58%'); });
    mmK.add('(max-width: 959px)', function () { return bindMoves('72%'); });
    var bw = $('.board');
    bw.addEventListener('mouseenter', function () { cursorLabel('♞', true); });
    bw.addEventListener('mouseleave', function () { cursorLabel('', false); });
  }

  /* ---------------------------------------------------------------- */
  /* marquee                                                           */
  /* ---------------------------------------------------------------- */
  function setupMarquee() {
    var track = $('.marquee__track');
    if (!track || reduce) return;
    var loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 34, repeat: -1 });
    var skew = gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3' });
    var dir = 1;
    ST.create({
      trigger: '.marquee', start: 'top bottom', end: 'bottom top',
      onUpdate: function (s) {
        var v = s.getVelocity();
        dir = v < 0 ? -1 : 1;
        gsap.to(loop, { timeScale: dir * (1 + Math.min(Math.abs(v) / 260, 7)), duration: 0.25, overwrite: true });
        gsap.to(loop, { timeScale: dir, duration: 1.2, delay: 0.25, overwrite: false });
        skew(clamp(-v / 140, -12, 12));
        clearTimeout(track._t);
        track._t = setTimeout(function () { skew(0); }, 140);
      },
      onToggle: function (s) { s.isActive ? loop.play() : loop.pause(); }
    });
  }

  /* ---------------------------------------------------------------- */
  /* cursor + magnetic                                                 */
  /* ---------------------------------------------------------------- */
  var cursor = $('.cursor'), cLabel = $('.cursor__label');
  function cursorLabel(text, on) {
    if (!cursor) return;
    cLabel.textContent = text;
    cursor.classList.toggle('is-hover', !!on);
  }
  function setupCursor() {
    if (!finePointer || reduce) return;
    html.classList.add('has-cursor');
    var dot = $('.cursor__dot'), ring = $('.cursor__ring'), kn = $('.cursor__knight');
    var dx = gsap.quickSetter(dot, 'x', 'px'), dy = gsap.quickSetter(dot, 'y', 'px');
    var kx = gsap.quickTo(kn, 'x', { duration: 0.25, ease: 'power3' }), ky = gsap.quickTo(kn, 'y', { duration: 0.25, ease: 'power3' });
    var rx = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });
    gsap.set([dot, ring, kn], { x: -100, y: -100 });
    window.addEventListener('pointermove', function (e) {
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); kx(e.clientX); ky(e.clientY);
    }, { passive: true });
    window.addEventListener('pointerdown', function () { cursor.classList.add('is-down'); });
    window.addEventListener('pointerup', function () { cursor.classList.remove('is-down'); });
    document.addEventListener('mouseleave', function () { gsap.set([dot, ring], { x: -100, y: -100 }); });
    $$('a, button, [data-cursor]').forEach(function (el) {
      el.addEventListener('mouseenter', function () { cursorLabel(el.dataset.cursor || '', true); });
      el.addEventListener('mouseleave', function () { cursorLabel('', false); });
    });
    $$('.mag').forEach(function (el) {
      var mx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' }), my = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * 0.28);
        my((e.clientY - (r.top + r.height / 2)) * 0.38);
      });
      el.addEventListener('mouseleave', function () {
        gsap.to(el, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.4)', overwrite: true });
      });
    });
  }

  /* principles: tap to open on touch */
  $$('.p').forEach(function (p) {
    p.addEventListener('click', function () { if (!finePointer) p.classList.toggle('is-open'); });
  });

  /* ---------------------------------------------------------------- */
  /* easter egg: type e4                                               */
  /* ---------------------------------------------------------------- */
  var toast = $('.toast'), keys = '', toastT;
  function say(msg) {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toast.classList.remove('is-on'); }, 3600);
  }
  window.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || !e.key || e.key.length > 1) return;
    keys = (keys + e.key.toLowerCase()).slice(-6);
    if (/e4$/.test(keys)) {
      keys = '';
      say('1. e4 · Best by test. Your move.');
      if (cursor && html.classList.contains('has-cursor')) {
        cursor.classList.add('is-knight');
        setTimeout(function () { cursor.classList.remove('is-knight'); }, 9000);
      }
      if (O && O.ok) gsap.fromTo(O, { amp: 2.2 }, { amp: 1, duration: 3, ease: 'power2.out' });
    }
  });

  /* ---------------------------------------------------------------- */
  /* intro                                                             */
  /* ---------------------------------------------------------------- */
  function heroIntro() {
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    var chars = [];
    if (Split) {
      $$('.hero__word').forEach(function (w) {
        var s = Split.create(w, { type: 'chars', charsClass: 'c', aria: 'none' });
        s.chars.forEach(function (c) { c.setAttribute('aria-hidden', 'true'); });
        chars = chars.concat(s.chars);
      });
    }
    gsap.set(chars, { transformOrigin: '0% 100%' });
    tl.from(chars.length ? chars : '.hero__word', { yPercent: 118, rotate: 7, duration: 1.7, stagger: 0.055 }, 0);
    tl.add(function () { if (O.start) O.start(); }, 0);
    tl.to(O, { intro: 1, duration: 3.2, ease: 'power3.out' }, 0);
    if (Split) {
      var tag = Split.create('.hero__tag', { type: 'lines', mask: 'lines', linesClass: 'split-line', aria: 'none' });
      tl.from(tag.lines, { yPercent: 110, duration: 1.4, stagger: 0.12 }, 0.45);
    }
    tl.from('.hero__top > *, .hero__meta > *', { y: 22, opacity: 0, duration: 1.2, stagger: 0.07 }, 0.6);
    tl.from('.nav > *', { y: -24, opacity: 0, duration: 1.2, stagger: 0.08 }, 0.5);
    /* the main photo settles; scale only, so it is painted (and counted) from the first frame */
    if ($('.hero__photo img')) tl.from('.hero__photo img', { scale: 1.14, duration: 2.8, ease: 'expo.out' }, 0);
    tl.add(function () { hud.classList.add('is-on'); }, 1.2);
    return tl;
  }

  function runLoader(done) {
    var loader = $('.loader');
    if (reduce || !loader) { if (loader) loader.style.display = 'none'; done(); return; }
    var num = $('.loader__num'), barI = $('.loader__bar i');
    var o = { v: 0 };
    function render() {
      num.textContent = String(Math.round(o.v)).padStart(3, '0');
      barI.style.transform = 'scaleX(' + (o.v / 100).toFixed(3) + ')';
    }
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    var timeout = new Promise(function (r) { setTimeout(r, 3500); });
    var first = gsap.to(o, { v: 82, duration: 1.15, ease: 'power2.inOut', onUpdate: render });
    Promise.race([fontsReady, timeout]).then(function () {
      first.then(function () {
        gsap.timeline()
          .to(o, { v: 100, duration: 0.45, ease: 'power2.out', onUpdate: render })
          .to(num, { yPercent: -110, duration: 0.8, ease: 'expo.in' }, '+=0.1')
          .to('.loader__row', { opacity: 0, duration: 0.5 }, '<')
          .add(function () { done(); }, '-=0.1')
          .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.15, ease: 'expo.inOut' }, '-=0.15')
          .set(loader, { display: 'none' });
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* film: the files carry no audio track at all; they load and play    */
  /* only near the screen, and never autoplay for reduced motion        */
  /* ---------------------------------------------------------------- */
  function setupFilm() {
    var vids = $$('video[data-src]');
    if (!vids.length) return;
    function load(v) { if (!v.getAttribute('src')) v.src = v.dataset.src; }
    vids.forEach(function (v) { v.muted = true; if (reduce) v.controls = true; });
    if (!('IntersectionObserver' in window)) { vids.forEach(load); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          load(v);
          if (!reduce) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { rootMargin: '300px 0px' });
    vids.forEach(function (v) { io.observe(v); });
  }

  /* ---------------------------------------------------------------- */
  /* boot                                                              */
  /* ---------------------------------------------------------------- */
  setupFilm();
  setupCursor();
  setupPipeline();
  setupKnight();
  setupMarquee();
  setupScrollState();

  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 3500); })]).then(function () {
    setupReveals();
    ST.refresh();
  });

  runLoader(function () {
    var loaderEl = $('.loader');
    if (loaderEl) loaderEl.style.animation = 'none';
    if (reduce) {
      O.intro = 1;
      if (O.start) O.start();
      hud.classList.add('is-on');
    } else {
      heroIntro();
    }
    if (lenis) lenis.start();
    voyage(docProgress());
    if (startHash && $(startHash)) setTimeout(function () { scrollToTarget($(startHash)); }, 400);
  });
})();
