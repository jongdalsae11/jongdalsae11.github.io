/* ============================================================
   util.js — 여러 스크립트가 함께 쓰는 도구 모음
   · 이전에는 esc / slug / tags 같은 함수가 파일마다 따로
     정의돼 있었습니다. 한곳으로 모아 중복을 없앴습니다.
   · content.js 의 실수(중복 ref, 없는 파일 등)를 개발자 도구
     콘솔에 알려 주는 검사기도 들어 있습니다.
   ============================================================ */

window.U = (function () {
  var S = function () { return window.SITE || {}; };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* 제목 → 파일명에 쓸 수 있는 문자열 */
  function slug(t) {
    return String(t || '').trim().toLowerCase()
      .replace(/[^\w가-힣]+/g, '-').replace(/^-|-$/g, '');
  }

  /* 2026-08-17 → 2026.08.17 */
  function dot(d) { return String(d || '').replace(/-/g, '.'); }

  /* 오늘 날짜 (UTC 아님 — 한국 오전에 하루 밀리는 문제 방지) */
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function label(id) { return (S().labels || {})[id] || id; }

  function tags(list, opts) {
    var root = (opts && opts.root) || window.ROOT || '.';
    var link = opts && opts.link;
    return (list || []).map(function (t) {
      if (!link) return '<span class="tag">' + esc(t) + '</span>';
      return '<a class="tag tag--link plain" href="' + root +
             '/posts.html#tag=' + encodeURIComponent(t) + '">' + esc(t) + '</a>';
    }).join('');
  }

  /* 주소가 실제로 어딘가를 가리키는가 ('#' 은 제자리 점프라 무효) */
  function real(url) { return !!url && url !== '#'; }

  /* 주소가 없으면 죽은 링크 대신 일반 텍스트로 */
  function linkify(text, url, cls) {
    if (!real(url)) {
      return '<span class="' + (cls || '') + ' nolink" ' +
             'title="아직 연결된 주소가 없습니다">' + text + '</span>';
    }
    var ext = /^https?:/.test(url) ? ' target="_blank" rel="noopener"' : '';
    return '<a class="' + (cls || '') + '" href="' + url + '"' + ext + '>' + text + '</a>';
  }

  function byDateDesc(a, b) { return String(b.date || '').localeCompare(String(a.date || '')); }

  /* 파일명으로 글 찾기 */
  function postByFile(file) {
    return (S().posts || []).filter(function (p) { return p.file === file; })[0] || null;
  }
  function refById(id) {
    return (S().library || []).filter(function (r) { return r.ref === id; })[0] || null;
  }

  /* ── 계층 분류 ───────────────────────────────────────
     분류는 슬래시로 계층을 만듭니다.  예) 'math/number-theory'
       labels: { math: '수학', 'math/number-theory': '정수론' }
     상위 분류를 고르면 그 아래 모든 하위 분류가 함께 보입니다.     */

  function catTop(id) { return String(id || '').split('/')[0]; }
  function catDepth(id) { return String(id || '').split('/').length - 1; }
  /* 'a/b/c' → ['a', 'a/b', 'a/b/c'] */
  function catChain(id) {
    var parts = String(id || '').split('/'), acc = '', out = [];
    parts.forEach(function (p) { acc = acc ? acc + '/' + p : p; out.push(acc); });
    return out;
  }
  /* id 가 filter 자신이거나 그 하위인가 */
  function catMatches(id, filter) {
    if (!filter) return true;
    return id === filter || String(id || '').indexOf(filter + '/') === 0;
  }
  /* 전체 경로 이름표 — '수학 / 정수론' */
  function catPath(id, sep) {
    return catChain(id).map(label).join(sep || ' / ');
  }

  /* 항목 목록에서 분류 트리를 만듭니다.
     [{ id, label, count, children: [...] }]  (count 는 하위 포함) */
  function catTree(items) {
    var root = { kids: {}, order: [] };
    (items || []).forEach(function (it) {
      if (!it.category) return;
      var node = root;
      catChain(it.category).forEach(function (path) {
        if (!node.kids[path]) {
          node.kids[path] = { id: path, kids: {}, order: [], count: 0 };
          node.order.push(path);
        }
        node = node.kids[path];
        node.count++;
      });
    });
    function toArr(n) {
      return n.order.map(function (k) {
        var c = n.kids[k];
        return { id: c.id, label: label(c.id), count: c.count, children: toArr(c) };
      });
    }
    return toArr(root);
  }

  /* 날짜순으로 정렬된 글 목록 (분류를 주면 하위까지 포함) */
  function sortedPosts(category) {
    var list = (S().posts || []).slice().sort(byDateDesc);
    return category
      ? list.filter(function (p) { return catMatches(p.category, category); })
      : list;
  }

  /* ── 분류별 색 ───────────────────────────────────────
     다크 톤 위에서 서로 구분되는 색을 분류마다 하나씩 배정합니다.
     content.js 에 colors: { math: '#...' } 로 직접 지정할 수도 있고,
     지정하지 않으면 등장 순서대로 아래 팔레트에서 자동 배정됩니다.   */
  var PALETTE = [
    '#38bdf8', /* cyan   */
    '#a855f7', /* purple */
    '#34d399', /* emerald*/
    '#fbbf24', /* amber  */
    '#fb7185', /* rose   */
    '#818cf8', /* indigo */
    '#2dd4bf', /* teal   */
    '#f97316'  /* orange */
  ];
  var catMap = null;

  function buildCatMap() {
    catMap = {};
    var s = S(), seen = [], i = 0;
    /* 최상위 분류에만 색을 배정하고 하위는 그 색을 물려받습니다 */
    (s.posts || []).concat(s.library || []).forEach(function (it) {
      var top = catTop(it.category);
      if (top && seen.indexOf(top) < 0) seen.push(top);
    });
    seen.forEach(function (c) {
      catMap[c] = (s.colors || {})[c] || PALETTE[i++ % PALETTE.length];
    });
    /* 특정 하위 분류만 다른 색으로 지정한 경우도 반영 */
    Object.keys(s.colors || {}).forEach(function (k) { catMap[k] = s.colors[k]; });
  }
  function catColor(id) {
    if (!catMap) buildCatMap();
    return catMap[id] || catMap[catTop(id)] || '#38bdf8';
  }
  /* 요소에 붙일 인라인 변수 — style="--cat:#38bdf8" */
  function catVar(id) { return ' style="--cat:' + catColor(id) + '"'; }

  /* 분류 색을 :root 변수로 심고, 글 페이지면 본문 전체에 적용 */
  function applyTheme() {
    if (!catMap) buildCatMap();
    var lines = [];
    Object.keys(catMap).forEach(function (c) {
      lines.push('--cat-' + c.replace(/\//g, '-') + ':' + catMap[c]);
    });
    var st = document.createElement('style');
    st.textContent = ':root{' + lines.join(';') + '}';
    document.head.appendChild(st);

    var bodyCat = document.body.getAttribute('data-cat');
    if (bodyCat) document.body.style.setProperty('--cat', catColor(bodyCat));
  }

  /* ── content.js 실수 검사 (콘솔에만 표시) ─────────── */
  function validate() {
    var s = S(), warn = [];
    var seenRef = {}, seenFile = {};

    (s.posts || []).forEach(function (p) {
      if (!p.file) warn.push('글 "' + p.title + '" 에 file 이 없습니다.');
      else if (seenFile[p.file]) warn.push('글 파일명이 중복됩니다: ' + p.file);
      else seenFile[p.file] = 1;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date || ''))
        warn.push('글 "' + p.title + '" 의 날짜 형식이 2026-08-17 형태가 아닙니다: ' + p.date);
      if (!p.summary) warn.push('글 "' + p.title + '" 에 summary 가 없습니다 (홈 카드가 비어 보입니다).');
      catChain(p.category).forEach(function (c) {
        if (!(S().labels || {})[c]) warn.push('분류 "' + c + '" 의 한글 이름표가 labels 에 없습니다.');
      });
      (p.links || []).forEach(function (f) {
        if (!postByFile(f)) warn.push('글 "' + p.title + '" 이 없는 글을 연결합니다: ' + f);
      });
    });

    (s.library || []).forEach(function (r) {
      if (!r.ref) warn.push('자료 "' + r.title + '" 에 ref 가 없습니다.');
      else if (seenRef[r.ref]) warn.push('자료 인용 태그가 중복됩니다: ' + r.ref);
      else seenRef[r.ref] = 1;
    });

    (s.research || []).forEach(function (r) {
      if (r.post && !postByFile(r.post))
        warn.push('연구 "' + r.title + '" 이 없는 글을 가리킵니다: ' + r.post);
    });

    if (warn.length && window.console) {
      console.groupCollapsed('%ccontent.js 점검 ' + warn.length + '건',
        'color:#f97316;font-weight:600');
      warn.forEach(function (m) { console.warn(m); });
      console.groupEnd();
    }
    return warn;
  }

  return {
    esc: esc, slug: slug, dot: dot, today: today, label: label,
    tags: tags, real: real, linkify: linkify, byDateDesc: byDateDesc,
    postByFile: postByFile, refById: refById, sortedPosts: sortedPosts,
    catColor: catColor, catVar: catVar, applyTheme: applyTheme,
    catTop: catTop, catDepth: catDepth, catChain: catChain,
    catMatches: catMatches, catPath: catPath, catTree: catTree,
    validate: validate
  };
})();
