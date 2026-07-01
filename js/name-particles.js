/* =========================================================================
   name-particles.js — canvas particle-text (ported from the Playground variant,
   recolored ember). Text assembles from particles; cursor repels them.
   window.initNameParticles(canvas, line1, line2)
   ========================================================================= */
window.initNameParticles = function (canvas, line1, line2) {
  if (!canvas || !canvas.getContext) return;
  line1 = line1 || "LET'S"; line2 = line2 || 'BUILD';
  var ctx = canvas.getContext('2d');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, particles = [], MAX = 3200;
  var mouse = { x: -9999, y: -9999, active: false }, REPEL = 120, running = true, rafId = null;

  function build() {
    var rect = canvas.getBoundingClientRect(); W = rect.width; H = rect.height;
    canvas.width = Math.max(1, Math.floor(W * DPR)); canvas.height = Math.max(1, Math.floor(H * DPR));
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var off = document.createElement('canvas'), octx = off.getContext('2d');
    off.width = Math.max(1, Math.floor(W)); off.height = Math.max(1, Math.floor(H));
    var cx = W / 2, targetW = W * (W < 640 ? 0.82 : 0.5), maxH = H / 3.0;
    octx.fillStyle = '#fff'; octx.textAlign = 'center'; octx.textBaseline = 'middle';
    octx.font = "700 100px 'Clash Display', system-ui, sans-serif";
    var widest = Math.max(octx.measureText(line1).width, octx.measureText(line2).width);
    var fs = Math.max(48, Math.min(100 * (targetW / widest), maxH));
    octx.font = '700 ' + fs + "px 'Clash Display', system-ui, sans-serif";
    var by = H * 0.46, gap = fs * 0.92;
    octx.fillText(line1, cx, by - gap / 2); octx.fillText(line2, cx, by + gap / 2);
    var img;
    try { img = octx.getImageData(0, 0, off.width, off.height).data; } catch (e) { running = false; return; }
    var pts = [], g = 3;
    for (; g <= 8; g++) { pts.length = 0; for (var yy = 0; yy < off.height; yy += g) for (var xx = 0; xx < off.width; xx += g) if (img[(yy * off.width + xx) * 4 + 3] > 128) pts.push({ x: xx, y: yy }); if (pts.length <= MAX) break; }
    if (pts.length > MAX) { var st = pts.length / MAX, tr = []; for (var i = 0; i < MAX; i++) tr.push(pts[Math.floor(i * st)]); pts = tr; }
    var n = pts.length; if (particles.length > n) particles.length = n;
    for (var j = 0; j < n; j++) { var t = pts[j]; if (particles[j]) { particles[j].tx = t.x; particles[j].ty = t.y; } else particles[j] = { x: Math.random() * W, y: Math.random() * H, tx: t.x, ty: t.y, vx: 0, vy: 0, r: 1.0 + Math.random() * 0.8 }; }
  }

  function step() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#ff5a2c';
    var settle = 0.16, damp = 0.82, r2 = REPEL * REPEL;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (mouse.active) { var ddx = p.x - mouse.x, ddy = p.y - mouse.y, d2 = ddx * ddx + ddy * ddy; if (d2 < r2 && d2 > 0.01) { var d = Math.sqrt(d2), f = (REPEL - d) / REPEL; p.vx += (ddx / d) * f * 4.5; p.vy += (ddy / d) * f * 4.5; } }
      p.vx *= damp; p.vy *= damp;
      p.x += (p.tx - p.x) * settle + p.vx; p.y += (p.ty - p.y) * settle + p.vy;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283185); ctx.fill();
    }
    rafId = requestAnimationFrame(step);
  }

  function onMove(cx, cy) { var r = canvas.getBoundingClientRect(); mouse.x = cx - r.left; mouse.y = cy - r.top; mouse.active = true; }
  var host = canvas.parentElement || canvas;
  host.addEventListener('mousemove', function (e) { onMove(e.clientX, e.clientY); }, { passive: true });
  host.addEventListener('mouseleave', function () { mouse.active = false; mouse.x = -9999; });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (running) build(); }, 180); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { if (!rafId && running) rafId = requestAnimationFrame(step); } else if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }); }, { threshold: 0.05 }).observe(canvas);
  }
  function boot() { build(); if (running) rafId = requestAnimationFrame(step); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (running) build(); });
  boot();
};
