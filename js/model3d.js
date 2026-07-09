/* =========================================================================
   model3d.js — real downloaded GLB on a TRANSPARENT canvas. Just the model:
   no background, no frame, no chrome. Fills the stage (big), drag to rotate,
   auto-spins, studio env for realistic reflections + a green matrix rim.
   window.initModel3D(canvas, url). Needs THREE r128 + GLTFLoader + OrbitControls
   (+ RoomEnvironment for reflections, optional).
   ========================================================================= */
(function () {
  'use strict';

  window.initModel3D = function (canvas, url) {
    if (!window.THREE || !THREE.GLTFLoader || !canvas || !url) return;
    if (canvas.__m3d) return; canvas.__m3d = true;          // one viewer per canvas

    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, preserveDrawingBuffer: true }); }
    catch (e) { return; }
    renderer.setClearColor(0x000000, 0);                    // transparent — page bg shows through
    if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
    if ('toneMapping' in renderer) { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

    /* ===== lighting: soft studio env (real reflections) + green matrix rim ===== */
    if (THREE.RoomEnvironment && THREE.PMREMGenerator) {
      try { var pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture; } catch (e) {}
    }
    scene.add(new THREE.AmbientLight(0x2a3f34, 0.7));
    var key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(4, 6, 5); scene.add(key);
    var rim = new THREE.DirectionalLight(0x00ff5a, 2.1); rim.position.set(-5, 1.5, -4); scene.add(rim);
    var fill = new THREE.PointLight(0x66ffa0, 0.5, 26); fill.position.set(-2, -3, 3); scene.add(fill);

    var group = new THREE.Group(); scene.add(group);

    /* ===== drag-to-rotate (no zoom, so page scroll still works) ===== */
    var controls = null;
    if (THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, canvas);
      controls.enableDamping = true; controls.dampingFactor = 0.08;
      controls.enablePan = false; controls.enableZoom = false;
      controls.autoRotate = true; controls.autoRotateSpeed = 1.1;
      controls.target.set(0, 0, 0);
    }
    canvas.style.touchAction = 'pan-y';
    canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', function () { canvas.style.cursor = 'grabbing'; });
    window.addEventListener('pointerup', function () { canvas.style.cursor = 'grab'; });

    /* ===== load the real model, center + FILL the frame (big) ===== */
    new THREE.GLTFLoader().load(url, function (gltf) {
      var m = gltf.scene;
      var box = new THREE.Box3().setFromObject(m);
      var size = box.getSize(new THREE.Vector3());
      var center = box.getCenter(new THREE.Vector3());
      m.position.x -= center.x; m.position.y -= center.y; m.position.z -= center.z;
      group.add(m);
      // frame the camera to the model's bounding sphere with tight padding -> big
      var radius = size.length() / 2;
      var fov = camera.fov * Math.PI / 180;
      var dist = (radius / Math.sin(fov / 2)) * 0.92;       // <1 = fills more of the frame
      camera.position.set(dist * 0.15, dist * 0.5, dist * 0.86);
      camera.near = dist / 50; camera.far = dist * 8; camera.updateProjectionMatrix();
      if (controls) { controls.minDistance = dist * 0.6; controls.maxDistance = dist * 1.4; controls.update(); }
      renderer.render(scene, camera);
      run();
    }, undefined, function () { /* load error -> stays empty, no crash */ });

    /* ===== sizing ===== */
    function resize() {
      var r = canvas.getBoundingClientRect();
      var w = Math.max(1, r.width), h = Math.max(1, r.height);
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 180); });
    resize();

    /* ===== run / pause — render continuously while visible so the transparent
       canvas never goes blank; pause only on a hidden tab ===== */
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
