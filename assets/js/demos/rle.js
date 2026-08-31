/* ============================================================
   demos/rle.js — 런 렝스 부호화를 잡음 슬라이더로

   글의 도입부에서 "AAAA 는 잘 줄지만 ABCABC 는 오히려 늘어난다" 고
   했는데, 그 경계를 손으로 넘어 보게 하는 것이 이 데모의 전부입니다.
   잡음을 올리면 구간이 잘게 쪼개져 «개수+문자» 로 줄이는 이득이 사라집니다.
   (두 색·독립 잡음에서는 100% 에 다가가고, 실제로 넘어서는 경우는
    글자 종류가 늘 때입니다 — 그건 compress-compare 데모에서 봅니다)
   ============================================================ */

Demo.define('rle', {
  title: '런 렝스 부호화 — 잡음이 늘면 어떻게 되나',
  note: '잡음은 각 자리가 B 가 될 확률입니다. 띠나 토큰에 마우스를 올리면 ' +
        '서로 어디에 해당하는지 보입니다. 잡음이 커질수록 구간이 잘게 쪼개져 ' +
        '«개수+문자» 로 줄이는 이득이 사라집니다.',
  seedable: true,
  controls: [
    { id: 'noise', type: 'range', label: '잡음', min: 0, max: 50, step: 1, value: 8, unit: '%' },
    { id: 'n', type: 'range', label: '길이', min: 200, max: 5000, step: 200, value: 1200, unit: '자' }
  ],

  setup: function (c) {
    /* 자리마다 독립적으로 잡음 확률만큼 B 가 됩니다.
       («무작위 자리를 n번 뒤집기» 로 하면 같은 자리를 두 번 뒤집는 일이
        잦아 실제 잡음이 라벨보다 훨씬 낮게 나옵니다)                */
    var n = c.opts.n, p = c.opts.noise / 100;
    var a = new Array(n);
    for (var i = 0; i < n; i++) a[i] = c.rand() < p ? 'B' : 'W';
    c.state.src = a;

    /* 인코딩 — 연속을 세어 «개수+문자» 로 */
    var runs = [], run = 1;
    for (i = 1; i <= n; i++) {
      if (i < n && a[i] === a[i - 1]) { run++; continue; }
      runs.push({ len: run, ch: a[i - 1], end: i });
      run = 1;
    }
    c.state.runs = runs;
    c.state.enc = runs.map(function (r) { return r.len + r.ch; }).join('');
  },

  draw: function (c) {
    var st = c.state, n = st.src.length;
    var encLen = st.enc.length;
    var ratio = encLen / n;
    var worse = ratio >= 1;

    /* ── 원본 띠 — 구간마다 한 칸, 폭은 길이에 비례 ── */
    var strip = '<div class="rle-strip" role="img" aria-label="원본 데이터">';
    st.runs.forEach(function (r, i) {
      strip += '<span class="rle-run rle-run--' + r.ch.toLowerCase() +
               '" data-i="' + i + '" style="flex:' + r.len + ' 0 0"></span>';
    });
    strip += '</div>';

    /* ── 토큰 줄 — 너무 많으면 앞부분만 ── */
    var LIMIT = 60;
    var toks = st.runs.slice(0, LIMIT).map(function (r, i) {
      return '<span class="rle-tok" data-i="' + i + '">' +
             '<b>' + r.len + '</b>' + r.ch + '</span>';
    }).join('');
    if (st.runs.length > LIMIT) {
      toks += '<span class="rle-more">… 그리고 ' + (st.runs.length - LIMIT) + '개 더</span>';
    }

    c.stage.innerHTML =
      strip +
      '<div class="rle-toks">' + toks + '</div>';

    /* ── 수치판 ── */
    c.stat('원본', n + '자');
    c.stat('압축', encLen + '자', worse ? 'bad' : 'ok');
    c.stat('압축률', (ratio * 100).toFixed(1) + '%', worse ? 'bad' : 'ok');
    c.stat('구간 수', st.runs.length);
    /* 두 색·독립 잡음에서는 압축률이 100% 를 넘지는 않고 다가갑니다.
       «넘는» 경우는 글자 종류가 늘 때인데, 그건 비교 데모에서 봅니다. */
    if (worse) c.stat('', '원본보다 커졌습니다', 'bad');
    else if (ratio > 0.9) c.stat('', '이득이 거의 없습니다', 'bad');

    /* ── 띠와 토큰을 서로 비추기 ── */
    var strips = c.stage.querySelectorAll('.rle-run');
    var tokens = c.stage.querySelectorAll('.rle-tok');
    function link(list) {
      Array.prototype.forEach.call(list, function (x) {
        x.addEventListener('mouseenter', function () {
          var i = x.getAttribute('data-i');
          c.stage.classList.add('rle-focusing');
          [strips[i], tokens[i]].forEach(function (y) { if (y) y.classList.add('on'); });
        });
        x.addEventListener('mouseleave', function () {
          c.stage.classList.remove('rle-focusing');
          Array.prototype.forEach.call(c.stage.querySelectorAll('.on'), function (y) {
            y.classList.remove('on');
          });
        });
      });
    }
    link(strips); link(tokens);
  }
});
