/* =========================================================================
   chip.js — interactive 3D circuit board for the SILICON section (needs THREE).
   Fully procedural PCB: dark rounded board, emissive CPU die, Manhattan-routed
   traces with additive data pulses flowing along them. Drag to rotate with
   inertia, idle auto-spin, fine-pointer parallax tilt. DPR-capped, pauses
   when offscreen / tab hidden.
   window.initChip(canvas)
   ========================================================================= */
(function () {
  'use strict';

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  window.initChip = function (canvas) {
    if (typeof THREE === 'undefined' || !canvas) return;
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true }); }
    catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 3.2, 6.4);
    camera.lookAt(0, 0, 0);

    var root = new THREE.Group();       // everything rotates through this
    scene.add(root);

    /* ===== board (rounded plate via extruded shape) ===== */
    var BW = 6.4, BH = 0.12, BD = 4.2, TOP = BH / 2, CORNER = 0.22;
    var shape = new THREE.Shape();
    var hw = BW / 2, hd = BD / 2, r = CORNER;
    shape.moveTo(-hw + r, -hd);
    shape.lineTo(hw - r, -hd); shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
    shape.lineTo(hw, hd - r); shape.quadraticCurveTo(hw, hd, hw - r, hd);
    shape.lineTo(-hw + r, hd); shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
    shape.lineTo(-hw, -hd + r); shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
    var boardGeo = new THREE.ExtrudeGeometry(shape, { depth: BH, bevelEnabled: false, curveSegments: 6 });
    boardGeo.rotateX(-Math.PI / 2);
    boardGeo.translate(0, -BH / 2, 0);
    var board = new THREE.Mesh(boardGeo, new THREE.MeshStandardMaterial({
      color: 0x141210, roughness: 0.88, metalness: 0.22,
      emissive: 0x1b0d05, emissiveIntensity: 0.35
    }));
    root.add(board);

    /* ===== CPU die: heat-spreader rim + emissive die + engraved top plate ===== */
    var spreader = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 1.8), new THREE.MeshStandardMaterial({
      color: 0x1c1815, roughness: 0.4, metalness: 0.6
    }));
    spreader.position.y = TOP + 0.05;
    root.add(spreader);

    var dieMat = new THREE.MeshStandardMaterial({
      color: 0x241108, roughness: 0.35, metalness: 0.45,
      emissive: 0xff5a2c, emissiveIntensity: 0.65
    });
    var die = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 1.5), dieMat);
    die.position.y = TOP + 0.08;
    root.add(die);

    var plate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 1.1), new THREE.MeshStandardMaterial({
      color: 0x17100a, roughness: 0.3, metalness: 0.7,
      emissive: 0xff5a2c, emissiveIntensity: 0.12
    }));
    plate.position.y = TOP + 0.16 + 0.015;
    root.add(plate);

    /* ===== circuit traces: Manhattan-routed polylines die -> board edge ===== */
    var MARGIN = 0.24, maxX = BW / 2 - MARGIN, maxZ = BD / 2 - MARGIN;
    var START = 1.02;                    // just outside the heat spreader
    var TRACE_Y = TOP + 0.012;

    function edgeDist(p, ax, sg) {
      if (ax === 'x') return sg > 0 ? maxX - p.x : p.x + maxX;
      return sg > 0 ? maxZ - p.z : p.z + maxZ;
    }
    function step(p, ax, sg, len) { if (ax === 'x') p.x += sg * len; else p.z += sg * len; }

    function makeTrace(side) {
      var p, ax, sg, off = rand(-0.75, 0.75);
      if (side === 0) { p = { x: START, z: off }; ax = 'x'; sg = 1; }
      else if (side === 1) { p = { x: -START, z: off }; ax = 'x'; sg = -1; }
      else if (side === 2) { p = { x: off, z: START }; ax = 'z'; sg = 1; }
      else { p = { x: off, z: -START }; ax = 'z'; sg = -1; }
      var sec = ax === 'x' ? 'z' : 'x';
      var ss = Math.random() < 0.5 ? 1 : -1;
      var pts = [{ x: p.x, z: p.z }];
      // leg 1: outward, partial
      step(p, ax, sg, edgeDist(p, ax, sg) * rand(0.25, 0.7));
      pts.push({ x: p.x, z: p.z });
      if (Math.random() < 0.55) {
        // two turns: sideways partial, then outward to the edge
        step(p, sec, ss, Math.min(edgeDist(p, sec, ss) * 0.75, rand(0.3, 1.3)));
        pts.push({ x: p.x, z: p.z });
        step(p, ax, sg, edgeDist(p, ax, sg));
        pts.push({ x: p.x, z: p.z });
      } else {
        // one turn: sideways all the way to the side edge
        step(p, sec, ss, edgeDist(p, sec, ss));
        pts.push({ x: p.x, z: p.z });
      }
      // precompute cumulative lengths for pulse travel
      var cum = [0], total = 0, i;
      for (i = 1; i < pts.length; i++) {
        total += Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].z - pts[i - 1].z);
        cum.push(total);
      }
      return { pts: pts, cum: cum, total: Math.max(total, 0.001) };
    }

    var NT = 30, traces = [], linePos = [], t, k;
    for (t = 0; t < NT; t++) {
      var tr = makeTrace(t % 4);
      traces.push(tr);
      for (k = 1; k < tr.pts.length; k++) {
        linePos.push(tr.pts[k - 1].x, TRACE_Y, tr.pts[k - 1].z);
        linePos.push(tr.pts[k].x, TRACE_Y, tr.pts[k].z);
      }
    }
    var lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePos), 3));
    root.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
      color: 0xff5a2c, transparent: true, opacity: 0.28
    })));

    /* ===== data pulses: additive points travelling along the traces ===== */
    function makeSprite() {
      var c = document.createElement('canvas'); c.width = c.height = 64;
      var ctx = c.getContext('2d'); if (!ctx) return null;
      var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.3, 'rgba(255,255,255,0.7)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    }

    var NP = 140, PULSE_Y = TOP + 0.05;
    var pPos = new Float32Array(NP * 3), pCol = new Float32Array(NP * 3), pulses = [];
    for (t = 0; t < NP; t++) {
      var mixv = Math.random();          // ember -> amber
      pCol[t * 3] = 1.0;
      pCol[t * 3 + 1] = 0.353 + mixv * (0.694 - 0.353);
      pCol[t * 3 + 2] = 0.173 + mixv * (0.353 - 0.173);
      pulses.push({ tr: t % NT, t: Math.random(), speed: rand(0.8, 2.2) });
    }
    var pulseGeo = new THREE.BufferGeometry();
    pulseGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pulseGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    var pulsePts = new THREE.Points(pulseGeo, new THREE.PointsMaterial({
      size: 8.5, sizeAttenuation: false, map: makeSprite(), vertexColors: true,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    pulsePts.frustumCulled = false;
    root.add(pulsePts);

    function stepPulses(dt) {
      for (var i = 0; i < NP; i++) {
        var p = pulses[i], tr = traces[p.tr];
        p.t += p.speed * dt / tr.total;
        if (p.t >= 1) { p.t = 0; p.speed = rand(0.8, 2.2); }
        var d = p.t * tr.total, s = 0;
        while (s < tr.cum.length - 2 && tr.cum[s + 1] < d) s++;
        var f = (d - tr.cum[s]) / (tr.cum[s + 1] - tr.cum[s] || 1);
        var a = tr.pts[s], b = tr.pts[s + 1];
        pPos[i * 3] = a.x + (b.x - a.x) * f;
        pPos[i * 3 + 1] = PULSE_Y;
        pPos[i * 3 + 2] = a.z + (b.z - a.z) * f;
      }
      pulseGeo.attributes.position.needsUpdate = true;
    }

    /* ===== small components (capacitors / chips) scattered on the board ===== */
    var compGeo = new THREE.BoxGeometry(1, 1, 1);
    var darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1613, roughness: 0.7, metalness: 0.35 });
    var amberMat = new THREE.MeshStandardMaterial({
      color: 0x241c12, roughness: 0.5, metalness: 0.4,
      emissive: 0xffb15a, emissiveIntensity: 0.4
    });
    for (t = 0; t < 18; t++) {
      var cx = 0, cz = 0, tries = 0;
      do { cx = rand(-maxX + 0.2, maxX - 0.2); cz = rand(-maxZ + 0.2, maxZ - 0.2); tries++; }
      while (Math.abs(cx) < 1.35 && Math.abs(cz) < 1.35 && tries < 20);
      var sy = rand(0.07, 0.17);
      var comp = new THREE.Mesh(compGeo, t % 5 === 0 ? amberMat : darkMat);
      comp.scale.set(rand(0.16, 0.46), sy, rand(0.12, 0.36));
      comp.position.set(cx, TOP + sy / 2, cz);
      if (Math.random() < 0.5) comp.rotation.y = Math.PI / 2;
      root.add(comp);
    }

    /* ===== lighting ===== */
    scene.add(new THREE.AmbientLight(0xfff2e2, 0.35));
    var sun = new THREE.DirectionalLight(0xffd9b0, 0.75);
    sun.position.set(3, 5, 2);
    scene.add(sun);
    var glow = new THREE.PointLight(0xff5a2c, 0.8, 6.5);
    glow.position.set(0, 1.5, 0);
    root.add(glow);                     // stays above the die while rotating

    /* ===== sizing (debounced, rect-based) ===== */
    var vw = 1, vh = 1, resizeT;
    function applySize() {
      var rect = canvas.getBoundingClientRect();
      vw = Math.max(1, rect.width); vh = Math.max(1, rect.height);
      renderer.setSize(vw, vh, false);
      camera.aspect = vw / vh; camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', function () {
      clearTimeout(resizeT); resizeT = setTimeout(applySize, 180);
    });
    applySize();

    /* ===== interaction: drag-rotate + inertia, hover parallax, idle spin ===== */
    var yaw = 0, pitch = 0.55, vel = 0, dragging = false, lastX = 0, lastY = 0;
    var tiltX = 0, tiltY = 0, tiltXT = 0, tiltYT = 0, releaseT = -10;
    var finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    canvas.style.touchAction = 'pan-y';  // keep vertical page scroll on touch; horizontal drag rotates
    canvas.style.cursor = 'grab';

    canvas.addEventListener('pointerdown', function (e) {
      dragging = true; lastX = e.clientX; lastY = e.clientY; vel = 0;
      canvas.style.cursor = 'grabbing';
      if (canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (err) {} }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (dragging) {
        var dx = e.clientX - lastX, dy = e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        yaw += dx * 0.006;
        pitch = clamp(pitch + dy * 0.006, -0.15, 0.95);
        vel = vel * 0.5 + dx * 0.006 * 0.5;   // smoothed velocity for inertia
      } else if (finePointer) {
        // offsetX/Y + cached size: no layout read per event
        tiltXT = ((e.offsetY / vh) * 2 - 1) * 0.1;
        tiltYT = ((e.offsetX / vw) * 2 - 1) * 0.14;
      }
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false; releaseT = time;
      canvas.style.cursor = 'grab';
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', function () { tiltXT = 0; tiltYT = 0; });

    /* ===== frame step ===== */
    var time = 0, intro = 0.7;          // intro scale eases toward 1
    function frame(dt) {
      time += dt;
      intro += (1 - intro) * 0.06;
      root.scale.setScalar(intro);
      if (!dragging) {
        yaw += vel; vel *= 0.94;
        if (Math.abs(vel) < 0.00003) vel = 0;
        if (time - releaseT > 2) yaw += 0.0016;   // idle auto-rotate
      }
      tiltX += (tiltXT - tiltX) * 0.04;
      tiltY += (tiltYT - tiltY) * 0.04;
      root.rotation.y = yaw + tiltY;
      root.rotation.x = pitch + tiltX;
      var pulse = Math.sin(time * 1.3) * 0.2;
      dieMat.emissiveIntensity = 0.65 + pulse;
      glow.intensity = 0.8 + pulse * 1.2;
      stepPulses(dt);
    }

    /* ===== run / pause (offscreen + hidden tab) ===== */
    var clock = new THREE.Clock(), running = false, onScreen = true;
    function maybeRun() { var go = onScreen && !document.hidden; if (go && !running) { running = true; clock.start(); loop(); } else if (!go) { running = false; } }
    document.addEventListener('visibilitychange', maybeRun);
    if ('IntersectionObserver' in window) { new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; maybeRun(); }, { threshold: 0.05 }).observe(canvas); }
    // paint a few initial frames so first paint isn't blank even before the loop starts
    for (var f = 0; f < 3; f++) { frame(1 / 60); renderer.render(scene, camera); }

    function loop() {
      if (!running) return;
      requestAnimationFrame(loop);
      frame(Math.min(clock.getDelta(), 0.05));
      renderer.render(scene, camera);
    }
    maybeRun();
  };
})();
