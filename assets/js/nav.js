/* ============================================================
   nav.js — 사이드바 트리 · 얇은 헤더 · 모바일 드로어 · 검색(Ctrl+K)
   · 트리의 '글'과 '자료정리집' 하위 항목은 content.js 의
     데이터에서 카테고리를 자동 수집해 만듭니다.
   · 펼침 상태는 저장되어 페이지를 옮겨도 유지됩니다.
     (첫 렌더에는 애니메이션을 끄기 때문에 다시 펼쳐지는 깜빡임 없음)
   ============================================================ */

var SITE_NAME = '이름';
var SITE_SUB  = 'archive';

(function () {
  var ROOT = window.ROOT || '.';
  var S = window.SITE || { posts: [], library: [], labels: {} };
  var here = (location.pathname.split('/').pop() || 'index.html');
  var LS_KEY = 'tree-open';

  function label(id) { return (S.labels && S.labels[id]) || id; }

  /* 지금 열려 있는 글 (posts/파일명.html 로 접속한 경우) */
  var currentPost = (S.posts || []).filter(function (p) { return p.file === here; })[0];

  var NODES = [
    { label: '홈',            href: 'index.html' },
    { label: '이력',          href: 'about.html' },
    { label: '연구·프로젝트', href: 'research.html' },
    { key: 'posts',   label: '글',        base: 'posts.html',
      tree: window.U.catTree(S.posts), total: (S.posts || []).length },
    { label: '문제 아카이브', href: 'archive.html' },
    { key: 'library', label: '자료정리집', base: 'library.html',
      tree: window.U.catTree(S.library), total: (S.library || []).length },
    { label: '연락처',        href: 'contact.html' }
  ];

  function fileOf(href) { return (href || '').split('#')[0].split('/').pop() || 'index.html'; }
  function hashOf(href) { var i = (href || '').indexOf('#'); return i < 0 ? '' : href.slice(i); }
  function isActive(href) {
    if (fileOf(href) !== here) return false;
    var h = hashOf(href);
    return h ? h === (location.hash || '') : true;
  }

  /* 저장된 펼침 상태 */
  var openSet = {};
  try { (JSON.parse(localStorage.getItem(LS_KEY)) || []).forEach(function (k) { openSet[k] = true; }); }
  catch (e) {}

  /* 읽고 있는 글이 속한 분류 사슬은 항상 펼쳐 둠 */
  var openChain = {};
  if (currentPost) {
    window.U.catChain(currentPost.category).forEach(function (c) { openChain['posts:' + c] = true; });
  }
  /* 주소 해시가 가리키는 분류의 조상들도 펼침 */
  (function () {
    var h = decodeURIComponent((location.hash || '').slice(1));
    if (!h || h.indexOf('tag=') === 0) return;
    var pfx = here === 'library.html' ? 'library:' : 'posts:';
    var hit = (S.library || []).filter(function (r) { return r.ref === h; })[0];
    window.U.catChain(hit ? hit.category : h).forEach(function (c) { openChain[pfx + c] = true; });
  })();

  /* ── 분류 트리를 재귀적으로 그리기 ────────────────── */
  function renderCats(nodes, base, keyPrefix, depth) {
    return nodes.map(function (n) {
      var href = ROOT + '/' + base + '#' + encodeURIComponent(n.id);
      var key = keyPrefix + ':' + n.id;
      var hasKids = n.children && n.children.length;
      var isHere = currentPost && base === 'posts.html' &&
                   currentPost.category === n.id;
      var active = isActive(base + '#' + n.id) || isHere;
      var open = !!(openChain[key] || openSet[key]);

      var row = '<div class="tree-row"' + window.U.catVar(n.id) + '>' +
        (hasKids
          ? '<button type="button" class="caret-btn" data-key="' + key +
            '" aria-expanded="' + open + '" aria-label="' + n.label + ' 펼치기">▸</button>'
          : '<span class="caret-sp"></span>') +
        '<a class="plain tree-link' + (active ? ' active' : '') + '" href="' + href + '">' +
          '<span class="cat-dot"></span>' + n.label + '</a>' +
        '<span class="count">' + n.count + '</span>' +
      '</div>';

      var kids = hasKids
        ? '<ul class="branch" data-branch="' + key + '">' +
            renderCats(n.children, base, keyPrefix, depth + 1) + '</ul>'
        : '';

      /* 읽고 있는 글은 자기 분류 바로 아래에 표시 */
      var cur = isHere
        ? '<ul class="leaf"><li><span class="node-current" title="' +
          currentPost.title.replace(/"/g, '&quot;') + '">' + currentPost.title +
          '</span></li></ul>'
        : '';

      return '<li>' + row + kids + cur + '</li>';
    }).join('');
  }

  var html = '<div class="site-id"><a class="plain" href="' + ROOT + '/index.html">' +
             '<span class="site-name">' + SITE_NAME + '</span>' +
             '<span class="site-sub">' + SITE_SUB + '</span></a></div>' +
             '<button class="nav-search" type="button" id="open-search">' +
             '<span>검색</span><kbd>Ctrl K</kbd></button>' +
             '<a class="nav-new plain" href="' + ROOT + '/write.html">' +
             '<span class="plus">+</span> 새로 쓰기</a>' +
             '<ul class="tree">';

  NODES.forEach(function (n) {
    if (n.tree) {
      var key = n.key;
      var hasHere = here === fileOf(n.base) ||
                    (n.key === 'posts' && currentPost);
      var open = hasHere || !!openSet[key];
      html += '<li class="tree-group">' +
        '<div class="tree-row tree-row--top">' +
          '<button type="button" class="caret-btn" data-key="' + key +
            '" aria-expanded="' + open + '" aria-label="' + n.label + ' 펼치기">▸</button>' +
          '<a class="plain tree-link' +
            (here === fileOf(n.base) && !location.hash ? ' active' : '') +
            '" href="' + ROOT + '/' + n.base + '">' + n.label + '</a>' +
          '<span class="count">' + n.total + '</span>' +
        '</div>' +
        '<ul class="branch" data-branch="' + key + '">' +
          renderCats(n.tree, n.base, n.key, 1) +
        '</ul></li>';
    } else {
      html += '<li><div class="tree-row"><span class="caret-sp"></span>' +
        '<a class="plain tree-link' + (isActive(n.href) ? ' active' : '') +
        '" href="' + ROOT + '/' + n.href + '">' + n.label + '</a></div></li>';
    }
  });
  html += '</ul>';

  var crumb = document.body.getAttribute('data-crumb') || '';

  document.body.insertAdjacentHTML('afterbegin',
    '<a class="skip-link" href="#main">본문 바로가기</a>' +
    '<header class="topbar"><span class="crumb">' + crumb + '</span></header>' +
    '<aside class="sidebar tree-noanim"><nav aria-label="사이트 메뉴">' + html + '</nav></aside>' +
    '<button class="nav-fab" type="button" aria-label="메뉴">≡</button>' +
    '<div class="nav-backdrop"></div>');

  var sidebar = document.querySelector('.sidebar');

  /* ── 아코디언 (중첩 지원) ──────────────────────────
     하위를 펼치면 조상들의 높이도 다시 계산해야 잘리지 않습니다. */
  /* 분류 id 에 / 와 : 가 들어가므로 선택자 문자열 대신 값 비교로 찾습니다
     (CSS.escape 에 의존하지 않아 어느 환경에서나 안전)              */
  var caretBtns = Array.prototype.slice.call(sidebar.querySelectorAll('.caret-btn'));
  function btnForKey(key) {
    for (var i = 0; i < caretBtns.length; i++) {
      if (caretBtns[i].getAttribute('data-key') === key) return caretBtns[i];
    }
    return null;
  }
  function refreshHeights() {
    /* 깊은 것부터 위로 올라가며 높이 재계산 (부모가 자식 높이를 포함해야 함) */
    var all = Array.prototype.slice.call(sidebar.querySelectorAll('.branch'));
    all.sort(function (a, b) {
      return b.querySelectorAll('.branch').length - a.querySelectorAll('.branch').length;
    });
    all.forEach(function (b) {
      var btn = btnForKey(b.getAttribute('data-branch'));
      var open = btn && btn.getAttribute('aria-expanded') === 'true';
      b.style.maxHeight = open ? b.scrollHeight + 'px' : '0px';
    });
  }
  function saveOpen() {
    var keys = [];
    caretBtns.forEach(function (x) {
      if (x.getAttribute('aria-expanded') === 'true') keys.push(x.getAttribute('data-key'));
    });
    try { localStorage.setItem(LS_KEY, JSON.stringify(keys)); } catch (e) {}
  }
  caretBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      btn.setAttribute('aria-expanded', btn.getAttribute('aria-expanded') !== 'true');
      refreshHeights();
      saveOpen();
    });
  });
  refreshHeights();
  /* 다음 프레임부터 전환 애니메이션 활성화 */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { sidebar.classList.remove('tree-noanim'); });
  });

  /* 해시가 바뀌면(같은 페이지 내 카테고리 이동) 활성 표시만 갱신 */
  window.addEventListener('hashchange', function () {
    sidebar.querySelectorAll('.tree a.tree-link').forEach(function (a) {
      var href = decodeURIComponent(a.getAttribute('href').replace(ROOT + '/', ''));
      a.classList.toggle('active', isActive(href));
    });
  });

  /* 모바일 드로어 */
  var fab = document.querySelector('.nav-fab');
  var backdrop = document.querySelector('.nav-backdrop');
  fab.addEventListener('click', function () { document.body.classList.toggle('nav-open'); });
  backdrop.addEventListener('click', function () { document.body.classList.remove('nav-open'); });
  sidebar.addEventListener('click', function (e) {
    if (e.target.closest('a')) document.body.classList.remove('nav-open');
  });

  /* 스크롤하면 상단 헤더 숨김 (모바일 개방감) */
  var lastY = 0;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    document.body.classList.toggle('hide-topbar', y > 80 && y > lastY);
    lastY = y;
  }, { passive: true });

  /* 분류별 색 변수 주입 + content.js 실수 점검 */
  if (window.U) {
    window.U.applyTheme();
    window.U.validate();
  }

  /* ── 검색 (Ctrl+K) ─────────────────────────────── */
  var index = []
    .concat((S.posts || []).map(function (p) {
      return { t: p.title, s: '글 · ' + window.U.catPath(p.category),
               tags: p.tags || [], href: ROOT + '/posts/' + p.file };
    }))
    .concat((S.library || []).map(function (r) {
      return { t: r.title, s: '자료 · ' + window.U.catPath(r.category) + ' · ' + r.ref,
               tags: r.tags || [], href: ROOT + '/library.html#' + encodeURIComponent(r.category) };
    }))
    .concat((S.problems || []).map(function (p) {
      return { t: p.title, s: '문제', tags: p.tags || [], href: ROOT + '/archive.html' };
    }))
    .concat((S.research || []).map(function (r) {
      return { t: r.title, s: '연구', tags: r.tags || [], href: ROOT + '/research.html' };
    }));

  document.body.insertAdjacentHTML('beforeend',
    '<div class="search-modal" id="search-modal" hidden>' +
      '<div class="search-box">' +
        '<input type="text" id="search-input" placeholder="글 · 자료 · 문제 검색" autocomplete="off">' +
        '<ul class="search-results" id="search-results"></ul>' +
      '</div></div>');

  var modal = document.getElementById('search-modal');
  var input = document.getElementById('search-input');
  var results = document.getElementById('search-results');

  var cursor = -1;
  function render(q) {
    var s = q.trim().toLowerCase();
    var hits = !s ? index.slice(0, 8) : index.filter(function (it) {
      return (it.t + ' ' + it.s + ' ' + it.tags.join(' ')).toLowerCase().indexOf(s) >= 0;
    }).slice(0, 12);
    results.innerHTML = hits.length
      ? hits.map(function (it) {
          return '<li><a class="plain" href="' + it.href + '"><span class="sr-t">' + it.t +
                 '</span><span class="sr-s">' + it.s + '</span></a></li>';
        }).join('')
      : '<li class="sr-empty">결과 없음</li>';
    cursor = -1;
    move(1);   /* 첫 항목을 미리 선택해 엔터로 바로 이동 가능 */
  }

  /* 위/아래 키로 선택 이동 */
  function move(delta) {
    var items = results.querySelectorAll('li a');
    if (!items.length) return;
    cursor = (cursor + delta + items.length) % items.length;
    items.forEach(function (a, i) { a.classList.toggle('on', i === cursor); });
    var cur = items[cursor];
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }
  function openSearch() { modal.hidden = false; input.value = ''; render(''); input.focus(); }
  function closeSearch() { modal.hidden = true; }

  document.getElementById('open-search').addEventListener('click', openSearch);
  input.addEventListener('input', function () { render(input.value); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') {
      var cur = results.querySelectorAll('li a')[cursor];
      if (cur) { e.preventDefault(); location.href = cur.getAttribute('href'); }
    }
  });
  modal.addEventListener('click', function (e) { if (e.target === modal) closeSearch(); });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape') closeSearch();
  });
})();
