/* ============================================================
   sync.js — 편집칸 ↔ 미리보기 양방향 이동 (SyncTeX 식)

     Ctrl(⌘) + 클릭  왼쪽에서 → 미리보기가 그 자리로 이동 + 1초 강조
                     오른쪽에서 → 편집칸 커서가 그 줄로 이동
     F7              마우스 없이 커서 위치를 미리보기로 보내기

   원리: write.js 의 파서가 블록마다 data-src="원문 줄번호" 를 새겨 둡니다.
   그래서 문자열을 뒤져 짐작하지 않고 정확한 줄로 갑니다.
   ============================================================ */

(function () {
  var W = window.WRITE;
  if (!W) return;
  var ed = W.ed, pv = W.$('#preview');
  if (!ed || !pv) return;

  var smooth = !(window.matchMedia &&
                 window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ── 편집칸: 문자 위치 ↔ 줄번호 ────────────────── */
  function lineAt(pos) {
    return ed.value.slice(0, pos).split('\n').length - 1;
  }
  function posOfLine(line) {
    var L = ed.value.split('\n'), pos = 0;
    for (var i = 0; i < line && i < L.length; i++) pos += L[i].length + 1;
    return pos;
  }

  /* ── 왼쪽 → 오른쪽 ──────────────────────────────
     커서가 있는 줄을 담당하는 블록 = data-src 가 그 줄 이하인 것 중 마지막 */
  function blockForLine(line) {
    var best = null;
    pv.querySelectorAll('[data-src]').forEach(function (el) {
      var n = +el.getAttribute('data-src');
      if (n <= line && (!best || n >= +best.getAttribute('data-src'))) best = el;
    });
    return best;
  }

  function flash(el) {
    el.classList.remove('sync-hit');
    void el.offsetWidth;                   /* 연달아 눌러도 다시 켜지도록 */
    el.classList.add('sync-hit');
    setTimeout(function () { el.classList.remove('sync-hit'); }, 1000);
  }

  /* Element.scrollTo 가 없는 환경도 있으므로 항상 대비책을 둡니다 */
  function scrollBox(box, top) {
    top = Math.max(0, top);
    if (box.scrollTo) box.scrollTo({ top: top, behavior: smooth ? 'smooth' : 'auto' });
    else box.scrollTop = top;
  }

  function toPreview() {
    var el = blockForLine(lineAt(ed.selectionStart));
    if (!el) return;
    flash(el);                             /* 스크롤이 실패해도 표시는 남도록 먼저 */
    /* 미리보기 칸 안에서만 굴립니다 (페이지 전체가 튀지 않도록) */
    var box = pv.getBoundingClientRect(), r = el.getBoundingClientRect();
    scrollBox(pv, pv.scrollTop + (r.top - box.top) - (pv.clientHeight - r.height) / 2);
  }

  /* ── 오른쪽 → 왼쪽 ─────────────────────────────── */
  function toEditor(target) {
    var el = target && target.nodeType === 1 ? target : (target && target.parentNode);
    el = el && el.closest ? el.closest('[data-src]') : null;
    if (!el || !pv.contains(el)) return false;

    var pos = posOfLine(+el.getAttribute('data-src'));
    ed.focus();
    ed.setSelectionRange(pos, pos);

    /* 그 줄이 편집칸 가운데쯤 오도록 */
    var lineH = parseFloat(getComputedStyle(ed).lineHeight) || 22;
    scrollBox(ed, lineAt(pos) * lineH - ed.clientHeight * 0.4);

    ed.classList.add('flash-find');
    setTimeout(function () { ed.classList.remove('flash-find'); }, 700);
    return true;
  }

  /* ── 조작 ───────────────────────────────────────
     Ctrl+클릭을 쓰되, 미리보기의 링크는 새 탭이 열리지 않게 막습니다.
     맥에서는 Ctrl+클릭이 우클릭이라 ⌘(metaKey)도 함께 받습니다. */
  function modified(e) { return e.ctrlKey || e.metaKey; }

  ed.addEventListener('click', function (e) {
    if (!modified(e)) return;
    e.preventDefault();
    toPreview();
  });

  pv.addEventListener('click', function (e) {
    if (!modified(e)) return;
    if (toEditor(e.target)) e.preventDefault();
  });

  /* 마우스 없이 — F7 로 커서 위치를 미리보기로 */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'F7') { e.preventDefault(); toPreview(); }
  });

  /* 기존의 '선택하면 따라가기'가 Ctrl+클릭까지 가로채지 않도록 */
  pv.addEventListener('mousedown', function (e) {
    pv.dataset.mod = modified(e) ? '1' : '';
  });
  W.syncGuard = function () { return pv.dataset.mod === '1'; };

  /* Ctrl 을 누르고 있는 동안 누를 수 있는 곳을 보여 줍니다 */
  function ready(on) { document.body.classList.toggle('sync-ready', on); }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Control' || e.key === 'Meta') ready(true);
  });
  document.addEventListener('keyup', function (e) {
    if (e.key === 'Control' || e.key === 'Meta') ready(false);
  });
  window.addEventListener('blur', function () { ready(false); });
}());
