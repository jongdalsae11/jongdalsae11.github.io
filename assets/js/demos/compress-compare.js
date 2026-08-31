/* ============================================================
   demos/compress-compare.js — 같은 입력에 두 방식을 나란히

   "압축 방식은 매우 중요하다" 는 문장의 근거. 데이터가 무엇이냐에
   따라 이기는 쪽이 바뀝니다. 연속이 많으면 RLE, 패턴이 반복되면 LZW.
   ============================================================ */

Demo.define('compress-compare', {
  title: '같은 데이터, 두 방식',
  note: '아래 보기를 고르거나 직접 쳐 보세요. 연속이 길면 RLE 가, ' +
        '같은 패턴이 되풀이되면 LZW 가 이깁니다. 두 방식 모두 «실제로 담는 데 ' +
        '필요한 bit» 로 재어 같은 잣대에 올려 두었습니다.',
  controls: [
    { id: 'preset', type: 'select', label: '보기', value: 'run',
      options: [
        { value: 'run',   label: '연속이 긴 데이터' },
        { value: 'cycle', label: '패턴이 반복' },
        { value: 'ko',    label: '한글 문장' },
        { value: 'rand',  label: '무작위' },
        { value: 'free',  label: '직접 입력' }
      ] },
    { id: 'text', type: 'text', label: '직접 입력',
      value: '', placeholder: '‹직접 입력› 을 고르고 여기에 치세요' }
  ],

  setup: function (c) {
    var P = {
      run:   'WWWWWWWWWWWWWWWWWWWWWWWWBBBBBBBBWWWWWWWWWWWWWWWWBBBBWWWWWWWWWWWWWWWWWWWW',
      cycle: 'ABCABCABCABCABCABCABCABCABCABCABCABCABCABCABCABCABCABC',
      ko:    '데이터를 압축하는 방법에는 무엇이 있을까. 압축 방식은 매우 중요하다.',
      rand:  'Q7zK2mVp9XcB4tRw1LsN8yHdG3fJ6aUeO5iZbT0kMxCvPqWnRy'
    };
    var src = c.opts.preset === 'free'
      ? String(c.opts.text || '').replace(/\n/g, ' ')
      : P[c.opts.preset];
    c.state.src = src || '(비어 있음)';
  },

  draw: function (c) {
    var src = c.state.src;
    var n = src.length;

    /* 두 방식을 같은 잣대로 재야 공정합니다.
       예전에는 RLE 를 «글자 수 × 8bit» 로, LZW 를 «코드 수 × log2(사전)» 로
       재고 있었습니다. 한쪽만 알뜰하게 담은 셈이라 비교가 되지 않습니다.
       이제 둘 다 «실제로 담는 데 필요한 bit» 로 셉니다.              */
    var alpha = {}, alphaN = 0;
    for (var i = 0; i < n; i++) if (!alpha[src[i]]) { alpha[src[i]] = 1; alphaN++; }
    var symBits = Math.max(1, Math.ceil(Math.log2(Math.max(2, alphaN))));

    /* ── RLE — (개수, 문자) 쌍 ── */
    var runs = [], run = 1, maxRun = 1;
    for (i = 1; i <= n; i++) {
      if (i < n && src[i] === src[i - 1]) { run++; continue; }
      runs.push(run); maxRun = Math.max(maxRun, run);
      run = 1;
    }
    var runBits = Math.max(1, Math.ceil(Math.log2(maxRun + 1)));
    var rleBits = runs.length * (runBits + symBits);

    /* ── LZW — 코드 하나는 사전을 담을 만큼의 bit ── */
    var dic = {}, next = 1;
    Object.keys(alpha).forEach(function (ch) { dic[ch] = next++; });
    var codes = [], sbuf = '';
    for (i = 0; i < n; i++) {
      var ch = src[i];
      if (dic[sbuf + ch] !== undefined) { sbuf += ch; continue; }
      codes.push(dic[sbuf]);
      dic[sbuf + ch] = next++;
      sbuf = ch;
    }
    if (sbuf) codes.push(dic[sbuf]);
    var codeBits = Math.max(1, Math.ceil(Math.log2(next)));
    var lzwBits = codes.length * codeBits;

    /* 원본도 같은 잣대로 — 알파벳을 담는 데 필요한 bit */
    var srcBits = n * symBits;

    function bar(label, b, tone) {
      var pct = srcBits ? (b / srcBits * 100) : 0;
      var w = Math.min(100, pct);
      return '<div class="cc-row">' +
        '<span class="cc-name">' + label + '</span>' +
        '<span class="cc-track"><span class="cc-fill cc-fill--' + tone +
          '" style="width:' + w + '%"></span></span>' +
        '<span class="cc-num">' + pct.toFixed(0) + '%</span></div>';
    }

    var win = rleBits < lzwBits ? 'RLE' : (lzwBits < rleBits ? 'LZW' : '비김');

    c.stage.innerHTML =
      '<pre class="cc-src">' + window.U.esc(src.slice(0, 220)) +
        (n > 220 ? ' …' : '') + '</pre>' +
      bar('원본', srcBits, 'base') +
      bar('RLE', rleBits, rleBits > srcBits ? 'bad' : 'ok') +
      bar('LZW', lzwBits, lzwBits > srcBits ? 'bad' : 'ok');

    c.stat('길이', n + '자 · 글자 ' + alphaN + '종 (' + symBits + 'bit)');
    c.stat('RLE', (rleBits / srcBits * 100).toFixed(0) + '%',
           rleBits > srcBits ? 'bad' : 'ok');
    c.stat('LZW', (lzwBits / srcBits * 100).toFixed(0) + '%',
           lzwBits > srcBits ? 'bad' : 'ok');
    c.stat('이긴 쪽', win);
  }
});
