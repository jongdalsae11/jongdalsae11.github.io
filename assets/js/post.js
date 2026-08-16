/* ============================================================
   post.js — 글 읽기 페이지 전용
   1) 여백주석: 본문 속 <span class="sidenote">내용</span> 에
      번호를 붙이고, 넓은 화면에선 우측 여백 컬럼으로 이동시켜
      참조 위치와 같은 높이에 배치. 좁은 화면에선 본문 안 박스.
   2) 인용 관계 미니 그래프: #cite-graph 의 data-* 를 읽어 SVG 렌더.
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ── 1. 여백주석 ─────────────────────────────────── */
  var body = document.querySelector('.post-body');
  var marginCol = document.querySelector('.margin-col');
  var notes = body ? Array.prototype.slice.call(body.querySelectorAll('.sidenote')) : [];
  var refs = [];

  notes.forEach(function (note, i) {
    var no = i + 1;
    var ref = document.createElement('sup');
    ref.className = 'sn-ref';
    ref.textContent = no;
    note.parentNode.insertBefore(ref, note);
    var label = document.createElement('span');
    label.className = 'sn-no';
    label.textContent = no;
    note.insertBefore(label, note.firstChild);
    refs.push(ref);
  });

  var wide = false;
  function layout() {
    if (!marginCol || !notes.length) return;
    var shouldWide = window.matchMedia('(min-width: 1181px)').matches;
    if (shouldWide === wide && shouldWide === false) return;
    wide = shouldWide;

    if (!wide) {           /* 본문 흐름으로 복귀 */
      notes.forEach(function (note, i) {
        refs[i].parentNode.insertBefore(note, refs[i].nextSibling);
      });
      return;
    }
    /* 여백 컬럼으로 이동 후 참조 높이에 정렬 (겹침 방지) */
    var colTop = marginCol.getBoundingClientRect().top + window.scrollY;
    var lastBottom = 0;
    notes.forEach(function (note, i) {
      marginCol.appendChild(note);
      var refTop = refs[i].getBoundingClientRect().top + window.scrollY;
      var top = Math.max(refTop - colTop, lastBottom);
      note.style.top = top + 'px';
      lastBottom = top + note.offsetHeight + 14;
    });
    marginCol.style.minHeight = lastBottom + 'px';
  }
  layout();
  window.addEventListener('resize', layout);
  /* 폰트/수식 로딩 후 위치 보정 */
  window.addEventListener('load', function () { setTimeout(layout, 120); });

  /* ── 2. 인용 관계 미니 그래프 ────────────────────── */
  var g = document.getElementById('cite-graph');
  if (!g) return;
  var me = g.getAttribute('data-me') || '이 글';
  var cites = (g.getAttribute('data-cites') || '').split('|').filter(Boolean);
  var citedBy = (g.getAttribute('data-cited-by') || '').split('|').filter(Boolean);

  var W = 640, rowH = 40;
  var H = Math.max(cites.length, citedBy.length, 1) * rowH + 50;
  var midY = H / 2;
  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">';

  function nodeAt(x, y, label, isMe, anchor) {
    var cls = isMe ? 'cg-node cg-node--me' : 'cg-node';
    var lcls = isMe ? 'cg-label cg-label--me' : 'cg-label';
    var short = label.length > 16 ? label.slice(0, 15) + '…' : label;
    var tx = anchor === 'end' ? x - 12 : (anchor === 'start' ? x + 12 : x);
    var ty = anchor === 'middle' ? y - 14 : y + 4;
    return '<circle class="' + cls + '" cx="' + x + '" cy="' + y + '" r="7"/>' +
           '<text class="' + lcls + '" x="' + tx + '" y="' + ty +
           '" text-anchor="' + (anchor || 'middle') + '">' + short + '</text>';
  }

  var edges = '', nds = '';
  cites.forEach(function (label, i) {
    var y = 40 + i * rowH;
    edges += '<path class="cg-edge" fill="none" d="M' + (W / 2 - 8) + ',' + midY +
             ' C' + (W / 2 - 90) + ',' + midY + ' ' + 200 + ',' + y + ' 128,' + y + '"/>';
    nds += nodeAt(120, y, label, false, 'end');
  });
  citedBy.forEach(function (label, i) {
    var y = 40 + i * rowH;
    edges += '<path class="cg-edge" fill="none" d="M' + (W / 2 + 8) + ',' + midY +
             ' C' + (W / 2 + 90) + ',' + midY + ' ' + (W - 200) + ',' + y + ' ' + (W - 128) + ',' + y + '"/>';
    nds += nodeAt(W - 120, y, label, false, 'start');
  });
  nds += nodeAt(W / 2, midY, me, true, 'middle');

  g.innerHTML = svg + edges + nds + '</svg>';
});
