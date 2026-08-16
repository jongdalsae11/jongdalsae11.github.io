/* ============================================================
   progress.js — 우측 세로 읽기 진행 레일
   회색 트랙 + 시작/끝점 + 시작점→현재 위치까지 보라 그라데이션
   + 트랙 폭보다 작은 보라색 원형 썸. 클릭하면 해당 위치로 이동.
   ============================================================ */

(function () {
  function docHeight() {
    return document.documentElement.scrollHeight - window.innerHeight;
  }

  /* 스크롤할 내용이 거의 없으면 표시하지 않음 */
  if (docHeight() < window.innerHeight * 0.25) return;

  document.body.insertAdjacentHTML('beforeend',
    '<div class="rail" aria-hidden="true">' +
      '<div class="rail-track"></div>' +
      '<span class="rail-cap rail-cap--top"></span>' +
      '<span class="rail-cap rail-cap--bot"></span>' +
      '<div class="rail-fill"></div>' +
      '<div class="rail-dot"></div>' +
    '</div>');

  var rail = document.querySelector('.rail');
  var fill = rail.querySelector('.rail-fill');
  var dot  = rail.querySelector('.rail-dot');

  function update() {
    var h = docHeight();
    var p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
    var railH = rail.clientHeight;
    var y = p * (railH - 6);          /* 썸 지름만큼 보정 */
    fill.style.height = (y + 3) + 'px';
    dot.style.top = y + 'px';
  }

  /* 클릭 이동 + 끌어서 이동 (드래그) */
  function seek(clientY) {
    var r = rail.getBoundingClientRect();
    var p = (clientY - r.top) / r.height;
    p = Math.min(1, Math.max(0, p));
    window.scrollTo(0, p * docHeight());
  }

  var dragging = false;
  rail.addEventListener('pointerdown', function (e) {
    dragging = true;
    rail.setPointerCapture(e.pointerId);
    rail.classList.add('dragging');
    document.body.classList.add('rail-dragging');
    seek(e.clientY);
    e.preventDefault();
  });
  rail.addEventListener('pointermove', function (e) {
    if (dragging) seek(e.clientY);
  });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    try { rail.releasePointerCapture(e.pointerId); } catch (err) {}
    rail.classList.remove('dragging');
    document.body.classList.remove('rail-dragging');
  }
  rail.addEventListener('pointerup', endDrag);
  rail.addEventListener('pointercancel', endDrag);

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
