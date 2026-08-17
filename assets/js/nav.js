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
  function isOpen(b) {
    var btn = btnForKey(b.getAttribute('data-branch'));
    return !!btn && btn.getAttribute('aria-expanded') === 'true';
  }

  /* 펼쳐진 가지는 max-height 를 none 으로 둡니다.
     고정 px 로 두면 그 안의 하위를 펼쳤을 때 잘려서 아래 항목이
     사라져 보이는 문제가 생깁니다.                              */
  function settle(b) {
    b.style.maxHeight = isOpen(b) ? 'none' : '0px';
  }
  function refreshHeights() {
    Array.prototype.slice.call(sidebar.querySelectorAll('.branch')).forEach(settle);
  }

  /* 애니메이션을 곁들여 여닫기 (none ↔ 0 은 전환이 안 되므로
     실제 높이를 한 번 거쳐 갑니다)                              */
  function animate(b, open) {
    if (open) {
      b.style.maxHeight = b.scrollHeight + 'px';
      var done = function (e) {
        if (e && e.propertyName !== 'max-height') return;
        b.removeEventListener('transitionend', done);
        if (isOpen(b)) b.style.maxHeight = 'none';   /* 하위 확장 대비 */
      };
      b.addEventListener('transitionend', done);
      setTimeout(done, 400);                          /* 전환 이벤트 누락 대비 */
    } else {
      b.style.maxHeight = b.scrollHeight + 'px';      /* none → 실제 높이 */
      requestAnimationFrame(function () { b.style.maxHeight = '0px'; });
    }
    /* 조상들은 이미 none 이므로 잘리지 않습니다 */
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
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open);
      var b = null;
      sidebar.querySelectorAll('.branch').forEach(function (x) {
        if (x.getAttribute('data-branch') === btn.getAttribute('data-key')) b = x;
      });
      if (b) animate(b, open);
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

  /* ── 모바일 드로어 ─────────────────────────────────
     열림/닫힘을 한 곳에서 관리하고, 열릴 때 접힌 가지의
     높이를 다시 재서 내용이 잘리지 않게 합니다.          */
  var fab = document.querySelector('.nav-fab');
  var backdrop = document.querySelector('.nav-backdrop');

  function setDrawer(open) {
    document.body.classList.toggle('nav-open', open);
    fab.setAttribute('aria-expanded', open);
    if (open) {
      /* 화면 밖에 있는 동안 계산된 높이가 어긋났을 수 있으므로 갱신 */
      refreshHeights();
      var first = sidebar.querySelector('.tree-link');
      if (first) first.focus({ preventScroll: true });
    }
  }
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('aria-controls', 'site-nav');
  sidebar.querySelector('nav').id = 'site-nav';

  fab.addEventListener('click', function () {
    setDrawer(!document.body.classList.contains('nav-open'));
  });
  backdrop.addEventListener('click', function () { setDrawer(false); });
  sidebar.addEventListener('click', function (e) {
    if (e.target.closest('a')) setDrawer(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) setDrawer(false);
  });
  /* 왼쪽으로 쓸어 넘기면 닫기 */
  var tx = null;
  sidebar.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  sidebar.addEventListener('touchmove', function (e) {
    if (tx !== null && tx - e.touches[0].clientX > 55) { setDrawer(false); tx = null; }
  }, { passive: true });
  /* 화면이 넓어지면 드로어 상태 해제 */
  window.addEventListener('resize', function () {
    if (window.innerWidth > 920) setDrawer(false);
  });

  /* 스크롤하면 상단 헤더 숨김 (모바일 개방감) */
  var lastY = 0;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    document.body.classList.toggle('hide-topbar', y > 80 && y > lastY);
    lastY = y;
  }, { passive: true });

  /* 표가 좁은 화면에서 화면을 밀어내지 않도록 스크롤 래퍼로 감쌈 */
  document.querySelectorAll('main table').forEach(function (t) {
    if (t.parentNode.classList.contains('table-scroll')) return;
    var wrap = document.createElement('div');
    wrap.className = 'table-scroll';
    t.parentNode.insertBefore(wrap, t);
    wrap.appendChild(t);
  });

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
