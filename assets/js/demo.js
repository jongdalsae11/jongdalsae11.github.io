/* ============================================================
   demo.js — 글 안에 넣는 인터랙티브 블록의 공통 틀

   글에서:
       :::demo rle
       잡음 = 10
       길이 = 10000
       :::

   데모 하나를 만들려면 assets/js/demos/<이름>.js 에 이렇게 씁니다:

       Demo.define('rle', {
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
         step:  function (c) { …; return c.done ? 'end' : true; }

   틀이 대신 해 주는 것
     · 조작칸(슬라이더·고르기·체크·글자)과 값 읽기
     · 수치판 (압축률 같은 결과를 한 줄로)
     · 재생·정지·한 칸씩·처음으로·속도
     · 씨앗 난수 — 새로고침해도 같은 그림, «다시 뽑기» 로만 바뀜
     · 화면에 들어올 때 비로소 시작 (지연 장착)
     · 데모 하나가 죽어도 글 전체는 멀쩡 (오류 격리)
     · 애니메이션을 줄이도록 설정한 분에게는 자동 재생을 하지 않음
   ============================================================ */

window.Demo = (function () {
  var REG = {};                 /* 이름 → 정의 */
  var loading = {};             /* 이름 → Promise (같은 파일을 두 번 받지 않게) */
  var ROOT = function () { return window.ROOT || '.'; };

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

  /* ── 글에 적은 설정 읽기 ──────────────────────────
     "잡음 = 10" 같은 줄을 { 잡음: 10 } 으로. 숫자면 숫자로 바꿉니다. */
  function parseOpts(text) {
    var out = {};
    String(text || '').split('\n').forEach(function (line) {
      var m = line.match(/^\s*([^=]+?)\s*=\s*(.*?)\s*$/);
      if (!m) return;
      var v = m[2];
      if (/^-?\d+(\.\d+)?$/.test(v)) v = parseFloat(v);
      else if (v === 'true' || v === 'false') v = (v === 'true');
      out[m[1]] = v;
    });
    return out;
  }

  /* ── 조작칸 만들기 ────────────────────────────── */
  function buildControls(spec, box, onChange) {
    var vals = {};
    (spec.controls || []).forEach(function (c) {
      var wrap = el('label', 'dm-ctl');
      wrap.appendChild(el('span', 'dm-ctl-label', c.label || c.id));

      var input;
      if (c.type === 'select') {
        input = document.createElement('select');
        (c.options || []).forEach(function (o) {
          var op = document.createElement('option');
          op.value = o.value != null ? o.value : o;
          op.textContent = o.label != null ? o.label : o;
          input.appendChild(op);
        });
        input.value = c.value;
      } else if (c.type === 'check') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!c.value;
      } else if (c.type === 'text') {
        input = document.createElement('input');
        input.type = 'text';
        input.value = c.value || '';
        if (c.placeholder) input.placeholder = c.placeholder;
      } else {
        input = document.createElement('input');
        input.type = 'range';
        input.min = c.min; input.max = c.max;
        input.step = c.step || 1;
        input.value = c.value;
      }
      input.className = 'dm-input dm-input--' + (c.type || 'range');

      var read = null;
      if (c.type === 'range' || !c.type) {
        read = el('span', 'dm-ctl-val', c.value + (c.unit || ''));
      }

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
     데모 하나 장착
     ══════════════════════════════════════════════════ */
  function mount(host, name, optText) {
    var spec = REG[name];
    if (!spec) return;

    host.innerHTML = '';
    host.classList.add('dm', 'dm--' + name);

    var head = el('div', 'dm-head');
    head.appendChild(el('span', 'dm-kicker', '해 보기'));
    if (spec.title) head.appendChild(el('h4', 'dm-title', spec.title));
    host.appendChild(head);

    var ctlBox = el('div', 'dm-ctls');
    host.appendChild(ctlBox);

    var stage = el('div', 'dm-stage');
    host.appendChild(stage);

    var stats = el('div', 'dm-stats');
    host.appendChild(stats);

    if (spec.note) host.appendChild(el('p', 'dm-note', spec.note));

    /* ── 데모에 건네줄 상자 ── */
    var seed = ((Math.random() * 1e9) | 0) || 7;
    var ctx = {
      el: host, stage: stage,
      opts: {}, state: {},
      reduceMotion: reduceMotion,
      rand: rngFrom(seed),
      /* 수치판에 한 칸 — tone: 'ok' | 'bad' | null */
      stat: function (label, value, tone) {
        var s = el('span', 'dm-stat' + (tone ? ' dm-stat--' + tone : ''));
        s.appendChild(el('b', null, label));
        s.appendChild(el('span', null, String(value)));
        stats.appendChild(s);
      },
      clearStats: function () { stats.innerHTML = ''; }
    };

    var authored = parseOpts(optText);

    function collect() {
      ctx.opts = {};
      Object.keys(vals).forEach(function (k) { ctx.opts[k] = vals[k]; });
      /* 글에 적은 값이 있으면 그것을 우선 (첫 그리기에서만 의미가 있습니다) */
      Object.keys(authored).forEach(function (k) {
        if (ctx.opts[k] === undefined) ctx.opts[k] = authored[k];
      });
    }

    var guardOn = true;
    function safe(fn, label) {
      if (!guardOn) return;
      try { fn(); }
      catch (err) {
        guardOn = false;
        stage.innerHTML = '';
        var e = el('p', 'dm-error', '이 데모를 그리지 못했습니다 (' + label + ').');
        stage.appendChild(e);
        if (window.console) console.error('[demo:' + name + ']', err);
      }
    }

    function redraw() {
      collect();
      ctx.clearStats();
      safe(function () {
        if (spec.setup) spec.setup(ctx);
        spec.draw(ctx);
      }, '그리기');
    }

    var vals = buildControls(spec, ctlBox, function () {
      stop();
      redraw();
    });

    /* ── 씨앗 다시 뽑기 ── */
    if (spec.seedable) {
      var reroll = el('button', 'dm-btn dm-btn--sm', '다시 뽑기');
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
      var bar = el('div', 'dm-play');
      play = el('button', 'dm-btn dm-btn--go', '▶ 재생');
      play.type = 'button';
      stepBtn = el('button', 'dm-btn', '한 칸 ⏭');
      stepBtn.type = 'button';
      resetBtn = el('button', 'dm-btn', '처음으로');
      resetBtn.type = 'button';
      speedSel = document.createElement('select');
      speedSel.className = 'dm-input dm-input--select dm-speed';
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

    /* 자동 재생은 «움직임 줄이기» 를 켠 분에게는 하지 않습니다 */
    if (spec.step && spec.autoplay && !reduceMotion) toggle();

    host.dataset.mounted = '1';
    /* 글이 다시 그려질 때 이 데모를 통째로 재사용하기 위한 열쇠 */
    host.dataset.key = name + '' + (optText || '');
    return host;
  }

  /* ── 데모 파일을 그때그때 받아 옵니다 ─────────────── */
  function need(name) {
    if (REG[name]) return Promise.resolve(true);
    if (loading[name]) return loading[name];
    loading[name] = new Promise(function (res) {
      var s = document.createElement('script');
      s.src = ROOT() + '/assets/js/demos/' + name + '.js';
      s.onload = function () { res(!!REG[name]); };
      s.onerror = function () { res(false); };
      document.head.appendChild(s);
    });
    return loading[name];
  }

  function placeholder(host, msg) {
    host.classList.add('dm', 'dm--empty');
    host.innerHTML = '';
    host.appendChild(el('p', 'dm-note', msg));
  }

  /* ══════════════════════════════════════════════════
     글 안의 모든 :::demo 블록을 찾아 장착
     reuse: 미리보기처럼 자주 다시 그려지는 곳에서, 설정이 그대로면
            이미 만들어 둔 데모를 그대로 옮겨 와 상태를 잃지 않게 합니다.
     ══════════════════════════════════════════════════ */
  var cache = {};

  function mountAll(root, opt) {
    opt = opt || {};
    var list = (root || document).querySelectorAll('[data-demo]');
    Array.prototype.forEach.call(list, function (host) {
      if (host.dataset.mounted) return;
      var name = host.getAttribute('data-demo');
      var optText = host.getAttribute('data-opts') || '';
      var key = name + '' + optText;

      if (opt.reuse && cache[key] && cache[key].dataset.mounted) {
        host.parentNode.replaceChild(cache[key], host);
        return;
      }

      var start = function () {
        need(name).then(function (ok) {
          if (!ok) {
            placeholder(host, '‹' + name + '› 데모를 불러오지 못했습니다.');
            return;
          }
          mount(host, name, optText);
          if (opt.reuse) cache[key] = host;
        });
      };

      /* 화면에 들어올 때 시작 — 글 위쪽만 읽고 마는 경우 헛일을 안 합니다 */
      if (!opt.eager && window.IntersectionObserver) {
        var io = new IntersectionObserver(function (ents) {
          ents.forEach(function (en) {
            if (!en.isIntersecting) return;
            io.disconnect();
            start();
          });
        }, { rootMargin: '200px' });
        io.observe(host);
      } else start();
    });
  }

  function define(name, spec) { REG[name] = spec; }

  document.addEventListener('DOMContentLoaded', function () { mountAll(document); });

  return { define: define, mountAll: mountAll, rngFrom: rngFrom };
}());
