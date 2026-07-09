/* =========================================================================
   model3d.js — real downloaded GLB rendered on a TRANSPARENT canvas with
   matrix-green lighting. Just the model — no background, no chrome.
   Drag to rotate (OrbitControls), auto-spins, pauses offscreen / hidden.
   window.initModel3D(canvas, url). Needs THREE r128 + GLTFLoader + OrbitControls.
   ========================================================================= */
(function () {
  'use strict';

  window.initModel3D = function (canvas, url) {
    if (!window.THREE || !THREE.GLTFLoader || !canvas || !url) return;
    if (canvas.__m3d) return; canvas.__m3d = true;   // guard: one viewer per canvas

    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, preserveDrawingBuffer: true }); }
    catch (e) { return; }
    renderer.setClearColor(0x000000, 0);                 // transparent — dark frame shows through
    if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0.2, 0.9, 4.2);

    /* ===== matrix-green lighting rig ===== */
    scene.add(new THREE.AmbientLight(0x1f3a2a, 1.15));
    var key = new THREE.DirectionalLight(0x8fffb0, 2.3); key.position.set(3, 5, 4); scene.add(key);
    var rim = new THREE.DirectionalLight(0x00ff41, 1.7); rim.position.set(-4, 1.5, -3); scene.add(rim);
    var fill = new THREE.PointLight(0x39ff8f, 0.9, 22); fill.position.set(0, -3, 3.5); scene.add(fill);

    var group = new THREE.Group(); scene.add(group);

    /* ===== drag-to-rotate (no zoom, so page scroll still works) ===== */
    var controls = null;
    if (THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, canvas);
      controls.enableDamping = true; controls.dampingFactor = 0.08;
      controls.enablePan = false; controls.enableZoom = false;
      controls.autoRotate = true; controls.autoRotateSpeed = 1.2;
      controls.target.set(0, 0, 0);
    }
    canvas.style.touchAction = 'pan-y';       // keep vertical page scroll on touch
    canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', function () { canvas.style.cursor = 'grabbing'; });
    window.addEventListener('pointerup', function () { canvas.style.cursor = 'grab'; });

    /* ===== load the real model, center + fit ===== */
    new THREE.GLTFLoader().load(url, function (gltf) {
      var m = gltf.scene;
      var box = new THREE.Box3().setFromObject(m);
      var size = box.getSize(new THREE.Vector3());
      var center = box.getCenter(new THREE.Vector3());
      m.position.x -= center.x; m.position.y -= center.y; m.position.z -= center.z;
      var maxDim = Math.max(size.x, size.y, size.z) || 1;
      m.scale.setScalar(2.5 / maxDim);
      group.add(m);
      renderer.render(scene, camera);   // paint the model at least once even if currently paused/offscreen
      run();
    }, undefined, function () { /* load error → frame just stays dark, no crash */ });

    /* ===== sizing ===== */
    function resize() {
      var r = canvas.getBoundingClientRect();
      var w = Math.max(1, r.width), h = Math.max(1, r.height);
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 180); });
    resize();

    /* ===== run / pause — only pause on a hidden tab, render continuously while visible.
       A transparent canvas goes blank the instant the loop stops, so for one small model
       it's safer + cheaper to keep drawing than to gate on an offscreen observer (which
       left the frame empty). preserveDrawingBuffer also keeps the last frame painted. ===== */
    var raf = null;
    function frame() {
      if (document.hidden) { raf = null; return; }
      if (controls) controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }
    function run() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } } else run();
    });
    renderer.render(scene, camera);
    run();
  };
})();
