/* ============================================================
   editor.js — 편집칸을 손에 익게 만드는 기능들
   (write.js 다음에 로드되며, #editor 가 있을 때만 동작)

     · 단축키      Ctrl+B / I / K / 1 / 2 / 3 / E
     · 목록 이어쓰기  Enter 로 다음 항목, 빈 항목에서 Enter 로 빠져나옴
     · 들여쓰기     Tab / Shift+Tab  (Esc 를 먼저 누르면 Tab 으로 포커스 이동)
     · 슬래시 메뉴   / 를 치면 블록 목록이 커서 옆에 뜸
     · 선택 서식바   글을 드래그하면 그 자리에 서식 버튼이 뜸
     · 똑똑한 붙여넣기  주소를 선택 위에 붙이면 링크로 변환
   ============================================================ */

(function () {
  var ed = document.getElementById('editor');
  if (!ed) return;

  var slash = document.getElementById('slash');
  var selBar = document.getElementById('sel-bar');
  var wrapEl = ed.parentNode;                 /* .w-body (position: relative) */

  function fire() { ed.dispatchEvent(new Event('input', { bubbles: true })); }

  /* ── 선택 영역 조작 ─────────────────────────────── */
  function setRange(from, to, text, selFrom, selTo) {
    ed.setRangeText(text, from, to, 'end');
    if (selFrom != null) ed.setSelectionRange(selFrom, selTo == null ? selFrom : selTo);
    fire();
  }
  function surround(before, after, placeholder) {
    var s = ed.selectionStart, e = ed.selectionEnd;
    var sel = ed.value.slice(s, e);
    /* 이미 감싸져 있으면 벗겨 냄 (토글) */
    var outer = ed.value.slice(s - before.length, e + after.length);
    if (sel && outer === before + sel + after) {
      setRange(s - before.length, e + after.length, sel,
               s - before.length, s - before.length + sel.length);
      return;
    }
    var body = sel || placeholder || '';
    setRange(s, e, before + body + after, s + before.length, s + before.length + body.length);
  }
  function lineBounds(pos) {
    var v = ed.value;
    return { from: v.lastIndexOf('\n', pos - 1) + 1,
             to: (v.indexOf('\n', pos) < 0 ? v.length : v.indexOf('\n', pos)) };
  }
  /* 줄 앞에 표식 붙이기/떼기 (제목·인용·목록) */
  function prefixLine(mark) {
    var b = lineBounds(ed.selectionStart);
    var line = ed.value.slice(b.from, b.to);
    var cleaned = line.replace(/^(#{1,6}\s|>\s?|[-*]\s|\d+\.\s)/, '');
    var next = (line === mark + cleaned) ? cleaned : mark + cleaned;
    setRange(b.from, b.to, next, b.from + next.length);
  }

  /* ── 단축키 ─────────────────────────────────────── */
  var SHORTCUT = {
    b: function () { surround('**', '**', '굵게'); },
    i: function () { surround('*', '*', '기울임'); },
    e: function () { surround('`', '`', 'code'); },
    k: function () {
      var s = ed.selectionStart, e = ed.selectionEnd;
      var sel = ed.value.slice(s, e) || '링크 텍스트';
      setRange(s, e, '[' + sel + '](https://)', s + sel.length + 3, s + sel.length + 11);
    },
    1: function () { prefixLine('## '); },
    2: function () { prefixLine('### '); },
    3: function () { prefixLine('> '); }
  };

  /* Esc 를 누른 직후의 Tab 은 포커스 이동용으로 넘겨 줍니다 (접근성) */
  var escaped = false;

  ed.addEventListener('keydown', function (e) {
    /* 슬래시 메뉴가 열려 있으면 그쪽이 먼저 */
    if (!slash.hidden && slashKey(e)) return;

    var mod = e.ctrlKey || e.metaKey;
    if (mod && !e.altKey) {
      var fn = SHORTCUT[e.key.toLowerCase()];
      if (fn) { e.preventDefault(); fn(); return; }
    }

    if (e.key === 'Escape') { escaped = true; return; }

    if (e.key === 'Tab') {
      if (escaped) { escaped = false; return; }   /* 포커스 이동 허용 */
      e.preventDefault();
      indent(e.shiftKey ? -1 : 1);
      return;
    }
    escaped = false;

    if (e.key === 'Enter' && !e.shiftKey && !mod) continueList(e);
  });

  /* 목록·인용 이어쓰기 */
  function continueList(e) {
    var pos = ed.selectionStart;
    if (pos !== ed.selectionEnd) return;
    var b = lineBounds(pos);
    var line = ed.value.slice(b.from, pos);
    var m = line.match(/^(\s*)([-*]|\d+\.|>)\s+(.*)$/);
    if (!m) return;

    e.preventDefault();
    if (!m[3].trim()) {                 /* 빈 항목에서 Enter → 표식 제거 */
      setRange(b.from, pos, '', b.from);
      return;
    }
    var mark = /^\d+\.$/.test(m[2]) ? (parseInt(m[2], 10) + 1) + '.' : m[2];
    var ins = '\n' + m[1] + mark + ' ';
    setRange(pos, pos, ins, pos + ins.length);
  }

  /* 들여쓰기 (여러 줄 선택도 지원) */
  function indent(dir) {
    var s = ed.selectionStart, e = ed.selectionEnd;
    var from = lineBounds(s).from, to = lineBounds(e).to;
    var block = ed.value.slice(from, to);
    var out = block.split('\n').map(function (l) {
      if (dir > 0) return '  ' + l;
      return l.replace(/^ {1,2}/, '');
    }).join('\n');
    var delta = out.length - block.length;
    setRange(from, to, out, s + (dir > 0 ? 2 : Math.max(-2, delta)), e + delta);
  }

  /* ── 커서 좌표 (textarea 를 흉내 낸 사본으로 계산) ── */
  function caretXY(pos) {
    var cs = getComputedStyle(ed);
    var d = document.createElement('div');
    ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
     'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
     'borderWidth', 'boxSizing', 'textIndent'].forEach(function (k) { d.style[k] = cs[k]; });
    d.style.position = 'absolute';
    d.style.visibility = 'hidden';
    d.style.whiteSpace = 'pre-wrap';
    d.style.overflowWrap = 'break-word';
    d.style.width = ed.clientWidth + 'px';
    d.style.top = '0'; d.style.left = '-9999px';
    d.textContent = ed.value.slice(0, pos);
    var mark = document.createElement('span');
    mark.textContent = '​';
    d.appendChild(mark);
    document.body.appendChild(d);
    var xy = { x: mark.offsetLeft, y: mark.offsetTop, h: mark.offsetHeight || 20 };
    document.body.removeChild(d);
    return xy;
  }
  /* .w-body 기준 좌표로 변환 */
  function anchorTo(el, pos, place) {
    var xy = caretXY(pos);
    var edBox = ed.getBoundingClientRect();
    var wrapBox = wrapEl.getBoundingClientRect();
    var x = edBox.left - wrapBox.left + xy.x;
    var y = edBox.top - wrapBox.top + xy.y - ed.scrollTop;
    el.style.left = Math.max(8, x) + 'px';
    el.style.top = (place === 'above' ? y - 6 : y + xy.h + 6) + 'px';
  }

  /* ── 슬래시 명령 ────────────────────────────────── */
  var CMDS = [
    { k: '제목',      hint: '##',   run: function () { prefixLine('## '); } },
    { k: '소제목',    hint: '###',  run: function () { prefixLine('### '); } },
    { k: '목록',      hint: '-',    run: function () { prefixLine('- '); } },
    { k: '인용',      hint: '>',    run: function () { prefixLine('> '); } },
    { k: '코드블록',  hint: '```',  run: function () { surround('\n```cpp\n', '\n```\n', '// 코드'); } },
    { k: '수식블록',  hint: '$$',   run: function () { surround('\n$$\n', '\n$$\n', 'f(x) = x^2'); } },
    { k: '인라인 수식', hint: '$',  run: function () { surround('$', '$', 'x'); } },
    { k: '여백주석',  hint: '^[]',  run: function () { surround('^[', ']', '여백에 들어갈 설명'); } },
    { k: '결론 강조', hint: '!!',   run: function () { surround('\n!!', '!!\n', '핵심 결론'); } },
    { k: '구분선',    hint: '---',  run: function () { setRange(ed.selectionStart, ed.selectionEnd, '\n---\n'); } },
    { k: '링크',      hint: '[]()', run: function () { SHORTCUT.k(); } },
    { k: '이미지',    hint: 'img',  run: function () { var b = document.getElementById('btn-img'); if (b) b.click(); } },
    { k: '글 연결',   hint: '[[]]', run: function () { var b = document.getElementById('btn-wiki'); if (b) b.click(); } },
    { k: '자료 인용', hint: '{{}}', run: function () { var b = document.getElementById('btn-cite'); if (b) b.click(); } }
  ];

  var slashAt = -1, slashIdx = 0, slashHits = [];

  function drawSlash() {
    var q = ed.value.slice(slashAt + 1, ed.selectionStart).toLowerCase();
    slashHits = CMDS.filter(function (c) {
      return !q || c.k.toLowerCase().indexOf(q) >= 0 || c.hint.indexOf(q) >= 0;
    });
    if (!slashHits.length) {
      slash.innerHTML = '<div class="slash-empty">해당하는 블록이 없습니다</div>';
      return;
    }
    if (slashIdx >= slashHits.length) slashIdx = 0;
    slash.innerHTML = slashHits.map(function (c, i) {
      return '<div class="slash-item' + (i === slashIdx ? ' on' : '') + '" data-i="' + i + '">' +
             c.k + '<span class="sl-key">' + c.hint + '</span></div>';
    }).join('');
  }
  function openSlash(at) {
    slashAt = at; slashIdx = 0;
    slash.hidden = false;
    anchorTo(slash, at, 'below');
    drawSlash();
  }
  function closeSlash() { slash.hidden = true; slashAt = -1; }

  function runSlash(i) {
    var c = slashHits[i];
    if (!c) return;
    /* 입력한 '/명령어' 를 지우고 블록을 넣습니다 */
    var end = ed.selectionStart;
    ed.setRangeText('', slashAt, end, 'end');
    closeSlash();
    ed.focus();
    c.run();
  }
  function slashKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); slashIdx = (slashIdx + 1) % slashHits.length; drawSlash(); return true; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); slashIdx = (slashIdx - 1 + slashHits.length) % slashHits.length; drawSlash(); return true; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); runSlash(slashIdx); return true; }
    if (e.key === 'Escape')    { e.preventDefault(); closeSlash(); return true; }
    return false;
  }
  slash.addEventListener('mousedown', function (e) {
    var it = e.target.closest('.slash-item');
    if (!it) return;
    e.preventDefault();
    runSlash(+it.getAttribute('data-i'));
  });

  ed.addEventListener('input', function () {
    var pos = ed.selectionStart;
    if (slash.hidden) {
      /* 줄 처음이나 공백 뒤의 '/' 에서만 메뉴를 엽니다 */
      if (ed.value[pos - 1] === '/' && (pos === 1 || /\s/.test(ed.value[pos - 2]))) openSlash(pos - 1);
      return;
    }
    if (pos <= slashAt || /\s/.test(ed.value.slice(slashAt + 1, pos))) { closeSlash(); return; }
    drawSlash();
  });

  /* ── 선택 서식바 ────────────────────────────────── */
  selBar.innerHTML =
    '<button data-a="b"><b>B</b></button>' +
    '<button data-a="i"><i>I</i></button>' +
    '<button data-a="e">`코드`</button>' +
    '<span class="sb-sep"></span>' +
    '<button data-a="1">제목</button>' +
    '<button data-a="3">인용</button>' +
    '<span class="sb-sep"></span>' +
    '<button data-a="k">링크</button>' +
    '<button data-a="sn">여백주석</button>';

  selBar.addEventListener('mousedown', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    e.preventDefault();                       /* 선택을 잃지 않도록 */
    var a = b.getAttribute('data-a');
    if (a === 'sn') surround('^[', ']', '설명');
    else if (SHORTCUT[a]) SHORTCUT[a]();
    hideBar();
  });
  function hideBar() { selBar.hidden = true; }

  function updateBar() {
    if (ed.selectionStart === ed.selectionEnd) { hideBar(); return; }
    selBar.hidden = false;
    /* 선택 시작 지점 위에 띄움 */
    anchorTo(selBar, ed.selectionStart, 'above');
  }
  ed.addEventListener('mouseup', function () { setTimeout(updateBar, 0); });
  ed.addEventListener('keyup', function (e) {
    if (e.shiftKey || e.key.indexOf('Arrow') === 0) setTimeout(updateBar, 0);
    else if (ed.selectionStart === ed.selectionEnd) hideBar();
  });
  ed.addEventListener('blur', function () { setTimeout(hideBar, 120); });
  ed.addEventListener('scroll', function () { hideBar(); closeSlash(); });

  /* ── 똑똑한 붙여넣기 ───────────────────────────── */
  ed.addEventListener('paste', function (e) {
    var text = (e.clipboardData || window.clipboardData).getData('text');
    if (!text || !/^https?:\/\/\S+$/.test(text.trim())) return;
    var s = ed.selectionStart, e2 = ed.selectionEnd;
    if (s === e2) return;                     /* 선택이 있을 때만 링크로 */
    e.preventDefault();
    var sel = ed.value.slice(s, e2);
    setRange(s, e2, '[' + sel + '](' + text.trim() + ')');
  });

  /* ── 집중 모드 · 고정폭 토글 (선택은 기억됩니다) ── */
  function bindToggle(id, cls, key) {
    var btn = document.getElementById(id);
    if (!btn) return;
    function apply(on) {
      document.body.classList.toggle(cls, on);
      btn.setAttribute('aria-pressed', on);
      try { localStorage.setItem(key, on ? '1' : '0'); } catch (err) {}
    }
    var saved = '0';
    try { saved = localStorage.getItem(key) || '0'; } catch (err) {}
    apply(saved === '1');
    btn.addEventListener('click', function () {
      apply(btn.getAttribute('aria-pressed') !== 'true');
    });
  }
  bindToggle('tg-focus', 'focus-write', 'w-focus');
  bindToggle('tg-mono', 'mono-editor', 'w-mono');

  /* 힌트 줄의 '도움말' → 오른쪽 도움말 탭 열기 */
  var more = document.getElementById('hint-more');
  if (more) {
    more.addEventListener('click', function (e) {
      e.preventDefault();
      var tab = document.querySelector('.w-tabs button[data-tab="help"]');
      if (tab) tab.click();
      if (document.body.classList.contains('focus-write')) {
        document.getElementById('tg-focus').click();   /* 집중 모드면 미리보기를 다시 펴 줌 */
        if (tab) tab.click();
      }
    });
  }
})();
