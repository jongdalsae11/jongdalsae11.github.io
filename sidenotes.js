/* ============================================================
   여백주석 배치 — 글 페이지에서 본문 옆 여백에 주석을 정렬합니다.
   넓은 화면에서만 동작하고, 좁으면 본문 흐름 안에 그대로 둡니다.
   ============================================================ */
(function () {
  var col = document.getElementById('sidenoteCol');
  if (!col) return;

  function layout() {
    if (window.innerWidth <= 1100) { col.innerHTML = ''; return; }
    col.innerHTML = '';
    var wrap = document.querySelector('.post-wrap');
    if (!wrap) return;
    var wrapTop = wrap.getBoundingClientRect().top;
    var lastBottom = 0;

    document.querySelectorAll('.sidenote-ref').forEach(function (ref) {
      var id = ref.dataset.sn;
      var src = document.querySelector('.sidenote-inline[data-sn="' + id + '"]');
      if (!src) return;

      var note = document.createElement('div');
      note.className = 'sidenote';
      note.innerHTML = src.innerHTML;
      note.style.position = 'absolute';
      col.appendChild(note);

      var top = ref.getBoundingClientRect().top - wrapTop;
      if (top < lastBottom) top = lastBottom;
      note.style.top = top + 'px';
      lastBottom = top + note.offsetHeight + 16;
    });
  }

  window.addEventListener('load', layout);
  window.addEventListener('resize', layout);
})();
