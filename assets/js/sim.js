/* ============================================================
   sim.js — 시뮬레이션 한 편을 돌리는 엔진 (sims/*.html 에서만 씁니다)

   시뮬레이션 하나 = 파일 하나.  sims/이름.html 안에서

       Sim.run('#sim', {
         title: '런 렝스 부호화',
         note:  '슬라이더를 밀어 보세요.',
         seedable: true,                    // «다시 뽑기» 단추가 생김
         controls: [
           { id: 'noise', type: 'range', label: '잡음',
             min: 0, max: 50, value: 10, unit: '%' }
         ],
         draw: function (c) {               // 값이 바뀔 때마다 불립니다
           c.stage.innerHTML = …;
           c.stat('압축률', '4.1%');
         }
       });

   step 을 넣으면 재생·한 칸씩 단추가 저절로 생깁니다:
         setup: function (c) { c.state = …; },
         step:  function (c) { …; return 끝났으면 'end'; }

   엔진이 대신 해 주는 것
     · 조작칸(슬라이더·고르기·체크·글자)과 값 읽기
     · 수치판 (압축률 같은 결과를 한 줄로)
     · 재생·정지·한 칸씩·처음으로·속도
     · 씨앗 난수 — 새로고침해도 같은 그림, «다시 뽑기» 로만 바뀜
     · 어딘가 터져도 안내만 띄우고 페이지는 멀쩡 (오류 격리)
     · 움직임 줄이기를 켠 분에게는 자동 재생 안 함
     · 주소 뒤 ?잡음=20 으로 조작칸 초기값 바꾸기
       (글에서 «{{Sim-RLE 잡음=20}}» 으로 인용하면 이렇게 넘어옵니다)
     · ?embed=1 이면 글 안에 끼워진 상태 — 높이를 부모에게 알려 줍니다
   ============================================================ */

window.Sim = (function () {

  var EMBED = /[?&]embed=1/.test(location.search);
  var reduceMotion = !!(window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* ── 씨앗 난수 ────────────────────────────────────
     Math.random 을 쓰면 새로고침할 때마다 그림이 달라져 «아까 그거» 를
     다시 볼 수 없습니다. 씨앗을 두면 같은 씨앗 = 같은 그림입니다. */
  function rngFrom(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5;  s >>>= 0;
      return s / 4294967296;
    };
  }

  /* ── 주소에 실려 온 초기값 ────────────────────────
     ?잡음=20&길이=800 → { 잡음: 20, 길이: 800 }
     이름은 조작칸의 id 로도, 화면 이름표(label)로도 찾습니다.      */
  function urlOpts() {
    var out = {};
    var q = location.search.replace(/^\?/, '').split('&');
    q.forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      if (i < 0) return;
      var k = decodeURIComponent(kv.slice(0, i).replace(/\+/g, ' ')).trim();
      var v = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')).trim();
      if (k === 'embed' || k === 'ref') return;   /* 틀이 쓰는 값 */
      if (/^-?\d+(\.\d+)?$/.test(v)) v = parseFloat(v);
      else if (v === 'true' || v === 'false') v = (v === 'true');
      out[k] = v;
    });
    return out;
  }

  /* ── 조작칸 만들기 ────────────────────────────── */
  function buildControls(spec, box, given, onChange) {
    var vals = {};
    (spec.controls || []).forEach(function (c) {
      /* 글에서 넘어온 초기값이 있으면 그것으로 시작합니다 */
      var start = given[c.id] !== undefined ? given[c.id]
                : given[c.label] !== undefined ? given[c.label]
                : c.value;

      var wrap = el('label', 'sm-ctl');
      wrap.appendChild(el('span', 'sm-ctl-label', c.label || c.id));

      var input;
      if (c.type === 'select') {
        input = document.createElement('select');
        (c.options || []).forEach(function (o) {
          var op = document.createElement('option');
          op.value = o.value != null ? o.value : o;
          op.textContent = o.label != null ? o.label : o;
          input.appendChild(op);
        });
        input.value = start;
        if (input.selectedIndex < 0) input.value = c.value;
      } else if (c.type === 'check') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!start;
      } else if (c.type === 'text') {
        input = document.createElement('input');
        input.type = 'text';
        input.value = start == null ? '' : String(start);
        if (c.placeholder) input.placeholder = c.placeholder;
      } else {
        input = document.createElement('input');
        input.type = 'range';
        input.min = c.min; input.max = c.max;
        input.step = c.step || 1;
        input.value = start;
      }
      input.className = 'sm-input sm-input--' + (c.type || 'range');

      var read = null;
      if (c.type === 'range' || !c.type) read = el('span', 'sm-ctl-val', '');

      function pull() {
        var v = c.type === 'check' ? input.checked
              : (c.type === 'select' || c.type === 'text') ? input.value
              : parseFloat(input.value);
        vals[c.id] = v;
        if (read) read.textContent = v + (c.unit || '');
      }
      pull();
      input.addEventListener('input', function () { pull(); onChange(c.id); });
      input.addEventListener('change', function () { pull(); onChange(c.id); });

      wrap.appendChild(input);
      if (read) wrap.appendChild(read);
      box.appendChild(wrap);
    });
    return vals;
  }

  /* ══════════════════════════════════════════════════
     시뮬레이션 돌리기
     ══════════════════════════════════════════════════ */
  function run(target, spec) {
    var host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) return null;

    host.innerHTML = '';
    host.classList.add('sm');

    var ctlBox = el('div', 'sm-ctls');
    host.appendChild(ctlBox);

    var stage = el('div', 'sm-stage');
    host.appendChild(stage);

    var stats = el('div', 'sm-stats');
    host.appendChild(stats);

    if (spec.note) host.appendChild(el('p', 'sm-note', spec.note));

    var seed = ((Math.random() * 1e9) | 0) || 7;
    var ctx = {
      el: host, stage: stage,
      opts: {}, state: {},
      reduceMotion: reduceMotion,
      rand: rngFrom(seed),
      /* 수치판에 한 칸 — tone: 'ok' | 'bad' | null */
      stat: function (label, value, tone) {
        var s = el('span', 'sm-stat' + (tone ? ' sm-stat--' + tone : ''));
        s.appendChild(el('b', null, label));
        s.appendChild(el('span', null, String(value)));
        stats.appendChild(s);
      },
      clearStats: function () { stats.innerHTML = ''; }
    };

    var guardOn = true;
    function safe(fn, label) {
      if (!guardOn) return;
      try { fn(); }
      catch (err) {
        guardOn = false;
        stage.innerHTML = '';
        stage.appendChild(el('p', 'sm-error', '이 시뮬레이션을 그리지 못했습니다 (' + label + ').'));
        if (window.console) console.error('[sim]', err);
      }
    }

    function redraw() {
      ctx.opts = {};
      Object.keys(vals).forEach(function (k) { ctx.opts[k] = vals[k]; });
      ctx.clearStats();
      safe(function () {
        if (spec.setup) spec.setup(ctx);
        spec.draw(ctx);
      }, '그리기');
      report();
    }

    var vals = buildControls(spec, ctlBox, urlOpts(), function () {
      stop();
      redraw();
    });

    /* ── 씨앗 다시 뽑기 ── */
    if (spec.seedable) {
      var reroll = el('button', 'sm-btn sm-btn--sm', '다시 뽑기');
      reroll.type = 'button';
      reroll.title = '같은 설정으로 데이터를 새로 만듭니다';
      reroll.addEventListener('click', function () {
        seed = ((Math.random() * 1e9) | 0) || 7;
        ctx.rand = rngFrom(seed);
        stop();
        redraw();
      });
      ctlBox.appendChild(reroll);
    }

    /* ── 재생 (spec.step 이 있을 때만) ── */
    var timer = null, playing = false;
    var play, stepBtn, resetBtn, speedSel;

    function stop() {
      playing = false;
      if (timer) { clearInterval(timer); timer = null; }
      if (play) { play.textContent = '▶ 재생'; play.setAttribute('aria-pressed', 'false'); }
    }
    function once() {
      var more = true;
      safe(function () {
        more = spec.step(ctx);
        ctx.clearStats();          /* 안 비우면 진행할 때마다 수치가 쌓입니다 */
        spec.draw(ctx);
      }, '한 칸 진행');
      report();
      if (more === 'end' || more === false) stop();
    }
    function toggle() {
      if (playing) { stop(); return; }
      playing = true;
      play.textContent = '⏸ 멈춤';
      play.setAttribute('aria-pressed', 'true');
      timer = setInterval(once, parseInt(speedSel.value, 10));
    }

    if (spec.step) {
      var bar = el('div', 'sm-play');
      play = el('button', 'sm-btn sm-btn--go', '▶ 재생');
      play.type = 'button';
      stepBtn = el('button', 'sm-btn', '한 칸 ⏭');
      stepBtn.type = 'button';
      resetBtn = el('button', 'sm-btn', '처음으로');
      resetBtn.type = 'button';
      speedSel = document.createElement('select');
      speedSel.className = 'sm-input sm-input--select sm-speed';
      [['700', '느리게'], ['320', '보통'], ['110', '빠르게']].forEach(function (o) {
        var op = document.createElement('option');
        op.value = o[0]; op.textContent = o[1];
        speedSel.appendChild(op);
      });
      speedSel.value = '320';
      speedSel.addEventListener('change', function () {
        if (playing) { stop(); toggle(); }
      });

      play.addEventListener('click', toggle);
      stepBtn.addEventListener('click', function () { stop(); once(); });
      resetBtn.addEventListener('click', function () { stop(); redraw(); });

      bar.appendChild(play); bar.appendChild(stepBtn);
      bar.appendChild(resetBtn); bar.appendChild(speedSel);
      host.insertBefore(bar, stats);
    }

    redraw();
    if (spec.step && spec.autoplay && !reduceMotion) toggle();

    return ctx;
  }

  /* ── 끼워진 상태에서 높이 알리기 ──────────────────
     글 안에서는 iframe 으로 들어가는데, iframe 은 제 키를 스스로 못 정합니다.
     그래서 내용이 바뀔 때마다 «지금 이만큼» 을 부모에게 알려 줍니다.  */
  var lastH = 0;
  var MYREF = (location.search.match(/[?&]ref=([^&]*)/) || [, ''])[1];
  function report() {
    if (!EMBED || !window.parent || window.parent === window) return;
    var h = Math.ceil(document.documentElement.scrollHeight);
    if (Math.abs(h - lastH) < 2) return;
    lastH = h;
    /* ref 도 함께 — 부모는 보낸 창으로 먼저 찾고, 못 찾으면 이 표를 봅니다 */
    try {
      window.parent.postMessage({ type: 'sim-height', h: h, ref: decodeURIComponent(MYREF) }, '*');
    } catch (e) {}
  }

  if (EMBED) {
    document.documentElement.classList.add('sim-embed');
    window.addEventListener('load', report);
    window.addEventListener('resize', report);
    if (window.ResizeObserver) {
      new ResizeObserver(report).observe(document.documentElement);
    } else {
      /* ResizeObserver 가 없는 브라우저 — 글꼴이 늦게 오는 만큼만 몇 번 더.
         («계속 재는» 타이머를 남겨 두면 아무도 안 보는 액자에서도 영영 돕니다) */
      [300, 1000, 2500].forEach(function (ms) { setTimeout(report, ms); });
    }
  }

  return { run: run, rngFrom: rngFrom, embed: EMBED };
}());
