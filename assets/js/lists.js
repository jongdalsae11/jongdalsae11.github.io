/* ============================================================
   lists.js — content.js 데이터로 각 페이지의 목록을 렌더링
   · 홈 대시보드 · 글 목록(카테고리별) · 자료정리집 · 문제 · 연구
   · data-render="..." 속성이 있는 요소를 찾아 채웁니다.
   ============================================================ */

(function () {
  var S = window.SITE; if (!S) return;
  var U = window.U;
  var ROOT = window.ROOT || '.';

  /* 공통 도구는 util.js 에 모여 있습니다 */
  var esc = U.esc, dot = U.dot, tags = U.tags, label = U.label,
      real = U.real, linkify = U.linkify, byDateDesc = U.byDateDesc;

  function postHref(p) { return ROOT + '/posts/' + p.file; }

  function rowsOf(list) {
    if (!list.length) return '<li class="empty">아직 항목이 없습니다.</li>';
    return list.map(function (p) {
      return '<li' + U.catVar(p.category) + '><a class="row plain" href="' + postHref(p) + '">' +
        '<span class="row-date">' + dot(p.date) + '</span>' +
        '<span class="row-title">' + esc(p.title) + '</span>' +
        '<span class="row-cat">' + label(p.category) + '</span>' +
        '<span class="row-tags">' + tags(p.tags) + '</span></a></li>';
    }).join('');
  }

  var R = {
    /* ── 홈: 현재 탐구 중 ── */
    now: function (el) {
      el.innerHTML = esc(S.now || '') + '<span class="cursor"></span>';
    },

    /* ── 홈: 분류별 현황 막대 ── */
    stats: function (el) {
      var posts = S.posts || [];
      var counts = {}, order = [];
      posts.forEach(function (p) {
        if (!(p.category in counts)) { counts[p.category] = 0; order.push(p.category); }
        counts[p.category]++;
      });
      var max = Math.max.apply(null, order.map(function (c) { return counts[c]; }).concat([1]));

      el.innerHTML =
        '<div class="stat-row">' +
          order.map(function (c) {
            return '<a class="stat plain" href="' + ROOT + '/posts.html#' + c + '"' +
              U.catVar(c) + '>' +
              '<span class="stat-n">' + counts[c] + '</span>' +
              '<span class="stat-l">' + label(c) + '</span>' +
              '<span class="stat-bar"><i style="width:' +
                Math.round(counts[c] / max * 100) + '%"></i></span>' +
            '</a>';
          }).join('') +
          '<div class="stat stat--misc">' +
            '<span class="stat-n">' + (S.problems || []).length + '</span>' +
            '<span class="stat-l">문제</span>' +
          '</div>' +
          '<div class="stat stat--misc">' +
            '<span class="stat-n">' + (S.library || []).length + '</span>' +
            '<span class="stat-l">자료</span>' +
          '</div>' +
        '</div>';
    },

    /* ── 홈: 고정 글 ── */
    pins: function (el) {
      var pinned = (S.posts || []).filter(function (p) { return p.pinned; });
      el.innerHTML = pinned.map(function (p) {
        return '<a class="pin plain" href="' + postHref(p) + '"' + U.catVar(p.category) + '>' +
          '<span class="pin-label">PINNED · ' + label(p.category).toUpperCase() + '</span>' +
          '<p class="pin-title">' + esc(p.title) + '</p>' +
          '<p class="pin-desc">' + esc(p.summary || '') + '</p></a>';
      }).join('');
    },

    /* ── 홈: 최근 글 ── */
    recent: function (el) {
      el.innerHTML = rowsOf(U.sortedPosts().slice(0, 5));
    },

    /* ── 글 목록 페이지 (해시 = 카테고리) ── */
    posts: function (el) {
      function draw() {
        var h = decodeURIComponent((location.hash || '').slice(1));
        var isTag = h.indexOf('tag=') === 0;
        var tag = isTag ? h.slice(4) : '';
        var cat = isTag ? '' : h;

        var list = isTag
          ? U.sortedPosts().filter(function (p) { return (p.tags || []).indexOf(tag) >= 0; })
          : U.sortedPosts(cat);

        el.innerHTML = rowsOf(list);

        var titleEl = document.querySelector('[data-cat-title]');
        var subEl = document.querySelector('[data-cat-sub]');
        var name = isTag ? '#' + tag : (cat ? label(cat) : '전체 글');
        if (titleEl) {
          titleEl.innerHTML = esc(name) +
            (isTag ? ' <a class="clear-filter plain" href="#">전체 보기 ✕</a>' : '');
          if (cat) titleEl.style.setProperty('--cat', U.catColor(cat));
          else titleEl.style.removeProperty('--cat');
        }
        if (subEl) subEl.textContent = list.length + '편';
        var crumb = document.querySelector('.topbar .crumb');
        if (crumb) crumb.innerHTML = '글 / <b>' + esc(name) + '</b>';

        /* 분류를 보고 있을 땐 그 분류의 태그 모음을 위에 노출 */
        var bar = document.querySelector('[data-tagbar]');
        if (bar) {
          var pool = {}, src = cat ? U.sortedPosts(cat) : U.sortedPosts();
          src.forEach(function (p) {
            (p.tags || []).forEach(function (t) { pool[t] = (pool[t] || 0) + 1; });
          });
          var keys = Object.keys(pool).sort(function (a, b) { return pool[b] - pool[a]; });
          bar.innerHTML = keys.length
            ? keys.map(function (t) {
                return '<a class="tag tag--link plain' + (t === tag ? ' on' : '') +
                  '" href="#tag=' + encodeURIComponent(t) + '">' + esc(t) +
                  '<span class="tg-n">' + pool[t] + '</span></a>';
              }).join('')
            : '';
        }
      }
      draw();
      window.addEventListener('hashchange', draw);
    },

    /* ── 자료정리집 ────────────────────────────────────
       해시가 카테고리면 그 분류만, 해시가 Ref-xx 면
       그 자료가 속한 분류를 열고 해당 항목을 강조합니다.  */
    library: function (el) {
      function item(r) {
        return '<li class="ref" id="' + r.ref + '">' +
          '<div class="ref-body">' +
            '<div class="ref-title">' + linkify(esc(r.title), r.url) + '</div>' +
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
        var h = (location.hash || '').slice(1);
        var all = S.library || [];
        var hit = all.filter(function (r) { return r.ref === h; })[0];
        var cat = hit ? hit.category : h;
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
          return '<h2 id="' + g.id + '"' + U.catVar(g.id) + ' class="cat-head">' + label(g.id) +
            ' <span class="h-count">' + g.items.length + '</span></h2>' +
            '<ul class="ref-list">' +
            (g.items.length ? g.items.map(item).join('') : '<li class="empty">항목 없음</li>') +
            '</ul>';
        }).join('');
        var crumb = document.querySelector('.topbar .crumb');
        if (crumb) crumb.innerHTML = '자료정리집 / <b>' + (cat ? label(cat) : '전체') + '</b>';
        bindCopy();

        /* 특정 자료로 들어온 경우 그 항목을 강조하고 스크롤 */
        if (hit) {
          var node = document.getElementById(hit.ref);
          if (node) {
            node.classList.add('ref--target');
            node.scrollIntoView({ block: 'center' });
          }
        }
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
            '<h3 class="prob-title">' + linkify(esc(p.title), p.url) + '</h3>' +
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
        var href = r.post ? ROOT + '/posts/' + r.post : (real(r.url) ? r.url : null);
        var inner =
          '<p class="card-meta">' + esc(r.kind || '') + ' · ' + (r.year || '') + '</p>' +
          '<p class="card-title">' + esc(r.title) + '</p>' +
          '<p class="card-desc">' + esc(r.desc || '') + '</p>' +
          '<div class="row-tags">' + tags(r.tags) + '</div>' +
          (r.post ? '<p class="card-link mono">관련 글 →</p>'
                  : (href ? '<p class="card-link mono">자세히 →</p>' : ''));
        if (!href) {
          return '<li><div class="card card--static">' + inner + '</div></li>';
        }
        var ext = /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '';
        return '<li><a class="card plain" href="' + href + '"' + ext + '>' + inner + '</a></li>';
      }).join('');
    }
  };

  document.querySelectorAll('[data-render]').forEach(function (el) {
    var fn = R[el.getAttribute('data-render')];
    if (fn) fn(el);
  });
})();
