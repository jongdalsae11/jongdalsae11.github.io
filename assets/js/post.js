/* ============================================================
   post.js — 글 읽기 페이지
   1) 여백주석: 넓은 화면 → 우측 여백 / 좁은 화면 → 바텀 시트
   2) 인용 마크 <span class="cite" data-ref="Ref-A01"></span>
      → 자료정리집 정보를 자동으로 여백주석에 띄움
   3) 인용 관계 미니 그래프
   4) 본문 드래그 → 부분 코멘트 (GitHub 이슈로 전달)
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  var body = document.querySelector('.post-body');
  if (!body) return;
  var marginCol = document.querySelector('.margin-col');
  var S = window.SITE || {};

  /* ── 2. 인용 마크 → 자료 정보를 여백주석으로 변환 ── */
  var ROOT = window.ROOT || '.';
  body.querySelectorAll('.cite[data-ref]').forEach(function (mark) {
    var id = mark.getAttribute('data-ref');
    var r = (S.library || []).filter(function (x) { return x.ref === id; })[0];
    var note = document.createElement('span');
    note.className = 'sidenote sidenote--ref';

    if (r) {
      /* '자료정리집에서 보기' → 해당 자료가 있는 분류를 열고 그 항목을 강조 */
      var libLink = ' <a href="' + ROOT + '/library.html#' + r.ref + '">자료정리집에서 보기</a>';
      var srcLink = (r.url && r.url !== '#')
        ? ' · <a href="' + r.url + '"' +
          (/^https?:/.test(r.url) ? ' target="_blank" rel="noopener"' : '') + '>원문</a>'
        : '';
      note.innerHTML = '<span class="sn-cite">[' + r.ref + ']</span> ' + r.title +
        (r.author ? ' · ' + r.author : '') + (r.year ? ' (' + r.year + ')' : '') +
        libLink + srcLink;
    } else {
      note.innerHTML = '<span class="sn-cite">[' + id + ']</span> ' +
        '자료정리집에 등록되지 않은 인용입니다. content.js 의 library 를 확인하세요.';
    }
    mark.parentNode.insertBefore(note, mark.nextSibling);
    mark.remove();
  });

  /* ── 1. 여백주석 번호 매기기 ── */
  var notes = Array.prototype.slice.call(body.querySelectorAll('.sidenote'));
  var refs = [];
  notes.forEach(function (note, i) {
    var no = i + 1;
    var ref = document.createElement('sup');
    ref.className = 'sn-ref';
    ref.textContent = no;
    ref.setAttribute('role', 'button');
    ref.setAttribute('tabindex', '0');
    note.parentNode.insertBefore(ref, note);
    var lbl = document.createElement('span');
    lbl.className = 'sn-no';
    lbl.textContent = no;
    note.insertBefore(lbl, note.firstChild);
    refs.push(ref);

    /* 좁은 화면: 번호를 누르면 바텀 시트 */
    ref.addEventListener('click', function () {
      if (window.matchMedia('(min-width: 1181px)').matches) return;
      openSheet(no, note.innerHTML);
    });
  });

  var wide = null;
  function layout() {
    if (!marginCol || !notes.length) return;
    var shouldWide = window.matchMedia('(min-width: 1181px)').matches;

    if (!shouldWide) {
      if (wide !== false) {
        notes.forEach(function (note, i) {
          note.style.top = '';
          refs[i].parentNode.insertBefore(note, refs[i].nextSibling);
        });
        wide = false;
      }
      return;
    }
    wide = true;
    var colTop = marginCol.getBoundingClientRect().top + window.scrollY;
    var lastBottom = 0;
    notes.forEach(function (note, i) {
      if (note.parentNode !== marginCol) marginCol.appendChild(note);
      var refTop = refs[i].getBoundingClientRect().top + window.scrollY;
      var top = Math.max(refTop - colTop, lastBottom);
      note.style.top = top + 'px';
      lastBottom = top + note.offsetHeight + 14;
    });
    marginCol.style.minHeight = lastBottom + 'px';
  }
  layout();
  window.addEventListener('resize', layout);
  window.addEventListener('load', function () { setTimeout(layout, 150); });

  /* 바텀 시트 (모바일) — 화면 절반만 덮고, 아래로 쓸어내리면 닫힘 */
  document.body.insertAdjacentHTML('beforeend',
    '<div class="sheet" id="sheet" hidden><div class="sheet-panel">' +
      '<div class="sheet-grip"></div>' +
      '<div class="sheet-body" id="sheet-body"></div>' +
    '</div></div>');
  var sheet = document.getElementById('sheet');
  var sheetBody = document.getElementById('sheet-body');
  function openSheet(no, html) {
    sheetBody.innerHTML = html;
    sheet.hidden = false;
    requestAnimationFrame(function () { sheet.classList.add('on'); });
  }
  function closeSheet() {
    sheet.classList.remove('on');
    setTimeout(function () { sheet.hidden = true; }, 220);
  }
  sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });
  var sy = null;
  sheet.addEventListener('touchstart', function (e) { sy = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchmove', function (e) {
    if (sy !== null && e.touches[0].clientY - sy > 60) { closeSheet(); sy = null; }
  }, { passive: true });

  /* ── 4. 드래그 코멘트 (부분 피드백) ── */
  var GH_REPO = 'jongdalsae11/jongdalsae11.github.io';
  document.body.insertAdjacentHTML('beforeend',
    '<button class="sel-btn" id="sel-btn" hidden>이 부분에 코멘트</button>');
  var selBtn = document.getElementById('sel-btn');
  var savedText = '';

  document.addEventListener('selectionchange', function () {
    var sel = document.getSelection();
    if (!sel || sel.isCollapsed) { selBtn.hidden = true; return; }
    var node = sel.anchorNode;
    if (!node || !body.contains(node.nodeType === 1 ? node : node.parentNode)) {
      selBtn.hidden = true; return;
    }
    var text = sel.toString().trim();
    if (text.length < 4) { selBtn.hidden = true; return; }
    savedText = text;
    var r = sel.getRangeAt(0).getBoundingClientRect();
    selBtn.style.top = (r.top + window.scrollY - 38) + 'px';
    selBtn.style.left = (r.left + r.width / 2) + 'px';
    selBtn.hidden = false;
  });

  selBtn.addEventListener('click', function () {
    var quote = savedText.length > 280 ? savedText.slice(0, 280) + '…' : savedText;
    var title = '피드백: ' + document.title.split(' — ')[0];
    var url2 = 'https://github.com/' + GH_REPO + '/issues/new' +
      '?title=' + encodeURIComponent(title) +
      '&body=' + encodeURIComponent(
        '> ' + quote.replace(/\n/g, '\n> ') + '\n\n' +
        '(위 부분에 대한 의견을 적어주세요)\n\n---\n출처: ' + location.href);
    window.open(url2, '_blank', 'noopener');
    selBtn.hidden = true;
  });

  /* ── 3. 인용 관계 미니 그래프 ── */
  var g = document.getElementById('cite-graph');
  if (!g) return;
  var me = g.getAttribute('data-me') || '이 글';
  var cites = (g.getAttribute('data-cites') || '').split('|').filter(Boolean);
  var citedBy = (g.getAttribute('data-cited-by') || '').split('|').filter(Boolean);

  var W = 640, rowH = 40;
  var H = Math.max(cites.length, citedBy.length, 1) * rowH + 50;
  var midY = H / 2;

  function nodeAt(x, y, text, isMe, anchor) {
    var cls = isMe ? 'cg-node cg-node--me' : 'cg-node';
    var lcls = isMe ? 'cg-label cg-label--me' : 'cg-label';
    var short = text.length > 16 ? text.slice(0, 15) + '…' : text;
    var tx = anchor === 'end' ? x - 12 : (anchor === 'start' ? x + 12 : x);
    var ty = anchor === 'middle' ? y - 14 : y + 4;
    return '<circle class="' + cls + '" cx="' + x + '" cy="' + y + '" r="7"/>' +
           '<text class="' + lcls + '" x="' + tx + '" y="' + ty +
           '" text-anchor="' + (anchor || 'middle') + '">' + short + '</text>';
  }

  var edges = '', nds = '';
  cites.forEach(function (t, i) {
    var y = 40 + i * rowH;
    edges += '<path class="cg-edge" fill="none" d="M' + (W / 2 - 8) + ',' + midY +
             ' C' + (W / 2 - 90) + ',' + midY + ' 200,' + y + ' 128,' + y + '"/>';
    nds += nodeAt(120, y, t, false, 'end');
  });
  citedBy.forEach(function (t, i) {
    var y = 40 + i * rowH;
    edges += '<path class="cg-edge" fill="none" d="M' + (W / 2 + 8) + ',' + midY +
             ' C' + (W / 2 + 90) + ',' + midY + ' ' + (W - 200) + ',' + y + ' ' + (W - 128) + ',' + y + '"/>';
    nds += nodeAt(W - 120, y, t, false, 'start');
  });
  nds += nodeAt(W / 2, midY, me, true, 'middle');

  g.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">' +
                edges + nds + '</svg>';
});
