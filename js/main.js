/* =========================================================================
   main.js — motion orchestration · "Molten"
   GSAP + ScrollTrigger + Lenis (CDN UMD globals). Lazy Three.js hero.
   Degrades gracefully if a library is missing.
   ========================================================================= */
(function () {
  'use strict';
  var html = document.documentElement;
  var FULL = html.getAttribute('data-perf') === 'full';
  var FINE = html.getAttribute('data-pointer') === 'fine';
  var hasGSAP = typeof window.gsap !== 'undefined';
  var hasST = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
  var hasLenis = typeof window.Lenis !== 'undefined';
  if (hasST) gsap.registerPlugin(ScrollTrigger);

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  /* 1. SMOOTH SCROLL — Lenis ↔ ScrollTrigger */
  var lenis = null;
  function initSmooth() {
    if (!hasLenis || !FULL) return;
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    html.classList.add('lenis');
    if (hasST) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      requestAnimationFrame(function raf(t) { lenis.raf(t); requestAnimationFrame(raf); });
    }
    window.__lenis = lenis; // exposed for hero velocity coupling
  }

  /* 2. TEXT SPLITTING */
  function splitChars(el) {
    var parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = '';
    parts.forEach(function (part) {
      var line = document.createElement('span'); line.style.display = 'block';
      part.split('').forEach(function (ch) {
        var s = document.createElement('span'); s.className = 'char'; s.setAttribute('aria-hidden', 'true');
        s.textContent = ch === ' ' ? ' ' : ch; line.appendChild(s);
      });
      el.appendChild(line);
    });
    return $$('.char', el);
  }
  function splitLines(el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    var spans = words.map(function (w, i) {
      var s = document.createElement('span'); s.textContent = w + (i < words.length - 1 ? ' ' : ''); s.style.display = 'inline-block'; el.appendChild(s); return s;
    });
    var lines = [], cur = [], lastTop = null;
    spans.forEach(function (sp) { var top = sp.offsetTop; if (lastTop === null) lastTop = top; if (top !== lastTop) { lines.push(cur); cur = []; lastTop = top; } cur.push(sp.textContent); });
    if (cur.length) lines.push(cur);
    el.innerHTML = '';
    return lines.map(function (lw) {
      var mask = document.createElement('span'); mask.className = 'line-mask';
      var inner = document.createElement('span'); inner.className = 'line-inner'; inner.textContent = lw.join('');
      mask.appendChild(inner); el.appendChild(mask); return inner;
    });
  }

  /* 3. PRELOADER (terminal boot) */
  function runPreloader(done) {
    var pre = $('#preloader'); if (!pre) { done(); return; }
    var lines = $$('.boot-line'), count = $('#preCount'), fill = $('#preFill');
    function finish() {
      if (hasGSAP) gsap.to(pre, { yPercent: -100, duration: 0.9, ease: 'expo.inOut', onComplete: function () { pre.style.display = 'none'; } });
      else { pre.style.opacity = '0'; setTimeout(function () { pre.style.display = 'none'; }, 500); }
      done();
    }
    if (!hasGSAP || !FULL) {
      if (count) count.textContent = '100'; if (fill) fill.style.width = '100%';
      lines.forEach(function (l) { l.style.opacity = '1'; });
      setTimeout(finish, FULL ? 450 : 150); return;
    }
    var tl = gsap.timeline({ onComplete: finish });
    tl.to(lines, { opacity: 1, duration: 0.18, stagger: 0.13, ease: 'none' }, 0.1);
    var p = { v: 0 };
    tl.to(p, { v: 100, duration: 1.2, ease: 'power2.inOut', onUpdate: function () { var n = Math.round(p.v); if (count) count.textContent = String(n).padStart(3, '0'); if (fill) fill.style.width = n + '%'; } }, 0.15);
    tl.to({}, { duration: 0.25 });
  }

  /* 4. CURSOR (blend-difference dot + ring) + MAGNETIC */
  function initCursor() {
    if (!FINE || !FULL || !hasGSAP) return;
    var cur = $('#cursor'), label = $('#cursorLabel'); if (!cur) return;
    html.classList.add('cursor-ready');
    var x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    var sx = gsap.quickSetter(cur, 'x', 'px'), sy = gsap.quickSetter(cur, 'y', 'px');
    addEventListener('mousemove', function (e) { x = e.clientX; y = e.clientY; }, { passive: true });
    gsap.ticker.add(function () { cx += (x - cx) * 0.2; cy += (y - cy) * 0.2; sx(cx); sy(cy); });
    $$('[data-cursor]').forEach(function (el) {
      var t = el.getAttribute('data-cursor');
      el.addEventListener('mouseenter', function () { if (t === 'view') { cur.classList.add('is-view'); if (label) label.textContent = 'View'; } else cur.classList.add('is-hover'); });
      el.addEventListener('mouseleave', function () { cur.classList.remove('is-view', 'is-hover'); if (label) label.textContent = ''; });
    });
    // delegated hover for a/button so lazily-injected controls (lab theaters) also get pointer affordance
    document.addEventListener('mouseover', function (e) { var t = e.target.closest ? e.target.closest('a, button') : null; if (t && !t.hasAttribute('data-cursor')) cur.classList.add('is-hover'); });
    document.addEventListener('mouseout', function (e) { var t = e.target.closest ? e.target.closest('a, button') : null; if (t && !t.hasAttribute('data-cursor')) cur.classList.remove('is-hover'); });
    $$('[data-magnetic]').forEach(function (el) {
      var s = parseFloat(el.getAttribute('data-magnetic')) || 0.35;
      var qx = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' }), qy = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' });
      el.addEventListener('mousemove', function (e) { var r = el.getBoundingClientRect(); qx((e.clientX - (r.left + r.width / 2)) * s); qy((e.clientY - (r.top + r.height / 2)) * s); });
      el.addEventListener('mouseleave', function () { qx(0); qy(0); });
    });
  }

  /* 5. REVEALS */
  function initReveals() {
    if (!hasGSAP) return;
    var heroTitle = $('.hero__title[data-split-chars]');
    var heroChars = heroTitle ? splitChars(heroTitle) : [];
    if (heroChars.length) gsap.set(heroChars, { yPercent: 80, rotateX: -85, opacity: 0, transformPerspective: 800, transformOrigin: '50% 100%' });
    if (hasST) gsap.set($$('.hero .reveal-line'), { y: 26, opacity: 0 });

    window.__heroIn = function () {
      var c = $('#heroCanvas'); if (c) c.classList.add('is-ready');
      var tl = gsap.timeline();
      if (heroChars.length) tl.to(heroChars, { yPercent: 0, rotateX: 0, opacity: 1, duration: 1.15, ease: 'power4.out', stagger: 0.028 }, 0);
      tl.to($$('.hero .reveal-line'), { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.09 }, 0.35);
    };
    if (!hasST) return;

    $$('[data-split-lines]').forEach(function (el) {
      var inners = splitLines(el); gsap.set(inners, { yPercent: 110 });
      ScrollTrigger.create({ trigger: el, start: 'top 86%', once: true, onEnter: function () { gsap.to(inners, { yPercent: 0, duration: 1, ease: 'power4.out', stagger: 0.08 }); } });
    });
    var ct = $('.contact__title[data-split-chars]');
    if (ct) { var cc = splitChars(ct); gsap.set(cc, { yPercent: 110 }); ScrollTrigger.create({ trigger: ct, start: 'top 85%', once: true, onEnter: function () { gsap.to(cc, { yPercent: 0, duration: 1, ease: 'power4.out', stagger: 0.02 }); } }); }
    $$('.reveal-line').forEach(function (el) { if (el.closest('.hero')) return; gsap.set(el, { y: 22, opacity: 0 }); ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () { gsap.to(el, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }); } }); });
    // section-head underline draw (class toggles a CSS transition on ::after)
    $$('[data-head]').forEach(function (el) { ScrollTrigger.create({ trigger: el, start: 'top 82%', once: true, onEnter: function () { el.classList.add('drawn'); } }); });
  }

  /* 6. STATEMENT — word highlight on scroll */
  function initStatement() {
    var el = $('#statementText'); if (!el || !hasST) return;
    var words = el.textContent.trim().split(/\s+/);
    el.innerHTML = '';
    var HOT = { 'moves,': 1, 'lasts.': 1, '60fps,': 1, 'feels.': 1, 'detail': 1 };
    var spans = words.map(function (w) {
      var s = document.createElement('span'); s.className = 'w' + (HOT[w.toLowerCase()] ? ' is-hot' : ''); s.textContent = w + ' '; el.appendChild(s); return s;
    });
    ScrollTrigger.create({
      trigger: el, start: 'top 78%', end: 'top 28%', scrub: true,
      onUpdate: function (self) {
        var active = Math.floor(self.progress * spans.length * 1.08);
        spans.forEach(function (s, i) {
          if (i < active) { s.classList.add('on'); if (s.classList.contains('is-hot')) s.classList.add('hot'); }
          else { s.classList.remove('on', 'hot'); }
        });
      }
    });
  }

  /* 7. COUNTERS */
  function initCounters() {
    if (!hasST) { $$('[data-count]').forEach(function (e) { e.textContent = e.getAttribute('data-count') + (e.getAttribute('data-suffix') || ''); }); return; }
    $$('[data-count]').forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-count')), suf = el.getAttribute('data-suffix') || '', o = { v: 0 };
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () { gsap.to(o, { v: target, duration: 1.6, ease: 'power2.out', onUpdate: function () { el.textContent = Math.round(o.v) + suf; } }); } });
    });
  }

  /* 8. WORK — pinned horizontal */
  function initWork() {
    var pin = $('#workPin'), track = $('#workTrack'); if (!pin || !track) return;
    if (!hasST || !FULL || matchMedia('(max-width: 900px)').matches) { track.style.overflowX = 'auto'; return; }
    gsap.to(track, {
      x: function () { return -(track.scrollWidth - innerWidth + 40); }, ease: 'none',
      scrollTrigger: { trigger: pin, start: 'top top', end: function () { return '+=' + (track.scrollWidth - innerWidth + innerHeight * 0.5); }, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 }
    });
  }

  /* 9. CARD 3D TILT */
  function initTilt() {
    if (!FINE || !FULL || !hasGSAP) return;
    $$('[data-tilt]').forEach(function (card) {
      var rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' }), ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' });
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        gsap.set(card, { transformPerspective: 900 });
        rx(-((e.clientY - r.top) / r.height - 0.5) * 9); ry(((e.clientX - r.left) / r.width - 0.5) * 11);
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');   // pointer spotlight
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      });
      card.addEventListener('mouseleave', function () { rx(0); ry(0); });
    });
  }

  /* 10. TIMELINE draw */
  function initTimeline() {
    var line = $('#timelineLine'), tl = $('#timeline'); if (!line || !tl || !hasST) return;
    var path = $('path', line); if (!path) return;
    function sync() { var h = tl.offsetHeight; line.setAttribute('viewBox', '0 0 2 ' + h); path.setAttribute('d', 'M1 0 V ' + h); }
    sync();
    var len = path.getTotalLength ? path.getTotalLength() : tl.offsetHeight;
    path.style.strokeDasharray = len; path.style.strokeDashoffset = len; path.style.color = 'var(--accent)';
    gsap.to(path, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: tl, start: 'top 70%', end: 'bottom 80%', scrub: 1, onRefresh: sync } });
    $$('.timeline__item', tl).forEach(function (it) { gsap.set(it, { opacity: 0, x: 20 }); ScrollTrigger.create({ trigger: it, start: 'top 85%', once: true, onEnter: function () { gsap.to(it, { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' }); } }); });
  }

  /* 11. MARQUEES */
  function initMarquees() {
    var m = $('#marquee');
    if (m && hasGSAP) { m.innerHTML += m.innerHTML; gsap.to(m, { x: -m.scrollWidth / 2, duration: 24, ease: 'none', repeat: -1 }); }
    var m2 = $('#marquee2');
    if (m2 && hasGSAP) { m2.innerHTML += m2.innerHTML; gsap.fromTo(m2, { x: -m2.scrollWidth / 2 }, { x: 0, duration: 30, ease: 'none', repeat: -1 }); }
    var fm = $('#footMarquee');
    if (fm) { fm.textContent = 'METEHAN ULUSOY — '.repeat(6); if (hasGSAP) gsap.to(fm, { x: -fm.scrollWidth / 2, duration: 32, ease: 'none', repeat: -1 }); }
  }

  /* 12. ROTATOR */
  function initRotator() {
    var el = $('#roleRotator'); if (!el) return;
    var roles = ['the web', 'AI agents', 'LLM tools', 'automations', 'GPU shaders'];
    if (!FULL) { el.textContent = roles[0]; return; }
    var ri = 0, ci = 0, del = false;
    (function tick() {
      var w = roles[ri]; el.textContent = w.slice(0, ci);
      if (!del && ci < w.length) { ci++; setTimeout(tick, 70); }
      else if (!del && ci === w.length) { del = true; setTimeout(tick, 1700); }
      else if (del && ci > 0) { ci--; setTimeout(tick, 34); }
      else { del = false; ri = (ri + 1) % roles.length; setTimeout(tick, 240); }
    })();
  }

  /* 13. NAV */
  function initNav() {
    var nav = $('#nav'); if (!nav) return; var last = 0;
    function onScroll() { var yy = scrollY || document.documentElement.scrollTop; nav.classList.toggle('is-scrolled', yy > 40); if (yy > last && yy > 420) nav.classList.add('is-hidden'); else nav.classList.remove('is-hidden'); last = yy; }
    if (lenis) lenis.on('scroll', onScroll); addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* 14. THEME */
  function initTheme() {
    var b = $('#themeToggle'); if (!b) return;
    b.addEventListener('click', function () { var n = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; html.setAttribute('data-theme', n); try { localStorage.setItem('theme', n); } catch (e) {} if (window.__heroTheme) window.__heroTheme(n); });
  }

  /* 15. ANCHORS */
  function initAnchors() {
    $$('a[href^="#"]').forEach(function (a) { a.addEventListener('click', function (e) { var id = a.getAttribute('href'); if (id.length < 2) return; var t = $(id); if (!t) return; e.preventDefault(); if (lenis) lenis.scrollTo(t, { duration: 1.2 }); else t.scrollIntoView({ behavior: 'smooth' }); }); });
  }

  /* 16. VELOCITY SKEW — marquees lean with scroll velocity (awwwards touch) */
  function initVelocitySkew() {
    if (!hasGSAP || !FULL) return;
    var m = $('#marquee'), fm = $('#footMarquee'); if (!m && !fm) return;
    var sm = m ? gsap.quickSetter(m, 'skewX', 'deg') : null;
    var sf = fm ? gsap.quickSetter(fm, 'skewX', 'deg') : null;
    var cur = 0;
    gsap.ticker.add(function () {
      var v = (window.__lenis && window.__lenis.velocity) ? window.__lenis.velocity : 0;
      var target = Math.max(-10, Math.min(10, v * 0.06));
      cur += (target - cur) * 0.1;
      if (sm) sm(cur); if (sf) sf(cur * 0.6);
    });
  }

  /* 17. SCRAMBLE — section numbers decode in on enter */
  function scrambleIn(el, text, dur) {
    var GL = '!<>-_\\/[]{}=+*#01', started = 0;
    (function tick(now) {
      if (!started) started = now;
      var p = Math.min(1, (now - started) / dur), rv = Math.floor(p * text.length), out = text.slice(0, rv);
      for (var i = rv; i < text.length; i++) out += text[i] === ' ' ? ' ' : GL[(Math.random() * GL.length) | 0];
      el.textContent = out;
      if (p < 1) requestAnimationFrame(tick); else el.textContent = text;
    })(0);
  }
  function initScramble() {
    if (!hasST || !FULL) return;
    $$('.section-num').forEach(function (el) {
      var final = el.textContent;
      ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { scrambleIn(el, final, 640); } });
    });
  }

  /* 18. LAZY WEBGL (hero shader + 3D blob), particles, constellation, inversion */
  function loadScript(src, cb) { var el = document.createElement('script'); el.src = src; el.onload = cb; document.body.appendChild(el); }
  function loadWebGL() {
    if (!FULL) return;
    var blobC = $('#blobCanvas'), modelC = $('#modelCanvas');
    if (!blobC && !modelC) return;
    var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = function () {
      if (blobC) loadScript('js/blob.js', function () { if (window.initBlob) window.initBlob(blobC); });
      if (modelC) {
        // GLB viewer: fetch loaders + model only as the Hardware section approaches
        var started = false;
        function loadModel() {
          if (started) return; started = true;
          loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js', function () {
            loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js', function () {
              loadScript('js/model3d.js', function () { if (window.initModel3D) window.initModel3D(modelC, modelC.getAttribute('data-model')); });
            });
          });
        }
        if ('IntersectionObserver' in window) {
          var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); loadModel(); } }, { rootMargin: '700px 0px' });
          io.observe(modelC);
        } else loadModel();
      }
    };
    document.body.appendChild(s);
  }
  /* hero background video (matrix code rain) — pause on lite tier / hidden tab to save power & data */
  function initHeroVideo() {
    var v = $('#heroVideo'); if (!v) return;
    if (!FULL) { try { v.pause(); v.removeAttribute('autoplay'); } catch (e) {} v.style.display = 'none'; return; }
    document.addEventListener('visibilitychange', function () { try { if (document.hidden) v.pause(); else v.play(); } catch (e) {} });
  }
  function loadParticles() {
    if (!FULL) return;
    var nameC = $('#nameCanvas'); if (!nameC) return;
    loadScript('js/name-particles.js', function () { if (window.initNameParticles) { html.classList.add('particles-on'); window.initNameParticles(nameC, "LET'S", 'BUILD'); } });
  }
  function initConstellation() {
    if (!FULL) return;
    var c = $('#constellation'); if (!c || !c.getContext) return;
    var ctx = c.getContext('2d'), DPR = Math.min(devicePixelRatio || 1, 2), W = 0, H = 0, nodes = [], raf = null, run = false, rt;
    function resize() { var r = c.getBoundingClientRect(); W = r.width; H = r.height; c.width = Math.max(1, W * DPR); c.height = Math.max(1, H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); var n = Math.min(120, Math.floor(W * H / 12000)); nodes = []; for (var i = 0; i < n; i++) nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28 }); }
    function step() {
      if (!run) return;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < nodes.length; i++) { var a = nodes[i]; a.x += a.vx; a.y += a.vy; if (a.x < 0 || a.x > W) a.vx *= -1; if (a.y < 0 || a.y > H) a.vy *= -1; }
      ctx.strokeStyle = 'rgba(0,255,65,0.55)';
      for (var i2 = 0; i2 < nodes.length; i2++) for (var j = i2 + 1; j < nodes.length; j++) { var b = nodes[j], dx = nodes[i2].x - b.x, dy = nodes[i2].y - b.y, d = Math.sqrt(dx * dx + dy * dy); if (d < 135) { ctx.globalAlpha = (1 - d / 135) * 0.5; ctx.beginPath(); ctx.moveTo(nodes[i2].x, nodes[i2].y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
      ctx.globalAlpha = 1; ctx.fillStyle = '#00ff41';
      for (var k = 0; k < nodes.length; k++) { ctx.beginPath(); ctx.arc(nodes[k].x, nodes[k].y, 1.4, 0, 6.283); ctx.fill(); }
      raf = requestAnimationFrame(step);
    }
    resize(); addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 180); });
    if ('IntersectionObserver' in window) { new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { run = true; if (!raf) raf = requestAnimationFrame(step); } else { run = false; if (raf) { cancelAnimationFrame(raf); raf = null; } } }); }, { threshold: 0.02 }).observe(c); } else { run = true; step(); }
  }
  function initInvert() {
    if (!hasST) return;
    var el = $('.invert'), tx = $('.invert__text', el || document);
    if (!el || !tx) return;
    tx.innerHTML = tx.innerHTML.replace('sixty frames a second', '<span class="hot">sixty frames a second</span>');
    gsap.fromTo(el, { backgroundColor: '#060806', color: '#eaf5ec' }, { backgroundColor: '#eaf5ec', color: '#060806', ease: 'none', scrollTrigger: { trigger: el, start: 'top 65%', end: 'top 12%', scrub: true } });
  }

  function boot() {
    initSmooth(); initReveals(); initStatement(); initCounters(); initWork(); initTilt(); initTimeline(); initMarquees(); initRotator(); initNav(); initTheme(); initAnchors(); initCursor(); initVelocitySkew(); initScramble(); initConstellation(); initInvert(); loadWebGL(); loadParticles(); initHeroVideo();
    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();
    runPreloader(function () { if (window.__heroIn) window.__heroIn(); if (hasST) ScrollTrigger.refresh(); });
    if (hasST) addEventListener('load', function () { ScrollTrigger.refresh(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
