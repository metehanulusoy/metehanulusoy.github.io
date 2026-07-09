/* =========================================================================
   code-theater.js — auto-playing "code being written & run" cinema panel.
   Fake editor + terminal endlessly looping 4 snippets (Python / TypeScript /
   C / GLSL): char-by-char typing with a tiny per-line tokenizer, terminal
   run output, REC timer, progress bar, play/pause + snippet dots.
   One rAF clock with accumulated dt; pauses when offscreen or tab hidden.
   No per-keystroke re-highlighting — tokens are built as spans on the fly.
   window.initCodeTheater(root)
   ========================================================================= */
(function () {
  'use strict';

  /* ===== tiny per-line tokenizer ===== */
  // each lang = ordered [class, regexSource] pairs merged into one global
  // regex; group i+1 <=> class i. first alternative wins at a position.
  function makeLang(defs) {
    var src = [], cls = [];
    for (var i = 0; i < defs.length; i++) { src.push('(' + defs[i][1] + ')'); cls.push(defs[i][0]); }
    return { re: new RegExp(src.join('|'), 'g'), cls: cls };
  }
  var LANGS = {
    py: makeLang([
      ['cmt', '#.*'],
      ['str', '[fFrb]?"(?:[^"\\\\]|\\\\.)*"|[fFrb]?\'(?:[^\'\\\\]|\\\\.)*\''],
      ['kw', '\\b(?:def|return|from|import|for|in|if|elif|else|class|with|as|lambda|not|and|or|None|True|False)\\b'],
      ['num', '\\b\\d+(?:\\.\\d+)?\\b'],
      ['fn', '\\b[A-Za-z_]\\w*(?=\\s*\\()']
    ]),
    ts: makeLang([
      ['cmt', '//.*'],
      ['str', '"(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\'|`(?:[^`\\\\]|\\\\.)*`'],
      ['kw', '\\b(?:import|export|from|const|let|var|function|return|async|await|type|interface|new|for|of|if|else|true|false|null|string|number|boolean)\\b'],
      ['num', '\\b\\d+(?:\\.\\d+)?\\b'],
      ['fn', '\\b[A-Za-z_$]\\w*(?=\\s*[(<])']
    ]),
    c: makeLang([
      ['cmt', '/\\*.*?\\*/|//.*'],
      ['str', '"(?:[^"\\\\]|\\\\.)*"|<\\w+\\.h>'],
      ['kw', '#\\w+|\\b(?:static|void|int|char|uint8_t|uint16_t|unsigned|struct|for|switch|case|break|return|if|else)\\b'],
      ['num', '\\b(?:0[xX][0-9a-fA-F]+|\\d+)\\b'],
      ['fn', '\\b[A-Za-z_]\\w*(?=\\s*\\()']
    ]),
    glsl: makeLang([
      ['cmt', '//.*'],
      ['kw', '\\b(?:precision|highp|mediump|uniform|varying|float|int|void|vec2|vec3|vec4|for|return|gl_FragColor)\\b'],
      ['num', '\\b\\d+(?:\\.\\d+)?\\b'],
      ['fn', '\\b[A-Za-z_]\\w*(?=\\s*\\()']
    ])
  };
  function tokenizeLine(line, lang) {
    var L = LANGS[lang], out = [], m, last = 0;
    L.re.lastIndex = 0;
    while ((m = L.re.exec(line))) {
      if (m.index > last) out.push({ t: line.slice(last, m.index), c: null });
      for (var g = 1; g <= L.cls.length; g++) {
        if (m[g] !== undefined) { out.push({ t: m[0], c: L.cls[g - 1] }); break; }
      }
      last = m.index + m[0].length;
      if (!m[0].length) L.re.lastIndex++; // never stall
    }
    if (last < line.length) out.push({ t: line.slice(last), c: null });
    return out;
  }

  /* ===== the 4 snippets + their terminal runs ===== */
  var SNIPPETS = [
    {
      file: 'rag_pipeline.py', lang: 'py',
      code: [
        '# rag_pipeline.py — retrieve, augment, answer',
        'from langchain_community.vectorstores import FAISS',
        'from langchain_core.prompts import ChatPromptTemplate',
        '',
        'store = FAISS.load_local("index/", embeddings)',
        'prompt = ChatPromptTemplate.from_template(',
        '    "Answer only from context:\\n{context}\\n\\nQ: {question}"',
        ')',
        '',
        'def answer(q: str) -> str:',
        '    docs = store.similarity_search(q, k=4)',
        '    ctx = "\\n\\n".join(d.page_content for d in docs)',
        '    out = (prompt | llm).invoke({"context": ctx, "question": q})',
        '    return out.content'
      ],
      out: [
        { t: 'python rag_pipeline.py', c: 'cmd' },
        { t: '[faiss] loaded 1,284 vectors · 384-dim MiniLM', c: 'dim' },
        { t: 'retrieved 4 chunks in 23ms · rerank 11ms', c: 'out' },
        { t: '> "The index uses FAISS with MiniLM embeddings."', c: 'out' },
        { t: '✓ answered in 1.42s', c: 'ok' }
      ]
    },
    {
      file: 'route.ts', lang: 'ts',
      code: [
        '// app/api/projects/route.ts',
        'import { NextResponse } from "next/server";',
        'import { db } from "@/lib/db";',
        '',
        'type Project = { id: string; title: string; stars: number };',
        '',
        'export async function GET() {',
        '  const rows = await db.project.findMany({',
        '    orderBy: { stars: "desc" },',
        '    take: 6,',
        '  });',
        '  return NextResponse.json<Project[]>(rows);',
        '}'
      ],
      out: [
        { t: 'curl -s localhost:3000/api/projects | jq ".[0]"', c: 'cmd' },
        { t: '[next] compiled /api/projects in 96ms', c: 'dim' },
        { t: '{ "id": "prj_01", "title": "molten-portfolio", "stars": 128 }', c: 'out' },
        { t: '✓ 200 OK · 38ms · typed end to end', c: 'ok' }
      ]
    },
    {
      file: 'cpu_vm.c', lang: 'c',
      code: [
        '/* cpu_vm.c — a tiny fetch-decode-execute core */',
        '#include <stdint.h>',
        '',
        'static uint8_t ram[256], reg[4];',
        '',
        'void run(uint8_t pc) {',
        '    for (;;) {',
        '        uint8_t op = ram[pc++];          /* fetch  */',
        '        uint8_t d = op >> 6, s = op & 3; /* decode */',
        '        switch (op & 0x30) {             /* execute */',
        '        case 0x00: reg[d] = ram[pc++]; break; /* LDI */',
        '        case 0x10: reg[d] += reg[s]; break;   /* ADD */',
        '        case 0x30: return;                    /* HLT */',
        '        }',
        '    }',
        '}'
      ],
      out: [
        { t: 'gcc -O2 cpu_vm.c -o vm && ./vm demo.bin', c: 'cmd' },
        { t: '[vm] 256B ram · 4 regs · 3 ops wired', c: 'dim' },
        { t: 'LDI r0, 0x2A', c: 'out' },
        { t: 'ADD r0, r1', c: 'out' },
        { t: 'HLT @ pc=0x07 · 12 cycles · 0.9 IPC', c: 'out' },
        { t: '✓ exit 0', c: 'ok' }
      ]
    },
    {
      file: 'ember.frag', lang: 'glsl',
      code: [
        '// ember.frag — molten fbm heat',
        'precision highp float;',
        'uniform float uTime;',
        'varying vec2 vUv;',
        'float fbm(vec2 p) {',
        '    float v = 0.0, a = 0.5;',
        '    for (int i = 0; i < 5; i++) {',
        '        v += a * noise(p); p *= 2.1; a *= 0.5;',
        '    }',
        '    return v;',
        '}',
        'void main() {',
        '    float heat = fbm(vUv * 3.0 + uTime * 0.15);',
        '    vec3 ember = mix(vec3(0.04), vec3(1.0, 0.35, 0.17), heat);',
        '    gl_FragColor = vec4(ember, 1.0);',
        '}'
      ],
      out: [
        { t: 'glslangValidator ember.frag', c: 'cmd' },
        { t: 'ember.frag: no errors · 0 warnings', c: 'out' },
        { t: './preview --shader ember.frag', c: 'cmd' },
        { t: '[gl] compiled 4ms · linked · 60fps @ 1.5x DPR', c: 'dim' },
        { t: '✓ ember glow live', c: 'ok' }
      ]
    }
  ];

  var SVG_PLAY = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
  var SVG_PAUSE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.6z"/></svg>';

  var HOLD_MS = 2600, WIPE_MS = 420;

  window.initCodeTheater = function (root) {
    if (!root || root.__ctInit) return;
    root.__ctInit = true;

    /* ===== build the DOM (replace any static fallback) ===== */
    root.classList.add('ct');
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', 'Animated demo of code being written and run');
    root.innerHTML =
      '<div class="ct-window" aria-hidden="true">' +
        '<div class="ct-bar">' +
          '<span class="ct-dots"><i></i><i></i><i></i></span>' +
          '<span class="ct-tab"></span>' +
          '<span class="ct-rec"><i class="ct-rec-dot"></i>REC<span class="ct-time">00:00</span></span>' +
        '</div>' +
        '<div class="ct-code"><pre class="ct-pre"><code class="ct-code-inner"></code></pre></div>' +
        '<div class="ct-term"><div class="ct-term-lines"></div></div>' +
        '<div class="ct-progress"><span class="ct-progress-bar"></span></div>' +
      '</div>' +
      '<div class="ct-controls">' +
        '<button class="ct-play" type="button" aria-label="Pause the code demo"></button>' +
        '<span class="ct-snips"></span>' +
      '</div>';

    var tabEl = root.querySelector('.ct-tab');
    var timeEl = root.querySelector('.ct-time');
    var codePane = root.querySelector('.ct-code');
    var codeEl = root.querySelector('.ct-code-inner');
    var termPane = root.querySelector('.ct-term');
    var termEl = root.querySelector('.ct-term-lines');
    var barEl = root.querySelector('.ct-progress-bar');
    var playBtn = root.querySelector('.ct-play');
    var snipsEl = root.querySelector('.ct-snips');

    var cursor = document.createElement('span');
    cursor.className = 'ct-cursor';

    var dotEls = [];
    function makeDot(i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ct-snip';
      b.setAttribute('aria-label', 'Play snippet ' + SNIPPETS[i].file);
      b.innerHTML = '<i></i>';
      b.addEventListener('click', function () { jump(i); });
      snipsEl.appendChild(b);
      dotEls.push(b);
    }
    for (var d = 0; d < SNIPPETS.length; d++) makeDot(d);

    /* ===== state ===== */
    var snipIdx = 0, phase = 'type', wait = 0;
    var lines = [], lineIdx = 0, tokIdx = 0, charIdx = 0;
    var lineBody = null, curText = null;
    var typedCount = 0, totalChars = 1, termIdx = 0;
    var elapsed = 0, lastSec = -1, lastProg = -1;
    var userPlay = true, onScreen = true, running = false, last = 0;

    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    function pinScroll(el) { el.scrollTop = el.scrollHeight; }

    function updateDots() {
      for (var i = 0; i < dotEls.length; i++) dotEls[i].classList.toggle('is-active', i === snipIdx);
    }

    function startSnippet(i) {
      snipIdx = i;
      var s = SNIPPETS[i];
      tabEl.textContent = s.file;
      lines = []; totalChars = 0;
      for (var l = 0; l < s.code.length; l++) {
        lines.push(tokenizeLine(s.code[l], s.lang));
        totalChars += s.code[l].length + 1; // +1 = the newline "keystroke"
      }
      lineIdx = 0; tokIdx = 0; charIdx = 0; lineBody = null; curText = null;
      typedCount = 0; termIdx = 0;
      phase = 'type'; wait = 320;
      updateDots();
    }

    /* ===== typing — append per-token spans, never re-highlight ===== */
    function typeChar() {
      if (lineIdx >= lines.length) { startRun(); return; }
      if (!lineBody) {
        var row = document.createElement('span');
        row.className = 'ct-line';
        var ln = document.createElement('span');
        ln.className = 'ct-ln';
        ln.textContent = String(lineIdx + 1);
        lineBody = document.createElement('span');
        lineBody.className = 'ct-lc';
        row.appendChild(ln); row.appendChild(lineBody);
        codeEl.appendChild(row);
        lineBody.appendChild(cursor); // cursor rides the active line
        pinScroll(codePane);
      }
      var toks = lines[lineIdx];
      if (tokIdx >= toks.length) {
        // newline: brief human pause, move on
        lineIdx++; tokIdx = 0; charIdx = 0; lineBody = null; curText = null;
        typedCount++;
        wait += 90 + Math.random() * 160;
        if (lineIdx >= lines.length) startRun();
        return;
      }
      var tok = toks[tokIdx];
      if (!curText) {
        curText = document.createTextNode('');
        if (tok.c) {
          var sp = document.createElement('span');
          sp.className = 'ct-t-' + tok.c;
          sp.appendChild(curText);
          lineBody.insertBefore(sp, cursor);
        } else {
          lineBody.insertBefore(curText, cursor);
        }
      }
      curText.data += tok.t.charAt(charIdx);
      charIdx++; typedCount++;
      if (charIdx >= tok.t.length) { tokIdx++; charIdx = 0; curText = null; }
    }

    /* ===== terminal run ===== */
    function startRun() {
      if (phase === 'run') return;
      phase = 'run';
      wait = 460 + Math.random() * 320;
    }
    function emitTermLine() {
      var o = SNIPPETS[snipIdx].out;
      if (termIdx >= o.length) { phase = 'hold'; wait = HOLD_MS; return; }
      var ln = o[termIdx];
      var div = document.createElement('div');
      div.className = 'ct-tline' + (ln.c ? ' ct-tline--' + ln.c : '');
      if (ln.c === 'cmd') {
        var p = document.createElement('span');
        p.className = 'ct-prompt';
        p.textContent = '$ ';
        div.appendChild(p);
        div.appendChild(document.createTextNode(ln.t));
      } else {
        div.textContent = ln.t;
      }
      termEl.appendChild(div);
      pinScroll(termPane);
      termIdx++;
      wait = (ln.c === 'cmd' ? 320 : 180) + Math.random() * 240;
      if (termIdx >= o.length) { phase = 'hold'; wait = HOLD_MS; }
    }

    /* ===== HUD: REC timer + progress ===== */
    function tickTimer() {
      var s = Math.floor(elapsed / 1000) % 3600;
      if (s !== lastSec) {
        lastSec = s;
        timeEl.textContent = pad((s / 60) | 0) + ':' + pad(s % 60);
      }
    }
    function updateProgress() {
      var p;
      if (phase === 'type') p = 0.62 * (typedCount / totalChars);
      else if (phase === 'run') p = 0.62 + 0.26 * (termIdx / SNIPPETS[snipIdx].out.length);
      else if (phase === 'hold') p = 0.88 + 0.12 * (1 - Math.max(wait, 0) / HOLD_MS);
      else p = 1;
      if (Math.abs(p - lastProg) > 0.003 || p === 1) {
        lastProg = p;
        barEl.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      }
    }

    /* ===== the one clock ===== */
    function update(dt) {
      elapsed += dt;
      tickTimer();
      wait -= dt;
      if (phase === 'type') {
        var burst = 0;
        while (wait <= 0 && phase === 'type' && burst++ < 3) {
          typeChar();
          wait += 18 + Math.random() * 20; // human-ish cadence
        }
        if (wait < -120) wait = 0; // don't bank a backlog while capped
      } else if (phase === 'run') {
        if (wait <= 0) emitTermLine();
      } else if (phase === 'hold') {
        if (wait <= 0) { phase = 'wipe'; root.classList.add('is-wiping'); wait = WIPE_MS; }
      } else if (phase === 'wipe') {
        if (wait <= 0) {
          codeEl.innerHTML = '';
          termEl.innerHTML = '';
          root.classList.remove('is-wiping');
          startSnippet((snipIdx + 1) % SNIPPETS.length);
        }
      }
      updateProgress();
    }

    function loop(ts) {
      if (!running) return;
      requestAnimationFrame(loop);
      var dt = Math.max(0, Math.min(ts - last, 80));
      last = ts;
      update(dt);
    }

    /* ===== play / pause + offscreen / hidden ===== */
    function maybeRun() {
      var go = userPlay && onScreen && !document.hidden;
      if (go && !running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
      else if (!go) { running = false; }
    }
    function syncBtn() {
      playBtn.innerHTML = userPlay ? SVG_PAUSE : SVG_PLAY;
      playBtn.setAttribute('aria-label', userPlay ? 'Pause the code demo' : 'Play the code demo');
      root.classList.toggle('is-paused', !userPlay);
    }
    playBtn.addEventListener('click', function () {
      userPlay = !userPlay;
      syncBtn();
      maybeRun();
    });
    function jump(i) {
      codeEl.innerHTML = '';
      termEl.innerHTML = '';
      root.classList.remove('is-wiping');
      startSnippet(i);
      if (!userPlay) { userPlay = true; syncBtn(); }
      maybeRun();
    }

    document.addEventListener('visibilitychange', maybeRun);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        onScreen = es[0].isIntersecting;
        maybeRun();
      }, { threshold: 0.05 }).observe(root);
    }

    // debounced resize: just re-pin the follow-scroll positions
    var rT;
    window.addEventListener('resize', function () {
      clearTimeout(rT);
      rT = setTimeout(function () { pinScroll(codePane); pinScroll(termPane); }, 180);
    });

    /* ===== go ===== */
    startSnippet(0);
    syncBtn();
    // paint the first line instantly so the panel never opens blank
    var guard = 0;
    while (lineIdx === 0 && phase === 'type' && guard++ < 80) typeChar();
    updateProgress();
    maybeRun();
  };
})();
