/* ============================================================
   compose.js — 작성 편의 기능
   (write.js 다음에 로드되며 window.WRITE 를 통해 붙습니다)

     · 태그 추천     지금까지 쓴 태그를 많이 쓴 순서로
     · 수정          이미 올린 글·자료·문제·연구를 불러와 고치기
     · 전체화면      F9 로 화면 전체를 편집에 쓰기
   ============================================================ */

(function () {
  var W = window.WRITE;
  if (!W) return;
  var S = W.S, G = W.G, U = window.U, esc = U.esc;

  /* ══════════════════════════════════════════════════
     1. 태그 추천 — 많이 쓴 순서
     ══════════════════════════════════════════════════ */

  /* 사이트 전체에서 태그를 세어 빈도 내림차순으로 (동률이면 가나다) */
  function tagRank() {
    var n = {};
    ['posts', 'library', 'problems', 'research'].forEach(function (k) {
      (S[k] || []).forEach(function (it) {
        (it.tags || []).forEach(function (t) {
          t = String(t).trim();
          if (t) n[t] = (n[t] || 0) + 1;
        });
      });
    });
    return Object.keys(n)
      .sort(function (a, b) { return n[b] - n[a] || a.localeCompare(b, 'ko'); })
      .map(function (t) { return { tag: t, n: n[t] }; });
  }
  var RANK = tagRank();

  function parseTags(v) {
    return v.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  }

  /* 입력칸 하나에 추천 칩을 붙입니다 */
  function attachSuggest(input, limit) {
    if (!input) return;
    var box = document.createElement('div');
    box.className = 'tag-sug';
    input.closest('.w-field').insertAdjacentElement('afterend', box);

    function chosen() { return parseTags(input.value); }

    /* 마지막 쉼표 뒤에 치고 있는 조각 — 이걸로 후보를 좁힙니다 */
    function typing() {
      var parts = input.value.split(',');
      return parts[parts.length - 1].trim().toLowerCase();
    }

    function add(tag) {
      var list = chosen();
      var i = list.indexOf(tag);
      if (i >= 0) list.splice(i, 1);            /* 이미 있으면 뺍니다 (토글) */
      else {
        /* 치던 조각은 버리고 고른 태그로 대체 */
        if (typing()) list.pop();
        list.push(tag);
      }
      input.value = list.join(', ') + (list.length ? ', ' : '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
      draw();
    }

    function draw() {
      var q = typing(), have = chosen();
      var hits = RANK.filter(function (r) {
        return !q || r.tag.toLowerCase().indexOf(q) >= 0 || have.indexOf(r.tag) >= 0;
      }).slice(0, limit || 14);

      if (!hits.length) { box.innerHTML = ''; return; }
      box.innerHTML = '<b>자주 쓴 태그</b>' + hits.map(function (r) {
        var on = have.indexOf(r.tag) >= 0;
        return '<button type="button" class="' + (on ? 'on' : '') + '" data-tag="' +
               esc(r.tag) + '">' + esc(r.tag) + '<i>' + r.n + '</i></button>';
      }).join('');
    }

    box.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-tag]') : null;
      if (b) { e.preventDefault(); add(b.getAttribute('data-tag')); }
    });
    input.addEventListener('input', draw);
    input.addEventListener('focus', draw);
    draw();
  }

  ['f-tags', 'l-tags', 'p-tags', 'r-tags'].forEach(function (id) {
    attachSuggest(G(id));
  });

  /* ══════════════════════════════════════════════════
     2. 전체화면 (F9 · 나가기 Esc)
     ══════════════════════════════════════════════════ */
  (function () {
    var btn = G('tg-max');
    if (!btn) return;
    function set(on) {
      document.body.classList.toggle('w-max', on);
      btn.setAttribute('aria-pressed', String(on));
      window.dispatchEvent(new Event('resize'));
    }
    btn.addEventListener('click', function () {
      set(btn.getAttribute('aria-pressed') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'F9') { e.preventDefault(); btn.click(); }
      if (e.key === 'Escape' && document.body.classList.contains('w-max')) {
        /* 슬래시 메뉴·선택창이 열려 있으면 그쪽이 먼저 닫히도록 양보 */
        var busy = (G('slash') && !G('slash').hidden) || (G('picker') && !G('picker').hidden);
        if (!busy) set(false);
      }
    });
  }());

  /* 힌트 줄 숨기기 (한 번 익히면 계속 볼 필요가 없으므로) */
  (function () {
    var x = G('hint-x');
    if (!x) return;
    try {
      if (localStorage.getItem('hint-off') === '1') document.body.classList.add('hint-off');
    } catch (e) {}
    x.addEventListener('click', function () {
      document.body.classList.add('hint-off');
      try { localStorage.setItem('hint-off', '1'); } catch (e) {}
    });
  }());

  /* ══════════════════════════════════════════════════
     3. 수정 — 이미 올린 것을 불러와 고치기
     ══════════════════════════════════════════════════ */

  var bar = G('w-editing'), barFile = G('w-editing-file');

  function markEditing(name) {
    if (name) { barFile.textContent = name; bar.hidden = false; }
    else bar.hidden = true;
    document.body.classList.toggle('editing', !!name);
  }
  G('w-editing-off').addEventListener('click', function () {
    markEditing(null);
    history.replaceState(null, '', location.pathname);
  });

  /* ── 글 본문 되살리기 ─────────────────────────────
     내려받은 글에는 원고가 <script class="post-src"> 로 들어 있습니다.
     손으로 쓴 옛 글에는 없으므로 그때만 HTML 을 되짚어 옮깁니다.   */
  function htmlToSrc(body) {
    var out = [];

    function inline(el) {
      var s = '';
      el.childNodes.forEach(function (n) {
        /* HTML 들여쓰기용 줄바꿈·공백은 한 칸으로 (코드블록은 별도 처리) */
        if (n.nodeType === 3) { s += n.nodeValue.replace(/\s+/g, ' '); return; }
        if (n.nodeType !== 1) return;
        var t = n.tagName.toLowerCase(), inner = inline(n);
        if (n.classList.contains('sidenote')) s += '^[' + inner + ']';
        else if (n.classList.contains('cite')) s += '{{' + (n.getAttribute('data-ref') || inner) + '}}';
        else if (n.classList.contains('wikilink')) s += '[[' + inner + ']]';
        else if (t === 'strong' || t === 'b') s += '**' + inner + '**';
        else if (t === 'em' || t === 'i') s += '*' + inner + '*';
        else if (t === 'code') s += '`' + inner + '`';
        else if (t === 'a') s += '[' + inner + '](' + (n.getAttribute('href') || '') + ')';
        else if (t === 'br') s += '\n';
        else s += inner;
      });
      return s;
    }

    Array.prototype.forEach.call(body.children, function (el) {
      var t = el.tagName.toLowerCase();
      var one = function (x) { return x.replace(/\s+/g, ' ').trim(); };
      if (t === 'h2') out.push('## ' + one(inline(el)));
      else if (t === 'h3') out.push('### ' + one(inline(el)));
      else if (t === 'blockquote') out.push('> ' + one(inline(el)));
      else if (t === 'ul' || t === 'ol') {
        Array.prototype.forEach.call(el.children, function (li, i) {
          out.push((t === 'ol' ? (i + 1) + '. ' : '- ') + one(inline(li)));
        });
      } else if (el.classList.contains('key')) {
        out.push('!!' + one(inline(el)) + '!!');
      } else if (el.classList.contains('codeblock') || t === 'pre') {
        var code = el.querySelector('code');
        var lang = ((code && code.className) || '').replace(/.*language-/, '').split(/\s/)[0];
        out.push('```' + (lang || '') + '\n' + (code ? code.textContent : '') + '\n```');
      } else if (t === 'figure') {
        var img = el.querySelector('img'), cap = el.querySelector('figcaption');
        out.push('![' + (cap ? cap.textContent.replace(/^Fig \d+\./, '').trim() : '') +
                 '](' + ((img && img.getAttribute('src')) || '') + ')');
      } else if (t === 'hr') out.push('---');
      else if (t === 'table') out.push('<!-- 표는 자동 변환하지 않습니다 -->\n' + el.outerHTML);
      else out.push(one(inline(el)));
    });

    return out.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function loadPost(file) {
    var meta = (S.posts || []).filter(function (p) { return p.file === file; })[0];
    if (!meta) { alert('content.js 에 등록되지 않은 글입니다.'); return; }

    var F = W.F;
    F.title.value = meta.title || '';
    F.cat.value = meta.category || '';
    F.date.value = meta.date || '';
    F.tags.value = (meta.tags || []).join(', ');
    F.summary.value = meta.summary || '';
    F.pinned.checked = !!meta.pinned;

    var url = (window.ROOT || '.') + '/posts/' + file;
    fetch(url).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (txt) {
      var doc = new DOMParser().parseFromString(txt, 'text/html');
      var src = doc.querySelector('script.post-src');
      var body = doc.querySelector('.post-body');
      if (src) {
        W.ed.value = src.textContent.replace(/^\n/, '').replace(/\s+$/, '');
      } else if (body) {
        W.ed.value = htmlToSrc(body);
        alert('이 글에는 원고가 저장되어 있지 않아 본문에서 되짚어 옮겼습니다.\n' +
              '표나 특수한 HTML 은 그대로 남아 있으니 확인해 주세요.\n' +
              '(한 번 이 도구로 다시 내려받으면 다음부터는 정확히 복원됩니다.)');
      } else {
        throw new Error('본문을 찾지 못했습니다');
      }
      W.ed.dispatchEvent(new Event('input', { bubbles: true }));
      markEditing(file);
      W.refresh();
    }).catch(function (err) {
      alert('글 파일을 읽지 못했습니다: ' + err.message +
            '\n로컬에서 파일을 직접 열면 브라우저가 막습니다. ' +
            'python -m http.server 로 띄운 뒤 다시 시도해 주세요.');
    });
  }

  function loadItem(mode, idx) {
    var it = (S[{ library: 'library', problem: 'problems', research: 'research' }[mode]] || [])[idx];
    if (!it) return;
    if (mode === 'library') {
      G('l-title').value = it.title || ''; G('l-author').value = it.author || '';
      G('l-year').value = it.year || ''; G('l-cat').value = it.category || '';
      G('l-fmt').value = it.fmt || ''; G('l-ref').value = it.ref || '';
      G('l-url').value = it.url || ''; G('l-desc').value = it.desc || '';
      G('l-tags').value = (it.tags || []).join(', ');
    } else if (mode === 'problem') {
      G('p-title').value = it.title || ''; G('p-date').value = it.date || '';
      G('p-diff').value = it.diff || 'mid'; G('p-url').value = it.url || '';
      G('p-tags').value = (it.tags || []).join(', '); G('p-note').value = it.note || '';
    } else {
      G('r-title').value = it.title || ''; G('r-kind').value = it.kind || '';
      G('r-year').value = it.year || ''; G('r-desc').value = it.desc || '';
      G('r-tags').value = (it.tags || []).join(', ');
      G('r-post').value = it.post || ''; G('r-url').value = it.url || '';
    }
    markEditing(it.ref || it.title);
    W.refresh();
    document.querySelectorAll('.tag-sug').forEach(function (b) {
      var inp = b.previousElementSibling && b.previousElementSibling.querySelector('input');
      if (inp) inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  /* ── 무엇을 고칠지 고르는 창 ───────────────────── */
  var pick = document.createElement('div');
  pick.className = 'search-modal';
  pick.hidden = true;
  pick.innerHTML =
    '<div class="search-box">' +
      '<input type="text" id="ed-q" placeholder="고칠 것을 검색…" autocomplete="off">' +
      '<ul id="ed-list"></ul>' +
      '<p class="search-hint">↑↓ 이동 · Enter 불러오기 · Esc 닫기</p>' +
    '</div>';
  document.body.appendChild(pick);
  var pq = pick.querySelector('#ed-q'), plist = pick.querySelector('#ed-list');
  var pool = [], cur = 0;

  function buildPool() {
    var m = W.getMode();
    if (m === 'post') {
      return (S.posts || []).slice().sort(U.byDateDesc).map(function (p) {
        return { t: p.title, s: U.catPath(p.category, ' › ') + ' · ' + p.date,
                 go: function () { loadPost(p.file); } };
      });
    }
    var key = { library: 'library', problem: 'problems', research: 'research' }[m];
    return (S[key] || []).map(function (it, i) {
      return { t: it.title, s: it.ref || it.kind || it.diff || '',
               go: function () { loadItem(m, i); } };
    });
  }

  function drawPick(q) {
    q = (q || '').toLowerCase();
    var hits = pool.filter(function (d) { return !q || d.t.toLowerCase().indexOf(q) >= 0; });
    cur = 0;
    plist.innerHTML = hits.length
      ? hits.map(function (d, i) {
          return '<li class="' + (i ? '' : 'on') + '" data-i="' + pool.indexOf(d) + '">' +
                 esc(d.t) + '<span>' + esc(d.s) + '</span></li>';
        }).join('')
      : '<li class="empty">해당하는 것이 없습니다</li>';
  }
  function rows() { return plist.querySelectorAll('li[data-i]'); }
  function move(d) {
    var r = rows(); if (!r.length) return;
    r[cur].classList.remove('on');
    cur = (cur + d + r.length) % r.length;
    r[cur].classList.add('on');
    r[cur].scrollIntoView({ block: 'nearest' });
  }
  function choose(i) {
    closePick();
    pool[i].go();
  }
  function openPick() {
    pool = buildPool();
    if (!pool.length) { alert('아직 등록된 것이 없습니다.'); return; }
    pick.hidden = false;
    pq.value = '';
    drawPick('');
    pq.focus();
  }
  function closePick() { pick.hidden = true; }

  G('btn-edit').addEventListener('click', openPick);
  pq.addEventListener('input', function () { drawPick(pq.value); });
  pq.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      var r = rows();
      if (r.length) choose(+r[cur].getAttribute('data-i'));
    } else if (e.key === 'Escape') { e.preventDefault(); closePick(); }
  });
  plist.addEventListener('click', function (e) {
    var li = e.target.closest ? e.target.closest('li[data-i]') : null;
    if (li) choose(+li.getAttribute('data-i'));
  });
  pick.addEventListener('mousedown', function (e) { if (e.target === pick) closePick(); });

  /* 글 페이지의 '고치기' 링크로 바로 들어온 경우 — write.html?edit=파일명 */
  (function () {
    var m = /[?&]edit=([^&]+)/.exec(location.search);
    if (!m) return;
    var file = decodeURIComponent(m[1]);
    if ((S.posts || []).some(function (p) { return p.file === file; })) loadPost(file);
  }());
}());
