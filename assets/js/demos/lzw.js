/* ============================================================
   demos/lzw.js — LZW 를 한 칸씩

   인코더와 디코더를 나란히 돌립니다. 글의 각주로만 적어 둔 KwKwK
   예외 — 디코더가 아직 만들지 못한 코드를 받아 prev + prev[0] 로
   메우는 순간 — 을 실제로 만나게 하는 것이 이 데모의 핵심입니다.
   그 순간에는 해당 줄이 주황으로 켜집니다.
   ============================================================ */

Demo.define('lzw', {
  title: 'LZW — 사전이 자라는 걸 한 칸씩',
  note: '‹한 칸 ⏭› 을 눌러 진행해 보세요. 인코더가 방금 사전에 넣은 코드를 ' +
        '바로 다음에 써 버리면, 디코더는 그 코드를 아직 모릅니다. ' +
        '그때가 KwKwK 예외입니다.',
  controls: [
    { id: 'text', type: 'text', label: '입력',
      value: 'ABABABAB', placeholder: '예: ABABABAB' }
  ],

  setup: function (c) {
    var src = String(c.opts.text || '').replace(/\s+/g, '') || 'ABABABAB';

    /* 기본 사전 — 등장하는 낱글자 (글의 C++ 코드와 같은 순서) */
    var base = [], seen = {};
    for (var i = 0; i < src.length; i++) {
      if (!seen[src[i]]) { seen[src[i]] = 1; base.push(src[i]); }
    }

    var enc = { dic: {}, next: 1, s: '', i: 0, out: [] };
    base.forEach(function (ch) { enc.dic[ch] = enc.next++; });
    var baseN = enc.next - 1;

    c.state = {
      src: src, baseN: baseN, base: base,
      enc: enc,
      dec: { dic: {}, next: baseN + 1, prev: null, i: 0, out: '' },
      log: [], done: false, kwk: false, added: null
    };
    base.forEach(function (ch, k) { c.state.dec.dic[k + 1] = ch; });
  },

  /* 인코더를 한 글자 진행하고, 코드가 나오면 디코더도 한 코드 진행 */
  step: function (c) {
    var st = c.state;
    if (st.done) return 'end';
    st.added = null; st.kwk = false;

    var e = st.enc, src = st.src;

    if (e.i < src.length) {
      var ch = src[e.i];
      if (e.dic[e.s + ch] !== undefined) {
        e.s += ch;
        e.i++;
        return true;                       /* 아직 코드가 나오지 않음 */
      }
      e.out.push(e.dic[e.s]);
      e.dic[e.s + ch] = e.next;
      st.added = { code: e.next, str: e.s + ch };
      e.next++;
      e.s = ch;
      e.i++;
    } else {
      /* 마지막에 남은 s — 루프 안에서는 나올 기회가 없습니다 */
      if (e.s) { e.out.push(e.dic[e.s]); e.s = ''; }
      else { st.done = true; return 'end'; }
    }

    /* ── 디코더도 새로 나온 코드 하나를 소화 ── */
    var d = st.dec;
    while (d.i < e.out.length) {
      var code = e.out[d.i];
      var entry;
      if (d.dic[code] !== undefined) entry = d.dic[code];
      else { entry = d.prev + d.prev[0]; st.kwk = true; }   /* KwKwK */
      d.out += entry;
      if (d.prev !== null) d.dic[d.next++] = d.prev + entry[0];
      d.prev = entry;
      d.i++;
    }
    return true;
  },

  draw: function (c) {
    var st = c.state, e = st.enc, d = st.dec, src = st.src;

    /* ── 입력과 커서 ── */
    var input = '';
    for (var i = 0; i < src.length; i++) {
      input += '<span class="lz-ch' + (i < e.i ? ' done' : '') +
               (i === e.i ? ' cur' : '') + '">' + src[i] + '</span>';
    }

    /* ── 사전 (디코더 쪽 — 인코더와 같은 규칙으로 자랍니다) ── */
    var rows = Object.keys(d.dic).map(Number).sort(function (a, b) { return a - b; })
      .map(function (k) {
        var isNew = st.added && st.added.code === k;
        return '<span class="lz-row' + (isNew ? ' fresh' : '') +
               (k <= st.baseN ? ' base' : '') + '">' +
               '<b>' + k + '</b>' + d.dic[k] + '</span>';
      }).join('');

    c.stage.innerHTML =
      '<div class="lz-line"><span class="lz-tag">입력</span>' +
        '<span class="lz-input">' + input + '</span></div>' +
      '<div class="lz-line"><span class="lz-tag">현재 s</span>' +
        '<span class="lz-s">' + (e.s || '·') + '</span></div>' +
      '<div class="lz-line"><span class="lz-tag">사전</span>' +
        '<span class="lz-dic">' + rows + '</span></div>' +
      '<div class="lz-line"><span class="lz-tag">코드</span>' +
        '<span class="lz-out">' + (e.out.join(' ') || '·') + '</span></div>' +
      '<div class="lz-line"><span class="lz-tag">복원</span>' +
        '<span class="lz-back">' + (d.out || '·') +
        '<span class="lz-cmp">' + (d.out === src.slice(0, d.out.length)
          ? '원본과 일치' : '어긋남') + '</span></span></div>' +
      (st.kwk
        ? '<p class="lz-kwk">KwKwK — 디코더가 아직 모르는 코드가 왔습니다. ' +
          '직전 문자열에 그 첫 글자를 붙여(<code>prev + prev[0]</code>) 메웁니다.</p>'
        : '');

    c.stat('읽은 글자', e.i + ' / ' + src.length);
    c.stat('코드 수', e.out.length);
    c.stat('사전', Object.keys(d.dic).length + '개');
    if (st.done) {
      var bits = Math.max(1, Math.ceil(Math.log2(d.next)));
      c.stat('원본', src.length * 8 + 'bit');
      c.stat('압축', e.out.length * bits + 'bit',
             e.out.length * bits < src.length * 8 ? 'ok' : 'bad');
    }
  }
});
