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

  /* 데이터에서 카테고리 수집 (등장 순서 유지) */
  function cats(list) {
    var seen = [], out = [];
    (list || []).forEach(function (it) {
      if (it.category && seen.indexOf(it.category) < 0) {
        seen.push(it.category);
        out.push({ id: it.category, label: label(it.category) });
      }
    });
    return out;
  }

  var NODES = [
    { label: '홈',            href: 'index.html' },
    { label: '이력',          href: 'about.html' },
    { label: '연구·프로젝트', href: 'research.html' },
    { key: 'posts',   label: '글',
      children: cats(S.posts).map(function (c) {
        return { label: c.label, href: 'posts.html#' + c.id };
      }) },
    { label: '문제 아카이브', href: 'archive.html' },
    { key: 'library', label: '자료정리집',
      children: cats(S.library).map(function (c) {
        return { label: c.label, href: 'library.html#' + c.id };
      }) },
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

  var html = '<div class="site-id"><a class="plain" href="' + ROOT + '/index.html">' +
             '<span class="site-name">' + SITE_NAME + '</span>' +
             '<span class="site-sub">' + SITE_SUB + '</span></a></div>' +
             '<button class="nav-search" type="button" id="open-search">' +
             '<span>검색</span><kbd>Ctrl K</kbd></button>' +
             '<ul class="tree">';

  NODES.forEach(function (n, i) {
    if (n.children) {
      var key = n.key || ('b' + i);
      /* 현재 페이지가 그 안에 있으면 무조건 펼친 상태 */
      var hasHere = n.children.some(function (c) { return fileOf(c.href) === here; });
      var open = hasHere || !!openSet[key];
      html += '<li><button type="button" class="branch-btn" data-key="' + key +
              '" aria-expanded="' + open + '"><span class="caret">▸</span>' + n.label +
              '<span class="count">' + n.children.length + '</span></button>' +
              '<ul class="branch" data-branch="' + key + '">';
      n.children.forEach(function (c) {
        html += '<li><a class="plain' + (isActive(c.href) ? ' active' : '') +
                '" href="' + ROOT + '/' + c.href + '">' + c.label + '</a></li>';
      });
      html += '</ul></li>';
    } else {
      html += '<li><a class="plain' + (isActive(n.href) ? ' active' : '') +
              '" href="' + ROOT + '/' + n.href + '">' + n.label + '</a></li>';
    }
  });
  html += '</ul>';

  var crumb = document.body.getAttribute('data-crumb') || '';

  document.body.insertAdjacentHTML('afterbegin',
    '<header class="topbar"><span class="crumb">' + crumb + '</span></header>' +
    '<aside class="sidebar tree-noanim">' + html + '</aside>' +
    '<button class="nav-fab" type="button" aria-label="메뉴">≡</button>' +
    '<div class="nav-backdrop"></div>');

  var sidebar = document.querySelector('.sidebar');

  /* 아코디언 — 초기 높이는 애니메이션 없이 즉시 적용 */
  function branchEl(key) { return sidebar.querySelector('[data-branch="' + key + '"]'); }
  function setOpen(btn, open, save) {
    var b = branchEl(btn.getAttribute('data-key'));
    btn.setAttribute('aria-expanded', open);
    b.style.maxHeight = open ? b.scrollHeight + 'px' : '0px';
    if (save) {
      var keys = [];
      sidebar.querySelectorAll('.branch-btn').forEach(function (x) {
        if (x.getAttribute('aria-expanded') === 'true') keys.push(x.getAttribute('data-key'));
      });
      try { localStorage.setItem(LS_KEY, JSON.stringify(keys)); } catch (e) {}
    }
  }
  sidebar.querySelectorAll('.branch-btn').forEach(function (btn) {
    setOpen(btn, btn.getAttribute('aria-expanded') === 'true', false);
    btn.addEventListener('click', function () {
      setOpen(btn, btn.getAttribute('aria-expanded') !== 'true', true);
    });
  });
  /* 다음 프레임부터 전환 애니메이션 활성화 */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { sidebar.classList.remove('tree-noanim'); });
  });

  /* 해시가 바뀌면(같은 페이지 내 카테고리 이동) 활성 표시만 갱신 */
  window.addEventListener('hashchange', function () {
    sidebar.querySelectorAll('.tree a').forEach(function (a) {
      var href = a.getAttribute('href').replace(ROOT + '/', '');
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

  /* ── 검색 (Ctrl+K) ─────────────────────────────── */
  var index = []
    .concat((S.posts || []).map(function (p) {
      return { t: p.title, s: '글 · ' + label(p.category),
               tags: p.tags || [], href: ROOT + '/posts/' + p.file };
    }))
    .concat((S.library || []).map(function (r) {
      return { t: r.title, s: '자료 · ' + label(r.category) + ' · ' + r.ref,
               tags: r.tags || [], href: ROOT + '/library.html#' + r.category };
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
  }
  function openSearch() { modal.hidden = false; input.value = ''; render(''); input.focus(); }
  function closeSearch() { modal.hidden = true; }

  document.getElementById('open-search').addEventListener('click', openSearch);
  input.addEventListener('input', function () { render(input.value); });
  modal.addEventListener('click', function (e) { if (e.target === modal) closeSearch(); });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape') closeSearch();
  });
})();
