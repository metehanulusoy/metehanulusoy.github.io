/* =========================================================================
   blob.js — "particle globe" centerpiece for the feature section (needs THREE).
   Thousands of ember points on a noise-displaced sphere, slowly swirling,
   pointer-eased. DPR-capped, pauses when offscreen / tab hidden.
   window.initBlob(canvas)
   ========================================================================= */
window.initBlob = function (canvas) {
  if (typeof THREE === 'undefined' || !canvas) return;
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true }); }
  catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 4.2);

  var SNOISE = [
    'vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}',
    'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}',
    'float snoise(vec3 v){const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);',
    'vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);',
    'vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);',
    'vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+2.0*C.xxx;vec3 x3=x0-1.0+3.0*C.xxx;i=mod(i,289.0);',
    'vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));',
    'float n_=1.0/7.0;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);',
    'vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);',
    'vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));',
    'vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
    'vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);',
    'vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;',
    'vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;',
    'return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}'
  ].join('\n');

  // fibonacci sphere
  var N = 3400, R = 1.45, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (var i = 0; i < N; i++) {
    var y = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - y * y), th = i * 2.399963;
    pos[i * 3] = Math.cos(th) * rr * R; pos[i * 3 + 1] = y * R; pos[i * 3 + 2] = Math.sin(th) * rr * R;
    seed[i] = Math.random();
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

  var uni = { uTime: { value: 0 } };
  var vert = [SNOISE,
    'attribute float aSeed;uniform float uTime;varying float vG;',
    'void main(){vec3 p=position;float n=snoise(normalize(p)*1.6+uTime*0.35);p+=normalize(p)*n*0.2;vG=0.5+0.5*n;',
    'vec4 mv=modelViewMatrix*vec4(p,1.0);gl_PointSize=(2.8+aSeed*3.6);gl_Position=projectionMatrix*mv;}'
  ].join('\n');
  var frag = [
    'varying float vG;',
    'void main(){float d=distance(gl_PointCoord,vec2(0.5));if(d>0.5)discard;',
    'float a=smoothstep(0.5,0.05,d);vec3 c=mix(vec3(0.0,1.0,0.26),vec3(0.42,1.0,0.63),vG);',
    'gl_FragColor=vec4(c,a);}'
  ].join('\n');
  var globe = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: uni, vertexShader: vert, fragmentShader: frag,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  }));
  scene.add(globe);

  function resize() {
    var w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    globe.position.x = w > 900 ? 1.25 : 0;      // sit right of the text on wide screens
    globe.position.y = w > 900 ? 0 : 0.35;
  }
  window.addEventListener('resize', resize); resize();

  var targetRX = 0, targetRY = 0;
  window.addEventListener('mousemove', function (e) {
    targetRY = ((e.clientX / window.innerWidth) * 2 - 1) * 0.6;
    targetRX = ((e.clientY / window.innerHeight) * 2 - 1) * 0.35;
  }, { passive: true });

  var clock = new THREE.Clock(), running = false, onScreen = true, spinY = 0, eRX = 0, eRY = 0;
  function maybeRun() { var go = onScreen && !document.hidden; if (go && !running) { running = true; clock.start(); loop(); } else if (!go) { running = false; } }
  document.addEventListener('visibilitychange', maybeRun);
  if ('IntersectionObserver' in window) { new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; maybeRun(); }, { threshold: 0 }).observe(canvas); }
  // paint a couple of initial frames so first paint isn't blank even before the loop starts
  for (var f = 0; f < 3; f++) { uni.uTime.value += 0.1; renderer.render(scene, camera); }

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    var dt = clock.getDelta();
    uni.uTime.value += dt;
    spinY += dt * 0.18; eRX += (targetRX - eRX) * 0.05; eRY += (targetRY - eRY) * 0.05;
    globe.rotation.y = spinY + eRY; globe.rotation.x = eRX;
    renderer.render(scene, camera);
  }
  maybeRun();
};
