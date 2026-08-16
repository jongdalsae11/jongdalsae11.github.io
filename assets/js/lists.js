/* ============================================================
   lists.js — content.js 데이터로 각 페이지의 목록을 렌더링
   · 홈 대시보드 · 글 목록(카테고리별) · 자료정리집 · 문제 · 연구
   · data-render="..." 속성이 있는 요소를 찾아 채웁니다.
   ============================================================ */

(function () {
  var S = window.SITE; if (!S) return;
  var ROOT = window.ROOT || '.';
  function label(id) { return (S.labels && S.labels[id]) || id; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function dot(d) { return d.replace(/-/g, '.'); }
  function tags(a) {
    return (a || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('');
  }
  function byDateDesc(a, b) { return (b.date || '').localeCompare(a.date || ''); }
  function postHref(p) { return ROOT + '/posts/' + p.file; }

  function rowsOf(list) {
    if (!list.length) return '<li class="empty">아직 항목이 없습니다.</li>';
    return list.map(function (p) {
      return '<li><a class="row plain" href="' + postHref(p) + '">' +
        '<span class="row-date">' + dot(p.date) + '</span>' +
        '<span class="row-title">' + esc(p.title) + '</span>' +
        '<span class="row-tags">' + tags(p.tags) + '</span></a></li>';
    }).join('');
  }

  var R = {
    /* ── 홈: 현재 탐구 중 ── */
    now: function (el) {
      el.innerHTML = esc(S.now || '') + '<span class="cursor"></span>';
    },

    /* ── 홈: 고정 글 ── */
    pins: function (el) {
      var pinned = (S.posts || []).filter(function (p) { return p.pinned; });
      el.innerHTML = pinned.map(function (p) {
        return '<a class="pin plain" href="' + postHref(p) + '">' +
          '<span class="pin-label">PINNED · ' + label(p.category).toUpperCase() + '</span>' +
          '<p class="pin-title">' + esc(p.title) + '</p>' +
          '<p class="pin-desc">' + esc(p.summary || '') + '</p></a>';
      }).join('');
    },

    /* ── 홈: 최근 글 ── */
    recent: function (el) {
      el.innerHTML = rowsOf((S.posts || []).slice().sort(byDateDesc).slice(0, 5));
    },

    /* ── 글 목록 페이지 (해시 = 카테고리) ── */
    posts: function (el) {
      function draw() {
        var cat = (location.hash || '').slice(1);
        var all = (S.posts || []).slice().sort(byDateDesc);
        var list = cat ? all.filter(function (p) { return p.category === cat; }) : all;
        el.innerHTML = rowsOf(list);
        var h = document.querySelector('[data-cat-title]');
        var sub = document.querySelector('[data-cat-sub]');
        if (h) h.textContent = cat ? label(cat) : '전체 글';
        if (sub) sub.textContent = list.length + '편';
        var crumb = document.querySelector('.topbar .crumb');
        if (crumb) crumb.innerHTML = '글 / <b>' + (cat ? label(cat) : '전체') + '</b>';
      }
      draw();
      window.addEventListener('hashchange', draw);
    },

    /* ── 자료정리집 (해시 = 카테고리, 없으면 카테고리별 전체) ── */
    library: function (el) {
      function item(r) {
        return '<li class="ref">' +
          '<div class="ref-body">' +
            '<div class="ref-title"><a href="' + (r.url || '#') + '"' +
              (/^https?:/.test(r.url || '') ? ' target="_blank" rel="noopener"' : '') + '>' +
              esc(r.title) + '</a></div>' +
            '<div class="ref-src">' + esc(r.author || '') +
              (r.year ? ' · ' + r.year : '') + '</div>' +
            (r.desc ? '<p class="ref-desc">' + esc(r.desc) + '</p>' : '') +
            '<div class="row-tags">' + tags(r.tags) + '</div>' +
          '</div>' +
          '<span class="ref-fmt tag tag--dim">' + esc(r.fmt || '') + '</span>' +
          '<button class="ref-id" data-cite="[' + r.ref + '] ' + esc(r.title) +
            ', ' + esc(r.author || '') + ' (' + (r.year || '') + ')">[' + r.ref + ']</button>' +
        '</li>';
      }
      function draw() {
        var cat = (location.hash || '').slice(1);
        var all = S.library || [];
        var groups = [];
        if (cat) {
          groups = [{ id: cat, items: all.filter(function (r) { return r.category === cat; }) }];
        } else {
          var seen = [];
          all.forEach(function (r) {
            if (seen.indexOf(r.category) < 0) { seen.push(r.category); }
          });
          groups = seen.map(function (c) {
            return { id: c, items: all.filter(function (r) { return r.category === c; }) };
          });
        }
        el.innerHTML = groups.map(function (g) {
          return '<h2 id="' + g.id + '">' + label(g.id) +
            ' <span class="h-count">' + g.items.length + '</span></h2>' +
            '<ul class="ref-list">' +
            (g.items.length ? g.items.map(item).join('') : '<li class="empty">항목 없음</li>') +
            '</ul>';
        }).join('');
        var crumb = document.querySelector('.topbar .crumb');
        if (crumb) crumb.innerHTML = '자료정리집 / <b>' + (cat ? label(cat) : '전체') + '</b>';
        bindCopy();
      }
      function bindCopy() {
        el.querySelectorAll('.ref-id').forEach(function (b) {
          b.addEventListener('click', function () {
            navigator.clipboard.writeText(b.getAttribute('data-cite')).then(function () {
              var t = b.textContent;
              b.textContent = '복사됨 ✓';
              setTimeout(function () { b.textContent = t; }, 1400);
            });
          });
        });
      }
      draw();
      window.addEventListener('hashchange', draw);
    },

    /* ── 문제 아카이브 (문제집 스타일) ── */
    problems: function (el) {
      var diffLabel = { easy: '쉬움', mid: '보통', hard: '어려움' };
      el.innerHTML = (S.problems || []).slice().sort(byDateDesc).map(function (p) {
        return '<li class="prob" data-diff="' + p.diff + '">' +
          '<div class="prob-head">' +
            '<h3 class="prob-title"><a href="' + (p.url || '#') + '">' + esc(p.title) + '</a></h3>' +
            '<div class="prob-meta">' + tags(p.tags) +
              '<span class="tag tag--dim">' + (diffLabel[p.diff] || p.diff) + '</span></div>' +
          '</div>' +
          (p.note ? '<p class="prob-note">' + esc(p.note) + '</p>' : '') +
          '<p class="prob-date mono">' + dot(p.date) + '</p>' +
        '</li>';
      }).join('');

      document.querySelectorAll('#diff-chips .chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          document.querySelectorAll('#diff-chips .chip').forEach(function (c) { c.classList.remove('on'); });
          chip.classList.add('on');
          var d = chip.getAttribute('data-diff');
          el.querySelectorAll('.prob').forEach(function (p) {
            p.style.display = (d === 'all' || p.getAttribute('data-diff') === d) ? '' : 'none';
          });
        });
      });
    },

    /* ── 연구·프로젝트 ── */
    research: function (el) {
      el.innerHTML = (S.research || []).map(function (r) {
        var href = r.post ? ROOT + '/posts/' + r.post : (r.url || '#');
        return '<li><a class="card plain" href="' + href + '">' +
          '<p class="card-meta">' + esc(r.kind || '') + ' · ' + (r.year || '') + '</p>' +
          '<p class="card-title">' + esc(r.title) + '</p>' +
          '<p class="card-desc">' + esc(r.desc || '') + '</p>' +
          '<div class="row-tags">' + tags(r.tags) + '</div>' +
          (r.post ? '<p class="card-link mono">관련 글 →</p>' : '') +
          '</a></li>';
      }).join('');
    }
  };

  document.querySelectorAll('[data-render]').forEach(function (el) {
    var fn = R[el.getAttribute('data-render')];
    if (fn) fn(el);
  });
})();
