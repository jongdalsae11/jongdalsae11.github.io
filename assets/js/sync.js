/* ============================================================
   sync.js — 편집칸 ↔ 미리보기 양방향 이동 (SyncTeX 식, 글자 단위)

     Ctrl(⌘·Alt) + 클릭   왼쪽에서 → 미리보기의 그 "낱말"로 이동 + 1초 강조
                          오른쪽에서 → 편집칸 커서가 그 "글자"로 이동
     F7                   마우스 없이 커서 위치를 미리보기로 보내기

   원리
     1) write.js 의 파서가 블록마다 data-src="원문 줄번호" 를 새깁니다.
     2) 블록 안에서는 글자·숫자만 남긴 사본을 양쪽에서 만들어 번호를 맞춥니다.
        (** ` [[ ]] 같은 표시 문자는 렌더되면 사라지므로, 그것들을 뺀 뒤
         비교하면 원문과 화면의 글자가 거의 1:1 로 대응합니다)
   ============================================================ */

(function () {
  var W = window.WRITE;
  if (!W) return;
  var ed = W.ed, pv = W.$('#preview');
  if (!ed || !pv) return;

  var smooth = !(window.matchMedia &&
                 window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ── 기본 좌표 변환 ─────────────────────────────── */
  function lineAt(pos) { return ed.value.slice(0, pos).split('\n').length - 1; }
  function posOfLine(line) {
    var L = ed.value.split('\n'), pos = 0;
    for (var i = 0; i < line && i < L.length; i++) pos += L[i].length + 1;
    return pos;
  }
  function scrollBox(box, top) {
    top = Math.max(0, top);
    if (box.scrollTo) box.scrollTo({ top: top, behavior: smooth ? 'smooth' : 'auto' });
    else box.scrollTop = top;
  }

  /* 글자·숫자만 남긴 사본 + 원래 위치로 되짚는 지도 */
  function bare(s) {
    var t = '', map = [];
    for (var i = 0; i < s.length; i++) {
      if (/[0-9A-Za-zㄱ-ㆎ가-힣]/.test(s[i])) { t += s[i]; map.push(i); }
    }
    return { t: t, map: map };
  }
  function bareCountBefore(s, off) { return bare(s.slice(0, off)).t.length; }

  /* ── 블록 찾기 ──────────────────────────────────── */
  function marks() {
    return Array.prototype.slice.call(pv.querySelectorAll('[data-src]'));
  }
  /* 커서 줄을 담당하는 가장 안쪽 블록 */
  function blockForLine(line) {
    var best = null, bestN = -1;
    marks().forEach(function (el) {
      var n = +el.getAttribute('data-src');
      if (n <= line && n >= bestN) { best = el; bestN = n; }
    });
    return best;
  }
  /* 그 블록이 담당하는 원문 줄 범위 [from, to) */
  function blockLines(el) {
    var from = +el.getAttribute('data-src'), to = ed.value.split('\n').length;
    marks().forEach(function (x) {
      var n = +x.getAttribute('data-src');
      if (n > from && n < to) to = n;
    });
    return { from: from, to: to };
  }
  function blockSource(el) {
    var r = blockLines(el);
    return { text: ed.value.split('\n').slice(r.from, r.to).join('\n'),
             start: posOfLine(r.from) };
  }

  /* ── 렌더된 블록 안의 글자 위치 ↔ DOM 위치 ──────── */
  function pointAt(root, offset) {
    var walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var n, seen = 0;
    while ((n = walk.nextNode())) {
      var len = n.nodeValue.length;
      if (seen + len >= offset) return { node: n, offset: offset - seen };
      seen += len;
    }
    return null;
  }
  function offsetOfPoint(root, node, off) {
    var walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var n, seen = 0;
    while ((n = walk.nextNode())) {
      if (n === node) return seen + off;
      seen += n.nodeValue.length;
    }
    return 0;
  }

  /* ── 1초 강조 — DOM 을 건드리지 않고 위에 덧그립니다 ── */
  function flashRects(rects) {
    if (!rects || !rects.length) return;
    Array.prototype.forEach.call(rects, function (r) {
      if (!r.width && !r.height) return;
      var d = document.createElement('div');
      d.className = 'sync-mark';
      d.style.left = r.left + 'px';
      d.style.top = r.top + 'px';
      d.style.width = r.width + 'px';
      d.style.height = r.height + 'px';
      document.body.appendChild(d);
      setTimeout(function () { d.remove(); }, 1000);
    });
  }
  function flashBlock(el) {
    el.classList.remove('sync-hit');
    void el.offsetWidth;
    el.classList.add('sync-hit');
    setTimeout(function () { el.classList.remove('sync-hit'); }, 1000);
  }

  /* ══════════════════════════════════════════════════
     왼쪽 → 오른쪽
     ══════════════════════════════════════════════════ */
  function toPreview() {
    var pos = ed.selectionStart;
    var el = blockForLine(lineAt(pos));
    if (!el) return;

    /* 먼저 그 블록이 보이도록 */
    var box = pv.getBoundingClientRect(), r0 = el.getBoundingClientRect();
    scrollBox(pv, pv.scrollTop + (r0.top - box.top) - (pv.clientHeight - r0.height) / 2);

    /* 블록 안에서 커서가 몇 번째 글자인지 → 화면에서 같은 번째 글자 */
    var src = blockSource(el);
    var k = bareCountBefore(src.text, Math.max(0, pos - src.start));
    var shown = bare(el.textContent);
    if (!shown.t.length) { flashBlock(el); return; }

    var i = Math.min(k, shown.t.length - 1);
    /* 그 글자가 속한 낱말 전체로 넓힙니다 — 한 글자만 칠하면 눈에 안 띕니다.
       원래 위치가 붙어 있으면(간격 1) 같은 낱말, 벌어지면 공백을 건넌 것. */
    var a = i, b = i;
    while (a > 0 && shown.map[a] - shown.map[a - 1] === 1) a--;
    while (b < shown.t.length - 1 && shown.map[b + 1] - shown.map[b] === 1) b++;

    var p1 = pointAt(el, shown.map[a]);
    var p2 = pointAt(el, shown.map[b] + 1);
    if (!p1 || !p2) { flashBlock(el); return; }

    try {
      var rg = document.createRange();
      rg.setStart(p1.node, p1.offset);
      rg.setEnd(p2.node, p2.offset);
      /* 스크롤이 끝난 뒤 좌표를 재야 제자리에 그려집니다 */
      setTimeout(function () { flashRects(rg.getClientRects()); }, smooth ? 320 : 0);
    } catch (err) { flashBlock(el); }
  }

  /* ══════════════════════════════════════════════════
     오른쪽 → 왼쪽
     ══════════════════════════════════════════════════ */
  function caretFromPoint(x, y) {
    if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
    if (document.caretPositionFromPoint) {
      var p = document.caretPositionFromPoint(x, y);
      if (!p) return null;
      var r = document.createRange();
      r.setStart(p.offsetNode, p.offset);
      return r;
    }
    return null;
  }

  function toEditor(target, x, y) {
    var el = target && target.nodeType === 1 ? target : (target && target.parentNode);
    el = el && el.closest ? el.closest('[data-src]') : null;
    if (!el || !pv.contains(el)) return false;

    var src = blockSource(el);
    var pos = src.start;

    /* 누른 지점이 블록 안 몇 번째 글자인지 → 원문의 같은 번째 글자 */
    var rg = (x != null) ? caretFromPoint(x, y) : null;
    if (rg && el.contains(rg.startContainer)) {
      var off = offsetOfPoint(el, rg.startContainer, rg.startOffset);
      var k = bareCountBefore(el.textContent, off);
      var sb = bare(src.text);
      if (sb.t.length) pos = src.start + sb.map[Math.min(k, sb.t.length - 1)];
    }

    ed.focus();
    ed.setSelectionRange(pos, pos);
    var lineH = parseFloat(getComputedStyle(ed).lineHeight) || 22;
    scrollBox(ed, lineAt(pos) * lineH - ed.clientHeight * 0.4);
    ed.classList.add('flash-find');
    setTimeout(function () { ed.classList.remove('flash-find'); }, 700);
    return true;
  }

  /* ══════════════════════════════════════════════════
     조작 — Ctrl / ⌘ / Alt 아무거나
     ══════════════════════════════════════════════════ */
  function modified(e) { return e.ctrlKey || e.metaKey || e.altKey; }

  /* click 시점엔 커서가 아직 안 옮겨져 있을 수 있어 mouseup 뒤로 한 박자 미룹니다.
     (이것 때문에 편집칸 Ctrl+클릭이 엉뚱한 곳을 가리켰습니다) */
  ed.addEventListener('mouseup', function (e) {
    if (!modified(e)) return;
    setTimeout(toPreview, 0);
  });
  ed.addEventListener('click', function (e) { if (modified(e)) e.preventDefault(); });

  pv.addEventListener('click', function (e) {
    if (!modified(e)) return;
    if (toEditor(e.target, e.clientX, e.clientY)) e.preventDefault();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'F7') { e.preventDefault(); toPreview(); }
  });

  /* 기존의 '선택하면 따라가기'가 이 조작을 가로채지 않도록 */
  pv.addEventListener('mousedown', function (e) {
    pv.dataset.mod = modified(e) ? '1' : '';
  });
  W.syncGuard = function () { return pv.dataset.mod === '1'; };

  /* 누르고 있는 동안 어디를 클릭할 수 있는지 보여 줍니다 */
  function ready(on) { document.body.classList.toggle('sync-ready', on); }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Control' || e.key === 'Meta' || e.key === 'Alt') ready(true);
  });
  document.addEventListener('keyup', function (e) {
    if (e.key === 'Control' || e.key === 'Meta' || e.key === 'Alt') ready(false);
  });
  window.addEventListener('blur', function () { ready(false); });
}());
