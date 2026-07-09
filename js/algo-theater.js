/* =========================================================================
   algo-theater.js — cycling algorithm-visualizer "player" panel (canvas 2D).
   Three scenes — quicksort replay, A* pathfinding, neural-net forward pass —
   auto-advance every ~11s with a crossfade; tabs jump instantly.
   DPR-capped (2), pauses when offscreen / tab hidden, debounced resize.
   window.initAlgoTheater(root)
   ========================================================================= */
(function () {
  'use strict';

  window.initAlgoTheater = function (root) {
    if (!root || root.__atInit) return;
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    root.__atInit = true;

    var W = 0, H = 0;

    /* ===== dom ===== */
    function el(cls, tag) { var d = document.createElement(tag || 'div'); d.className = cls; return d; }

    root.innerHTML = '';
    var top = el('at-top'), tabs = el('at-tabs'), live = el('at-live');
    var screen = el('at-screen'), hud = el('at-hud'), bar = el('at-bar'), fillEl = el('at-bar-fill');
    var NAMES = ['QUICKSORT', 'A* PATHFIND', 'NEURAL NET'];
    var btns = [];
    for (var b = 0; b < NAMES.length; b++) {
      (function (i) {
        var bt = document.createElement('button');
        bt.type = 'button'; bt.className = 'at-tab'; bt.textContent = NAMES[i];
        bt.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
        bt.addEventListener('click', function () { select(i); });
        tabs.appendChild(bt); btns.push(bt);
      })(b);
    }
    tabs.setAttribute('role', 'group');
    tabs.setAttribute('aria-label', 'Algorithm scene');
    live.innerHTML = '<span class="at-live-dot"></span><span>LIVE</span>';
    var PLAY_SVG = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1l8 5-8 5z" fill="currentColor"/></svg>';
    var PAUSE_SVG = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="1.5" width="3" height="9" fill="currentColor"/><rect x="7" y="1.5" width="3" height="9" fill="currentColor"/></svg>';
    var playBtn = document.createElement('button');
    playBtn.type = 'button'; playBtn.className = 'at-play'; playBtn.innerHTML = PAUSE_SVG;
    playBtn.setAttribute('aria-label', 'Pause the visualization');
    var right = el('at-right');
    right.appendChild(playBtn); right.appendChild(live);
    canvas.className = 'at-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    screen.setAttribute('role', 'img');
    screen.setAttribute('aria-label', 'Animated algorithm visualization');
    top.appendChild(tabs); top.appendChild(right);
    screen.appendChild(canvas); screen.appendChild(hud);
    bar.appendChild(fillEl);
    root.appendChild(top); root.appendChild(screen); root.appendChild(bar);

    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);   // 2D cap
      W = screen.clientWidth || 1; H = screen.clientHeight || 1;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* ===== scene 1 · quicksort replay ===== */
    // run quicksort once up front, record cmp/swap/done events, replay them
    function makeQuicksort() {
      var N = 48;
      var vals = [], disp = [], done = [];
      var events = [], evI = 0, evAcc = 0, rate = 26;
      var cmpA = -1, cmpB = -1, swpA = -1, swpB = -1;
      var phase = 0, phaseT = 0;                 // 0 = replay · 1 = shimmer

      function build() {
        var i, j, t;
        vals.length = 0; disp.length = 0; done.length = 0; events.length = 0;
        for (i = 0; i < N; i++) vals.push(0.08 + 0.92 * (i / (N - 1)));
        for (i = N - 1; i > 0; i--) { j = (Math.random() * (i + 1)) | 0; t = vals[i]; vals[i] = vals[j]; vals[j] = t; }
        for (i = 0; i < N; i++) { disp.push(vals[i]); done.push(false); }
        var a = vals.slice();
        function swap(x, y) { var s = a[x]; a[x] = a[y]; a[y] = s; events.push([1, x, y]); }
        function qs(lo, hi) {
          if (lo > hi) return;
          if (lo === hi) { events.push([2, lo, lo]); return; }
          var p = a[hi], k = lo, x;
          for (x = lo; x < hi; x++) {
            events.push([0, x, hi]);             // compare against pivot
            if (a[x] < p) { if (x !== k) swap(x, k); k++; }
          }
          if (k !== hi) swap(k, hi);
          events.push([2, k, k]);                // pivot finalized
          qs(lo, k - 1); qs(k + 1, hi);
        }
        qs(0, N - 1);
        rate = Math.max(26, events.length / 9);  // ~26 ev/s, but finish inside a slot
        evI = 0; evAcc = 0; phase = 0; phaseT = 0;
        cmpA = cmpB = swpA = swpB = -1;
      }

      return {
        label: 'quicksort · O(n log n) · ' + N + ' elements',
        enter: build,
        step: function (dt) {
          var i, t, e;
          if (phase === 0) {
            evAcc += dt * rate;
            while (evAcc >= 1 && evI < events.length) {
              evAcc -= 1;
              e = events[evI++];
              if (e[0] === 0) { cmpA = e[1]; cmpB = e[2]; swpA = swpB = -1; }
              else if (e[0] === 1) { t = vals[e[1]]; vals[e[1]] = vals[e[2]]; vals[e[2]] = t; swpA = e[1]; swpB = e[2]; }
              else done[e[1]] = true;
            }
            if (evI >= events.length) {
              phase = 1; phaseT = 0; cmpA = cmpB = swpA = swpB = -1;
              for (i = 0; i < N; i++) done[i] = true;
            }
          } else {
            phaseT += dt;
            if (phaseT > 1.8) build();           // shimmer over → reshuffle, replay
          }
          var k = 1 - Math.exp(-dt * 15);        // quick height lerp on swaps
          for (i = 0; i < N; i++) disp[i] += (vals[i] - disp[i]) * k;
        },
        draw: function (ctx, W, H) {
          var padX = W * 0.055, padT = H * 0.12, padB = H * 0.16;
          var span = W - padX * 2, area = H - padT - padB;
          var bw = span / N, gap = Math.min(3, bw * 0.28), w = Math.max(1, bw - gap);
          var sweep = phase === 1 ? (phaseT / 1.1) * (N + 10) - 5 : -99;
          for (var i = 0; i < N; i++) {
            var h = disp[i] * area;
            var x = padX + i * bw, y = H - padB - h, c;
            if (i === swpA || i === swpB) c = 'rgba(255,90,44,1)';
            else if (i === cmpA || i === cmpB) c = 'rgba(255,177,90,1)';
            else if (done[i]) {
              var m = vals[i];                   // deep ember → amber by value
              c = 'rgba(' + Math.round(232 + 23 * m) + ',' + Math.round(67 + 110 * m) + ',' + Math.round(26 + 64 * m) + ',0.85)';
            } else c = 'rgba(243,238,230,0.22)';
            ctx.fillStyle = c;
            ctx.fillRect(x, y, w, h);
            if (phase === 1) {
              var d = Math.abs(i - sweep);
              if (d < 5) { ctx.fillStyle = 'rgba(255,177,90,' + (0.5 * (1 - d / 5)).toFixed(3) + ')'; ctx.fillRect(x, y, w, h); }
            }
          }
          ctx.fillStyle = 'rgba(243,238,230,0.12)';
          ctx.fillRect(padX, H - padB, span, 1); // baseline hairline
        }
      };
    }

    /* ===== scene 2 · a* pathfinding replay ===== */
    // solve once (regenerate walls until solvable), then replay the expansion
    function makeAstar() {
      var CO = 30, RO = 17;
      var walls = null, state = null;
      var order = [], adds = [], path = [];
      var evI = 0, evAcc = 0, speed = 60, cur = -1;
      var phase = 0, traceI = 0, trAcc = 0, holdT = 0;  // 0 search · 1 trace · 2 hold
      var start = 0, goal = 0;

      function idx(c, r) { return r * CO + c; }
      function hCost(i) {
        var c = i % CO, r = (i / CO) | 0, gc = goal % CO, gr = (goal / CO) | 0;
        return (Math.abs(c - gc) + Math.abs(r - gr)) * 1.001;
      }
      function solve() {
        var n = CO * RO, i;
        var g = new Float32Array(n), from = new Int32Array(n), st = new Uint8Array(n);
        for (i = 0; i < n; i++) { g[i] = 1e9; from[i] = -1; }
        var open = [start];
        g[start] = 0; st[start] = 1;
        order.length = 0; adds.length = 0; path.length = 0;
        while (open.length) {
          var bi = 0, bf = g[open[0]] + hCost(open[0]), ff;
          for (i = 1; i < open.length; i++) { ff = g[open[i]] + hCost(open[i]); if (ff < bf) { bf = ff; bi = i; } }
          var u = open[bi];
          open[bi] = open[open.length - 1]; open.pop();
          st[u] = 2;
          var newly = [];
          order.push(u); adds.push(newly);
          if (u === goal) {
            var p = goal;
            while (p !== -1) { path.push(p); p = from[p]; }
            path.reverse();
            return true;
          }
          var c = u % CO, r = (u / CO) | 0;
          for (var d = 0; d < 4; d++) {
            var nc = c + (d === 0 ? 1 : d === 1 ? -1 : 0);
            var nr = r + (d === 2 ? 1 : d === 3 ? -1 : 0);
            if (nc < 0 || nr < 0 || nc >= CO || nr >= RO) continue;
            var v = idx(nc, nr);
            if (walls[v] || st[v] === 2) continue;
            var ng = g[u] + 1;
            if (ng < g[v]) {
              g[v] = ng; from[v] = u;
              if (st[v] !== 1) { st[v] = 1; open.push(v); newly.push(v); }
            }
          }
        }
        return false;                            // walled in — caller regenerates
      }
      function build() {
        CO = W < 560 ? 22 : 30; RO = 17;
        var density = 0.28, tries = 0, i;
        do {
          walls = new Uint8Array(CO * RO);
          for (i = 0; i < walls.length; i++) walls[i] = Math.random() < density ? 1 : 0;
          start = idx(1, 1 + ((Math.random() * (RO - 2)) | 0));
          goal = idx(CO - 2, 1 + ((Math.random() * (RO - 2)) | 0));
          walls[start] = 0; walls[goal] = 0;
          tries++;
          if (tries % 12 === 0) density -= 0.05; // ease off if unlucky
        } while (!solve() && density > 0.02);
        state = new Uint8Array(CO * RO);         // 0 free · 1 frontier · 2 closed · 3 path
        evI = 0; evAcc = 0; cur = -1; phase = 0; traceI = 0; trAcc = 0; holdT = 0;
        speed = Math.min(170, Math.max(36, order.length / 5));
        api.label = 'a* pathfind · f = g + h · ' + CO + '×' + RO + ' grid';
      }

      var api = {
        label: '',
        enter: build,
        step: function (dt) {
          if (phase === 0) {
            evAcc += dt * speed;
            while (evAcc >= 1 && evI < order.length) {
              evAcc -= 1;
              cur = order[evI];
              state[cur] = 2;
              var nl = adds[evI];
              for (var i = 0; i < nl.length; i++) if (state[nl[i]] === 0) state[nl[i]] = 1;
              evI++;
            }
            if (evI >= order.length) { phase = 1; traceI = 0; trAcc = 0; }
          } else if (phase === 1) {
            trAcc += dt * 26;
            while (trAcc >= 1 && traceI < path.length) { trAcc -= 1; state[path[traceI]] = 3; traceI++; }
            if (traceI >= path.length) { phase = 2; holdT = 0; }
          } else {
            holdT += dt;
            if (holdT > 1.5) build();            // hold, then a fresh maze
          }
        },
        draw: function (ctx, W, H) {
          var padX = W * 0.05, padT = H * 0.08, padB = H * 0.12;
          var cs = Math.min((W - padX * 2) / CO, (H - padT - padB) / RO);
          var ox = (W - cs * CO) / 2, oy = padT + (H - padT - padB - cs * RO) / 2;
          var i, c, r, x, y;
          for (i = 0; i < CO * RO; i++) {
            c = i % CO; r = (i / CO) | 0;
            x = ox + c * cs; y = oy + r * cs;
            if (walls[i]) { ctx.fillStyle = 'rgba(243,238,230,0.09)'; ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2); continue; }
            var s = state[i];
            if (s === 0) continue;
            if (s === 1) ctx.fillStyle = 'rgba(255,90,44,0.35)';        // frontier
            else if (s === 2) ctx.fillStyle = 'rgba(255,90,44,0.14)';   // closed
            else ctx.fillStyle = 'rgba(255,90,44,0.92)';                // path
            ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
          }
          if (phase === 0 && cur >= 0) {                                // current cell glow
            c = cur % CO; r = (cur / CO) | 0;
            x = ox + c * cs + cs / 2; y = oy + r * cs + cs / 2;
            var g1 = ctx.createRadialGradient(x, y, 0, x, y, cs * 1.6);
            g1.addColorStop(0, 'rgba(255,177,90,0.55)');
            g1.addColorStop(1, 'rgba(255,177,90,0)');
            ctx.fillStyle = g1;
            ctx.fillRect(x - cs * 1.6, y - cs * 1.6, cs * 3.2, cs * 3.2);
          }
          if (phase >= 1 && path.length) {                              // moving head dot
            var hI = path[Math.min(traceI, path.length - 1)];
            c = hI % CO; r = (hI / CO) | 0;
            x = ox + c * cs + cs / 2; y = oy + r * cs + cs / 2;
            var g2 = ctx.createRadialGradient(x, y, 0, x, y, cs * 1.4);
            g2.addColorStop(0, 'rgba(255,177,90,0.7)');
            g2.addColorStop(1, 'rgba(255,177,90,0)');
            ctx.fillStyle = g2;
            ctx.fillRect(x - cs * 1.4, y - cs * 1.4, cs * 2.8, cs * 2.8);
            ctx.fillStyle = 'rgba(255,240,220,0.95)';
            ctx.beginPath(); ctx.arc(x, y, Math.max(2, cs * 0.22), 0, 6.2832); ctx.fill();
          }
          c = start % CO; r = (start / CO) | 0;                         // start: hollow square
          ctx.strokeStyle = 'rgba(255,177,90,0.95)';
          ctx.lineWidth = 2;
          ctx.strokeRect(ox + c * cs + 2.5, oy + r * cs + 2.5, cs - 5, cs - 5);
          c = goal % CO; r = (goal / CO) | 0;                           // goal: filled diamond
          x = ox + c * cs + cs / 2; y = oy + r * cs + cs / 2;
          var dR = cs * 0.38;
          ctx.fillStyle = 'rgba(255,177,90,0.95)';
          ctx.beginPath();
          ctx.moveTo(x, y - dR); ctx.lineTo(x + dR, y); ctx.lineTo(x, y + dR); ctx.lineTo(x - dR, y);
          ctx.closePath(); ctx.fill();
        }
      };
      return api;
    }

    /* ===== scene 3 · neural net forward pass ===== */
    // layers [5,8,8,3]; pulse waves ride the edges every ~1.6s, nodes flash on arrival
    function makeNet() {
      var LAYERS = [5, 8, 8, 3];
      var nx = [], ny = [], nl = [], nR = [], brPh = [], lStart = [];
      var edges = [];                            // [from, to, transition, stagger]
      var flash = null, waves = [], rings = [];
      var waveT = 0, tm = 0;
      var HOP = 0.45, TRAVEL = 0.38, PERIOD = 1.6;
      var LIFE = (LAYERS.length - 2) * HOP + 0.12 + TRAVEL;

      function build() {
        var i, l, a2, b2;
        nx.length = ny.length = nl.length = nR.length = brPh.length = 0;
        edges.length = 0; lStart.length = 0; waves.length = 0; rings.length = 0;
        var padX = W * 0.14, padT = H * 0.14, padB = H * 0.18;
        var cy = padT + (H - padT - padB) / 2;
        var vs = (H - padT - padB) / 8;          // spacing from the widest layer
        var count = 0;
        for (l = 0; l < LAYERS.length; l++) {
          lStart.push(count);
          var n = LAYERS[l];
          var x = padX + (W - padX * 2) * (l / (LAYERS.length - 1));
          for (i = 0; i < n; i++) {
            nx.push(x);
            ny.push(cy + (i - (n - 1) / 2) * vs);
            nl.push(l);
            nR.push(l === LAYERS.length - 1 ? 6 : 4.5);
            brPh.push(Math.random() * 6.2832);
          }
          count += n;
        }
        flash = new Float32Array(count);
        for (l = 0; l < LAYERS.length - 1; l++)
          for (a2 = 0; a2 < LAYERS[l]; a2++)
            for (b2 = 0; b2 < LAYERS[l + 1]; b2++)
              edges.push([lStart[l] + a2, lStart[l + 1] + b2, l, Math.random() * 0.12]);
        waveT = PERIOD;                          // fire the first wave immediately
      }

      return {
        label: 'neural net · [5,8,8,3] · forward pass',
        enter: build,
        step: function (dt) {
          var i, e;
          tm += dt;
          waveT += dt;
          if (waveT >= PERIOD) {
            waveT = 0;
            var out0 = lStart[LAYERS.length - 1];
            waves.push({ t: 0, arg: out0 + ((Math.random() * LAYERS[LAYERS.length - 1]) | 0) });
            for (i = 0; i < LAYERS[0]; i++)      // input layer fires at wave start
              if (flash[i] < 0.9) flash[i] = 0.9;
          }
          for (var wI = waves.length - 1; wI >= 0; wI--) {
            var wv = waves[wI];
            var t0 = wv.t; wv.t += dt; var t1 = wv.t;
            for (i = 0; i < edges.length; i++) {
              e = edges[i];
              var at = e[2] * HOP + e[3] + TRAVEL;
              if (t0 < at && t1 >= at) {         // pulse arrival → flash target
                var tgt = e[1];
                var isOut = nl[tgt] === LAYERS.length - 1;
                var amt = isOut ? (tgt === wv.arg ? 1.6 : 0.5) : 1;
                if (flash[tgt] < amt) flash[tgt] = amt;
                if (isOut && tgt === wv.arg) rings.push({ x: nx[tgt], y: ny[tgt], t: 0 });
              }
            }
            if (t1 > LIFE + 0.25) waves.splice(wI, 1);
          }
          for (i = 0; i < flash.length; i++) flash[i] *= Math.exp(-dt * 3.2);
          for (i = rings.length - 1; i >= 0; i--) { rings[i].t += dt; if (rings[i].t > 0.9) rings.splice(i, 1); }
        },
        draw: function (ctx, W, H) {
          var i, e;
          ctx.strokeStyle = 'rgba(243,238,230,0.08)';   // edge web
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (i = 0; i < edges.length; i++) {
            e = edges[i];
            ctx.moveTo(nx[e[0]], ny[e[0]]);
            ctx.lineTo(nx[e[1]], ny[e[1]]);
          }
          ctx.stroke();
          for (var wI = 0; wI < waves.length; wI++) {   // travelling pulses
            var wt = waves[wI].t;
            for (i = 0; i < edges.length; i++) {
              e = edges[i];
              var p = (wt - e[2] * HOP - e[3]) / TRAVEL;
              if (p <= 0 || p >= 1) continue;
              var px = nx[e[0]] + (nx[e[1]] - nx[e[0]]) * p;
              var py = ny[e[0]] + (ny[e[1]] - ny[e[0]]) * p;
              var a = Math.sin(p * 3.1416);
              ctx.fillStyle = 'rgba(255,177,90,' + (0.18 * a).toFixed(3) + ')';
              ctx.beginPath(); ctx.arc(px, py, 4.5, 0, 6.2832); ctx.fill();
              ctx.fillStyle = 'rgba(255,177,90,' + (0.9 * a).toFixed(3) + ')';
              ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 6.2832); ctx.fill();
            }
          }
          for (i = 0; i < nx.length; i++) {             // nodes: breathing + flash pop
            var f = flash[i];
            var br = 0.5 + 0.5 * Math.sin(tm * 1.4 + brPh[i]);
            var r = nR[i] + Math.min(f, 1.6) * 2.4;
            ctx.fillStyle = 'rgba(255,90,44,' + (0.05 + 0.06 * br + 0.3 * Math.min(f, 1)).toFixed(3) + ')';
            ctx.beginPath(); ctx.arc(nx[i], ny[i], r + 7, 0, 6.2832); ctx.fill();
            if (f > 0.9) ctx.fillStyle = 'rgba(255,90,44,' + Math.min(1, f * 0.8).toFixed(3) + ')';
            else ctx.fillStyle = 'rgba(255,177,90,' + (0.15 + 0.45 * Math.min(f, 1)).toFixed(3) + ')';
            ctx.beginPath(); ctx.arc(nx[i], ny[i], r, 0, 6.2832); ctx.fill();
            ctx.strokeStyle = 'rgba(243,238,230,0.28)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(nx[i], ny[i], r, 0, 6.2832); ctx.stroke();
          }
          for (i = 0; i < rings.length; i++) {          // argmax ring burst
            var rg = rings[i], k = rg.t / 0.9;
            ctx.strokeStyle = 'rgba(255,90,44,' + (0.85 * (1 - k)).toFixed(3) + ')';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(rg.x, rg.y, 8 + k * 26, 0, 6.2832); ctx.stroke();
          }
        }
      };
    }

    /* ===== player: crossfade + auto-advance + tabs ===== */
    var SLOT = 11, FADE = 0.35;
    var scenes = [makeQuicksort(), makeAstar(), makeNet()];
    var cur = 0, prev = -1, fadeT = 0, slotT = 0;

    function setTabs() {
      for (var i = 0; i < btns.length; i++)
        btns[i].setAttribute('aria-pressed', i === cur ? 'true' : 'false');
    }
    function activate(n, xfade) {
      if (xfade && n !== cur) { prev = cur; fadeT = 0; }
      else prev = -1;
      cur = n; slotT = 0;
      scenes[cur].enter();
      hud.textContent = scenes[cur].label;
      setTabs();
    }
    function select(n) { activate(n, true); maybeRun(); }

    function frame(dt) {
      slotT += dt;
      if (slotT >= SLOT) activate((cur + 1) % scenes.length, true);
      scenes[cur].step(dt);
      ctx.clearRect(0, 0, W, H);
      if (prev >= 0) {
        fadeT += dt;
        var k = Math.min(1, fadeT / FADE);
        scenes[prev].step(dt);
        ctx.globalAlpha = 1 - k;                 // scenes only use rgba fills,
        scenes[prev].draw(ctx, W, H);            // so globalAlpha composes cleanly
        ctx.globalAlpha = k;
        scenes[cur].draw(ctx, W, H);
        ctx.globalAlpha = 1;
        if (k >= 1) prev = -1;
      } else {
        scenes[cur].draw(ctx, W, H);
      }
      fillEl.style.transform = 'scaleX(' + Math.min(1, slotT / SLOT).toFixed(4) + ')';
    }

    /* ===== run/pause + resize ===== */
    var running = false, onScreen = true, userPlay = true, last = 0;
    function loop() {
      if (!running) return;
      requestAnimationFrame(loop);
      var now = performance.now();
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      frame(dt);
    }
    function maybeRun() {
      var go = onScreen && !document.hidden && userPlay;
      if (go && !running) { running = true; last = performance.now(); loop(); }
      else if (!go) running = false;
    }
    document.addEventListener('visibilitychange', maybeRun);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; maybeRun(); }, { threshold: 0.05 }).observe(root);
    }
    playBtn.addEventListener('click', function () {                 // WCAG 2.2.2 — let the visitor stop the motion
      userPlay = !userPlay;
      playBtn.innerHTML = userPlay ? PAUSE_SVG : PLAY_SVG;
      playBtn.setAttribute('aria-label', userPlay ? 'Pause the visualization' : 'Play the visualization');
      maybeRun();
    });

    var rzTimer = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rzTimer);
      rzTimer = setTimeout(function () {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var nw = Math.round((screen.clientWidth || 1) * dpr), nh = Math.round((screen.clientHeight || 1) * dpr);
        if (nw === canvas.width && nh === canvas.height) return;    // unchanged (e.g. mobile URL-bar toggle) — keep the running scene
        size();
        prev = -1;                               // drop any crossfade mid-resize
        scenes[cur].enter();                     // rebuild geometry from new W/H
        hud.textContent = scenes[cur].label;
        frame(0);
      }, 180);
    });

    size();
    activate(0, false);
    // paint a couple of initial frames so first paint isn't blank even before the loop starts
    for (var f = 0; f < 2; f++) frame(1 / 60);
    maybeRun();
  };
})();
