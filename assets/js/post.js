/* ============================================================
   post.js — 글 읽기 페이지
   1) 여백주석: 넓은 화면 → 우측 여백 / 좁은 화면 → 바텀 시트
   2) {{Ref-xx}} 인용 → 자료정리집 정보 자동 삽입
   3) 백링크 두 목록 + 인용 관계 그래프를 content.js 에서 자동 생성
   4) 읽는 시간 · 이전/다음 글 이동
   5) 본문 드래그 → 부분 코멘트 (GitHub 이슈로 전달)
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  var body = document.querySelector('.post-body');
  if (!body) return;

  var U = window.U;
  var S = window.SITE || {};
  var ROOT = window.ROOT || '.';
  var marginCol = document.querySelector('.margin-col');
  var here = location.pathname.split('/').pop();
  var me = U.postByFile(here);

  /* ── 2. 인용 마크 → 자료 정보를 여백주석으로 ────── */
  body.querySelectorAll('.cite[data-ref]').forEach(function (mark) {
    var id = mark.getAttribute('data-ref');
    var r = U.refById(id);
    var note = document.createElement('span');
    note.className = 'sidenote sidenote--ref';

    if (r) {
      note.innerHTML = '<span class="sn-cite">[' + U.esc(r.ref) + ']</span> ' + U.esc(r.title) +
        (r.author ? ' · ' + U.esc(r.author) : '') + (r.year ? ' (' + r.year + ')' : '') +
        ' <a href="' + ROOT + '/library.html#' + encodeURIComponent(r.ref) + '">자료정리집에서 보기</a>' +
        (U.real(r.url)
          ? ' · <a href="' + r.url + '"' +
            (/^https?:/.test(r.url) ? ' target="_blank" rel="noopener"' : '') + '>원문</a>'
          : '');
    } else {
      note.innerHTML = '<span class="sn-cite">[' + U.esc(id) + ']</span> ' +
        '자료정리집에 등록되지 않은 인용입니다. content.js 의 library 를 확인하세요.';
    }
    mark.parentNode.insertBefore(note, mark.nextSibling);
    mark.remove();
  });

  /* ── 4. 읽는 시간 (한국어 분당 500자 기준) ──────── */
  var chars = body.textContent.replace(/\s+/g, '').length;
  var mins = Math.max(1, Math.round(chars / 500));
  var metaBar = document.querySelector('.post-meta');
  if (metaBar && !metaBar.querySelector('.read-time')) {
    var rt = document.createElement('span');
    rt.className = 'read-time';
    rt.textContent = '읽는 데 약 ' + mins + '분';
    metaBar.appendChild(rt);
  }

  /* ── 목차 — 소제목이 3개 이상일 때만 ────────────── */
  var heads = Array.prototype.slice.call(body.querySelectorAll('h2, h3'));
  if (heads.length >= 3) {
    heads.forEach(function (h, i) {
      if (!h.id) h.id = 'h-' + (i + 1) + '-' + U.slug(h.textContent).slice(0, 24);
    });
    var toc = document.createElement('details');
    toc.className = 'toc';
    toc.open = true;
    toc.innerHTML = '<summary>목차 <span class="toc-n">' + heads.length + '</span></summary>' +
      '<ol>' + heads.map(function (h) {
        return '<li class="lv-' + h.tagName.toLowerCase() + '">' +
          '<a href="#' + h.id + '">' + U.esc(h.textContent) + '</a></li>';
      }).join('') + '</ol>';
    body.parentNode.insertBefore(toc, body);

    /* 현재 읽는 위치 표시 (지원하지 않는 브라우저에서는 목차만 표시) */
    if (window.IntersectionObserver) {
      var links = {};
      toc.querySelectorAll('a').forEach(function (a) {
        links[a.getAttribute('href').slice(1)] = a;
      });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          toc.querySelectorAll('a.on').forEach(function (a) { a.classList.remove('on'); });
          var a = links[en.target.id];
          if (a) a.classList.add('on');
        });
      }, { rootMargin: '-70px 0px -75% 0px' });
      heads.forEach(function (h) { io.observe(h); });
    }
  }

  /* ── 3. 백링크 + 인용 그래프 자동 생성 ──────────── */
  var section = document.querySelector('.backlinks');
  if (section && me) {
    var cites = (me.links || []).map(U.postByFile).filter(Boolean);
    var citedBy = (S.posts || []).filter(function (p) {
      return (p.links || []).indexOf(here) >= 0;
    });

    function listOf(items, emptyMsg) {
      if (!items.length) return '<li class="empty">' + emptyMsg + '</li>';
      return items.map(function (p) {
        return '<li><a href="./' + p.file + '">' + U.esc(p.title) + '</a>' +
          '<span class="bl-why">' + U.label(p.category) + ' · ' + U.dot(p.date) +
          (p.summary ? ' — ' + U.esc(p.summary) : '') + '</span></li>';
      }).join('');
    }

    section.innerHTML =
      '<h2>이 글이 인용한 글</h2>' +
      '<ul class="bl-list">' + listOf(cites, '없음') + '</ul>' +
      '<h2>이 글을 인용한 글</h2>' +
      '<ul class="bl-list">' + listOf(citedBy,
        '아직 없습니다. 다른 글의 links 에 이 파일을 넣으면 여기에 나타납니다.') + '</ul>' +
      ((cites.length || citedBy.length)
        ? '<h2>인용 관계</h2><div class="cite-graph" id="cite-graph"></div>' : '');

    /* 미니 그래프 */
    var g = document.getElementById('cite-graph');
    if (g) {
      var W = 640, rowH = 40;
      var H = Math.max(cites.length, citedBy.length, 1) * rowH + 50;
      var midY = H / 2;

      function node(x, y, text, isMe, anchor, href) {
        var cls = isMe ? 'cg-node cg-node--me' : 'cg-node';
        var lcls = isMe ? 'cg-label cg-label--me' : 'cg-label';
        var short = text.length > 16 ? text.slice(0, 15) + '…' : text;
        var tx = anchor === 'end' ? x - 12 : (anchor === 'start' ? x + 12 : x);
        var ty = anchor === 'middle' ? y - 14 : y + 4;
        var shape = '<circle class="' + cls + '" cx="' + x + '" cy="' + y + '" r="7"/>' +
          '<text class="' + lcls + '" x="' + tx + '" y="' + ty +
          '" text-anchor="' + anchor + '">' + U.esc(short) + '</text>';
        return href
          ? '<a href="' + href + '"><title>' + U.esc(text) + '</title>' + shape + '</a>'
          : shape;
      }

      var edges = '', nds = '';
      cites.forEach(function (p, i) {
        var y = 40 + i * rowH;
        edges += '<path class="cg-edge" fill="none" d="M' + (W / 2 - 8) + ',' + midY +
                 ' C' + (W / 2 - 90) + ',' + midY + ' 200,' + y + ' 128,' + y + '"/>';
        nds += node(120, y, p.title, false, 'end', './' + p.file);
      });
      citedBy.forEach(function (p, i) {
        var y = 40 + i * rowH;
        edges += '<path class="cg-edge" fill="none" d="M' + (W / 2 + 8) + ',' + midY +
                 ' C' + (W / 2 + 90) + ',' + midY + ' ' + (W - 200) + ',' + y +
                 ' ' + (W - 128) + ',' + y + '"/>';
        nds += node(W - 120, y, p.title, false, 'start', './' + p.file);
      });
      nds += node(W / 2, midY, me.title, true, 'middle', null);

      g.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" ' +
                    'role="img" aria-label="인용 관계 그래프">' + edges + nds + '</svg>';
    }
  }

  /* ── 4. 이전 / 다음 글 (같은 분류 안에서) ────────── */
  if (me) {
    var siblings = U.sortedPosts(me.category);
    var idx = siblings.findIndex(function (p) { return p.file === me.file; });
    var newer = idx > 0 ? siblings[idx - 1] : null;
    var older = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

    if (newer || older) {
      function side(p, dir, cls) {
        if (!p) return '<span class="pn-item pn-empty"></span>';
        return '<a class="pn-item ' + cls + '" href="./' + p.file + '">' +
          '<span class="pn-dir">' + dir + '</span>' +
          '<span class="pn-title">' + U.esc(p.title) + '</span></a>';
      }
      var nav = document.createElement('nav');
      nav.className = 'post-nav';
      nav.setAttribute('aria-label', U.label(me.category) + ' 글 이동');
      nav.innerHTML = side(older, '← 이전 글', 'pn-prev') + side(newer, '다음 글 →', 'pn-next');
      var article = document.querySelector('article');
      if (article) article.appendChild(nav);
    }
  }

  /* ── 1. 여백주석 배치 ───────────────────────────── */
  var notes = Array.prototype.slice.call(body.querySelectorAll('.sidenote'));
  var refs = [];
  notes.forEach(function (note, i) {
    var no = i + 1;
    var ref = document.createElement('sup');
    ref.className = 'sn-ref';
    ref.textContent = no;
    ref.setAttribute('role', 'button');
    ref.setAttribute('tabindex', '0');
    ref.setAttribute('aria-label', '주석 ' + no + ' 보기');
    note.parentNode.insertBefore(ref, note);
    var lbl = document.createElement('span');
    lbl.className = 'sn-no';
    lbl.textContent = no;
    note.insertBefore(lbl, note.firstChild);
    refs.push(ref);

    function open() {
      if (window.matchMedia('(min-width: 1181px)').matches) return;
      openSheet(note.innerHTML);
    }
    ref.addEventListener('click', open);
    ref.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
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

  /* 바텀 시트 (좁은 화면) */
  document.body.insertAdjacentHTML('beforeend',
    '<div class="sheet" id="sheet" hidden><div class="sheet-panel" role="dialog" aria-label="주석">' +
      '<div class="sheet-grip"></div><div class="sheet-body" id="sheet-body"></div>' +
    '</div></div>');
  var sheet = document.getElementById('sheet');
  var sheetBody = document.getElementById('sheet-body');
  function openSheet(html) {
    sheetBody.innerHTML = html;
    sheet.hidden = false;
    requestAnimationFrame(function () { sheet.classList.add('on'); });
  }
  function closeSheet() {
    sheet.classList.remove('on');
    setTimeout(function () { sheet.hidden = true; }, 220);
  }
  sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !sheet.hidden) closeSheet();
  });
  var sy = null;
  sheet.addEventListener('touchstart', function (e) { sy = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchmove', function (e) {
    if (sy !== null && e.touches[0].clientY - sy > 60) { closeSheet(); sy = null; }
  }, { passive: true });

  /* ── 5. 드래그 코멘트 ───────────────────────────── */
  var GH_REPO = 'jongdalsae11/jongdalsae11.github.io';
  document.body.insertAdjacentHTML('beforeend',
    '<button class="sel-btn" id="sel-btn" hidden>이 부분에 코멘트</button>');
  var selBtn = document.getElementById('sel-btn');
  var savedText = '';

  document.addEventListener('selectionchange', function () {
    var sel = document.getSelection();
    if (!sel || sel.isCollapsed) { selBtn.hidden = true; return; }
    var n = sel.anchorNode;
    if (!n || !body.contains(n.nodeType === 1 ? n : n.parentNode)) { selBtn.hidden = true; return; }
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
    var url = 'https://github.com/' + GH_REPO + '/issues/new' +
      '?title=' + encodeURIComponent('피드백: ' + document.title.split(' — ')[0]) +
      '&body=' + encodeURIComponent(
        '> ' + quote.replace(/\n/g, '\n> ') + '\n\n(위 부분에 대한 의견)\n\n---\n' + location.href);
    window.open(url, '_blank', 'noopener');
    selBtn.hidden = true;
  });
});
