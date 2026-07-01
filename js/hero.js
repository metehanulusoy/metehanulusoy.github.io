/* =========================================================================
   hero.js — "Molten" WebGL hero (lazy-loaded; needs THREE global)
   Full-screen GLSL FBM flow, warm molten palette, coupled to Lenis scroll
   velocity (uVelocity) and pointer (uMouse). DPR-capped, pauses when hidden.
   ========================================================================= */
window.initHero = function (canvas) {
  if (typeof THREE === 'undefined' || !canvas) return;

  var PAL = {
    dark: {
      bg: new THREE.Color('#0b0a09'), deep: new THREE.Color('#3a1206'),
      hot: new THREE.Color('#ff5a2c'), amber: new THREE.Color('#ffb15a'), heat: 1.0
    },
    light: {
      bg: new THREE.Color('#f4efe6'), deep: new THREE.Color('#e7c39a'),
      hot: new THREE.Color('#e8431a'), amber: new THREE.Color('#ff9a3c'), heat: 0.62
    }
  };
  var theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  var P = PAL[theme];

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  var scene = new THREE.Scene();
  var cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  var u = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0.75, 0.85) },
    uVelocity: { value: 0 },
    uBg: { value: P.bg.clone() },
    uDeep: { value: P.deep.clone() },
    uHot: { value: P.hot.clone() },
    uAmber: { value: P.amber.clone() },
    uHeat: { value: P.heat }
  };

  var vert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

  var frag = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform float uTime, uVelocity, uHeat;',
    'uniform vec2 uRes, uMouse;',
    'uniform vec3 uBg, uDeep, uHot, uAmber;',
    'vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}',
    'float snoise(vec2 v){',
    '  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);',
    '  vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);',
    '  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);',
    '  vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);',
    '  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));',
    '  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);m=m*m;m=m*m;',
    '  vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;',
    '  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);',
    '  vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.0*dot(m,g);',
    '}',
    'float fbm(vec2 p){float s=0.0,a=0.5,f=1.0;for(int i=0;i<5;i++){s+=a*snoise(p*f);f*=2.0;a*=0.5;}return s;}',
    'void main(){',
    '  vec2 uv=vUv; float aspect=uRes.x/uRes.y;',
    '  vec2 p=uv; p.x*=aspect;',
    '  float t=uTime*(0.045+abs(uVelocity)*0.35);',       // scroll velocity speeds the flow
    '  p.x += uVelocity*0.12;',                            // and smears it sideways
    '  vec2 q=vec2(fbm(p+vec2(0.0,t)), fbm(p+vec2(5.2,1.3)-t*0.6));',
    '  vec2 r=vec2(fbm(p+1.7*q+vec2(1.7,9.2)+0.15*t), fbm(p+1.7*q+vec2(8.3,2.8)-0.12*t));',
    '  float n=fbm(p+1.5*r);',
    '  float f=clamp(n*0.5+0.5,0.0,1.0);',
    // heat concentrated toward top-right so bottom-left text stays dark
    '  float mask=smoothstep(0.15,1.05,uv.x)*smoothstep(0.05,0.95,uv.y);',
    '  float heat=pow(f,1.6)*mask*uHeat;',
    // molten ramp: bg -> deep ember -> hot -> amber veins
    '  vec3 col=mix(uBg,uDeep,smoothstep(0.15,0.65,heat));',
    '  col=mix(col,uHot,smoothstep(0.5,0.9,heat));',
    '  float veins=smoothstep(0.62,0.98,abs(r.x))*mask;',
    '  col=mix(col,uAmber,veins*0.5*uHeat);',
    // pointer glow
    '  vec2 m=uMouse; m.x*=aspect; float d=distance(p,m);',
    '  col+=uHot*smoothstep(0.7,0.0,d)*0.10*uHeat;',
    // darken bottom for legibility + vignette
    '  col*=mix(0.78,1.0,smoothstep(0.0,0.55,uv.y));',
    '  float vig=smoothstep(1.35,0.25,distance(uv,vec2(0.5)));col*=mix(0.85,1.0,vig);',
    '  gl_FragColor=vec4(col,1.0);',
    '}'
  ].join('\n');

  var mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: u, vertexShader: vert, fragmentShader: frag }));
  scene.add(mesh);

  /* ---- floating ember particle field (GPU Points, additive) ---- */
  var COUNT = 140;
  var pos = new Float32Array(COUNT * 3), seed = new Float32Array(COUNT);
  for (var i = 0; i < COUNT; i++) {
    pos[i * 3] = Math.random() * 2 - 1; pos[i * 3 + 1] = Math.random() * 2 - 1; pos[i * 3 + 2] = 0;
    seed[i] = Math.random();
  }
  var pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pgeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  var pmat = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: [
      'attribute float aSeed; varying float vA;',
      'uniform float uTime, uVelocity; uniform vec2 uRes, uMouse;',
      'void main(){',
      '  float aspect=uRes.x/uRes.y; vec3 p=position;',
      '  float sp=0.03+aSeed*0.07;',
      '  p.y=mod(p.y+uTime*sp+1.0,2.0)-1.0;',
      '  p.x+=sin(uTime*0.3+aSeed*31.0)*0.03;',
      '  vec2 m=vec2(uMouse.x*2.0-1.0,uMouse.y*2.0-1.0);',
      '  float d=distance(p.xy*vec2(aspect,1.0),m*vec2(aspect,1.0));',
      '  p.xy+=normalize(p.xy-m+0.0001)*smoothstep(0.4,0.0,d)*0.05;',
      '  vA=(0.25+0.75*aSeed)*smoothstep(-0.35,0.85,p.x)*smoothstep(1.0,-0.2,p.y);',   // brighter top-right, fade left/bottom
      '  gl_Position=vec4(p.xy,0.0,1.0);',
      '  gl_PointSize=(1.0+aSeed*3.5)*(1.0+abs(uVelocity)*0.6)*(uRes.y/900.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'precision mediump float; varying float vA;',
      'uniform vec3 uHot, uAmber; uniform float uHeat;',
      'void main(){',
      '  float d=distance(gl_PointCoord,vec2(0.5));',
      '  float a=smoothstep(0.5,0.0,d);',
      '  vec3 c=mix(uHot,uAmber,vA);',
      '  gl_FragColor=vec4(c, a*vA*0.55*uHeat);',
      '}'
    ].join('\n')
  });
  scene.add(new THREE.Points(pgeo, pmat));

  function resize() { var w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight; renderer.setSize(w, h, false); u.uRes.value.set(w, h); }
  addEventListener('resize', resize); resize();

  var tmx = 0.75, tmy = 0.85;
  addEventListener('mousemove', function (e) { tmx = e.clientX / innerWidth; tmy = 1.0 - e.clientY / innerHeight; }, { passive: true });

  window.__heroTheme = function (next) {
    var np = PAL[next] || PAL.dark;
    if (window.gsap) {
      gsap.to(u.uBg.value, { r: np.bg.r, g: np.bg.g, b: np.bg.b, duration: 0.8 });
      gsap.to(u.uDeep.value, { r: np.deep.r, g: np.deep.g, b: np.deep.b, duration: 0.8 });
      gsap.to(u.uHot.value, { r: np.hot.r, g: np.hot.g, b: np.hot.b, duration: 0.8 });
      gsap.to(u.uAmber.value, { r: np.amber.r, g: np.amber.g, b: np.amber.b, duration: 0.8 });
      gsap.to(u.uHeat, { value: np.heat, duration: 0.8 });
    } else { u.uBg.value.copy(np.bg); u.uDeep.value.copy(np.deep); u.uHot.value.copy(np.hot); u.uAmber.value.copy(np.amber); u.uHeat.value = np.heat; }
  };

  var clock = new THREE.Clock(), running = false, onScreen = true, vel = 0;
  function maybeRun() { var go = onScreen && !document.hidden; if (go && !running) { running = true; clock.start(); loop(); } else if (!go) { running = false; } }
  document.addEventListener('visibilitychange', maybeRun);
  if ('IntersectionObserver' in window) { new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; maybeRun(); }, { threshold: 0 }).observe(canvas); }

  function loop() {
    if (!running) return;
    u.uTime.value = clock.getElapsedTime();
    // scroll-velocity coupling from Lenis (fallback: 0)
    var lv = (window.__lenis && window.__lenis.velocity) ? window.__lenis.velocity : 0;
    vel += (Math.max(-3, Math.min(3, lv * 0.04)) - vel) * 0.08;
    u.uVelocity.value = vel;
    u.uMouse.value.x += (tmx - u.uMouse.value.x) * 0.045;
    u.uMouse.value.y += (tmy - u.uMouse.value.y) * 0.045;
    renderer.render(scene, cam);
    requestAnimationFrame(loop);
  }
  maybeRun();
};
