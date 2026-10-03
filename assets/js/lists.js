/* ============================================================
   lists.js — content.js 데이터로 각 페이지의 목록을 렌더링
   · 홈 · 글 목록(카테고리별) · 자료정리집 · 문제 · 연구
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
      /* 제목 아래에 요약과 태그를 붙입니다. 예전엔 제목·분류·태그가 한 줄에
         나란히 섰는데, 알약 태그를 걷고 나니 한 줄이 너무 길어졌습니다.   */
      return '<li' + U.catVar(p.category) + '><a class="row plain" href="' + postHref(p) + '">' +
        '<span class="row-date">' + dot(p.date) + '</span>' +
        '<span class="row-main">' +
          '<span class="row-title">' + U.mathify(p.title) + '</span>' +
          (p.summary ? '<span class="row-sum">' + esc(p.summary) + '</span>' : '') +
          '<span class="row-tags">' + tags(p.tags) + '</span>' +
        '</span>' +
        '<span class="row-cat">' + esc(label(p.category)) + '</span></a></li>';
    }).join('');
  }

  var R = {
    /* ── 홈 ───────────────────────────────────────────
       예전 홈은 «현재 탐구 중» 터미널 줄, 분류별 숫자 카드, 태그 구름,
       최근 자료·문제 두 칸까지 대시보드처럼 쌓여 있었습니다. 글이 몇 편
       안 될 때는 숫자가 작아서 오히려 비어 보였고, 보는 사람들에게서
       «흔한 AI 디자인 같다» 는 말을 들었습니다. 그래서 소개 몇 문장과
       글 목록만 남겼습니다. (4단계 — 시안 B «목록» + C 의 «소개»)      */

    /* 소개 문단 — content.js 의 intro (문자열 하나 또는 문단 배열).
       내가 직접 쓰는 글이라 HTML 을 그대로 받습니다.                 */
    intro: function (el) {
      var t = S.intro;
      if (!t) { el.remove(); return; }
      var paras = [].concat(t);
      el.innerHTML = paras.map(function (p) { return '<p>' + p + '</p>'; }).join('');
    },

    /* 고정 글 — 카드 대신 한 줄 */
    pinline: function (el) {
      var pinned = (S.posts || []).filter(function (p) { return p.pinned; });
      if (!pinned.length) { el.remove(); return; }
      el.className = 'home-pins';
      el.innerHTML = pinned.map(function (p) {
        return '<a class="home-pin plain" href="' + postHref(p) + '">' +
          '<span class="home-pin-k">고정</span>' +
          '<span class="home-t">' + U.mathify(p.title) + '</span></a>';
      }).join('');
    },

    /* 최근 글 — 날짜 · 제목 · 분류 한 줄씩.
       글 목록 페이지의 rowsOf 와 따로 둔 것은 일부러입니다. 거기는
       태그·분류 경로까지 보여야 하고, 홈은 한눈에 훑는 것이 목적입니다. */
    recent: function (el) {
      var list = U.sortedPosts().slice(0, 5);
      if (!list.length) { el.innerHTML = '<li class="empty">아직 글이 없습니다.</li>'; return; }
      el.innerHTML = list.map(function (p) {
        return '<li><a class="home-row plain" href="' + postHref(p) + '">' +
          '<span class="home-d">' + dot(p.date) + '</span>' +
          '<span class="home-t">' + U.mathify(p.title) + '</span>' +
          '<span class="home-c">' + esc(label(p.category)) + '</span></a></li>';
      }).join('');
    },

    /* 읽는 순서 — 흐름 하나가 화살표로 이어진 한 줄 */
    flowlines: function (el) {
      var flows = U.flows();
      if (!flows.length) { el.remove(); return; }
      el.innerHTML = flows.map(function (f) {
        var steps = f.posts.map(function (file) {
          var p = U.postByFile(file);
          return p ? '<a class="plain" href="' + postHref(p) + '">' + U.mathify(p.title) + '</a>' : '';
        }).filter(Boolean);
        return '<h2 class="home-sec">읽는 순서 — ' + esc(f.label || f.id) + '</h2>' +
          '<p class="home-flow">' + steps.join('<span class="home-ar" aria-hidden="true">→</span>') + '</p>';
      }).join('');
    },

    /* 맨 아래 한 줄 — 다른 곳으로 가는 길 + 아무 글이나 한 편.
       0개인 곳(문제·연구)은 빈 페이지로 보내지 않도록 링크를 뺍니다. */
    homefoot: function (el) {
      var n = function (a) { return (a || []).length; };
      var links = [['graph.html', '글 지도', 0]];
      if (n(S.sims)) links.push(['sims.html', '시뮬레이션', n(S.sims)]);
      if (n(S.library)) links.push(['library.html', '자료정리집', n(S.library)]);
      if (n(S.problems)) links.push(['archive.html', '문제', n(S.problems)]);
      if (n(S.research)) links.push(['research.html', '연구', n(S.research)]);
      el.innerHTML = links.map(function (l) {
        return '<a class="plain" href="' + ROOT + '/' + l[0] + '">' + l[1] +
          (l[2] ? ' <span class="home-n">' + l[2] + '</span>' : '') + '</a>';
      }).join('') +
        (n(S.posts) ? '<a class="home-lucky plain" href="#">아무 글이나 한 편 →</a>' : '');

      var lucky = el.querySelector('.home-lucky');
      if (lucky) lucky.addEventListener('click', function (e) {
        e.preventDefault();
        var all = S.posts;
        location.href = postHref(all[Math.floor(Math.random() * all.length)]);
      });
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
            ((isTag || cat) ? ' <a class="clear-filter plain" href="#">전체 보기 ✕</a>' : '');
          if (cat) titleEl.style.setProperty('--cat', U.catColor(cat));
          else titleEl.style.removeProperty('--cat');
        }
        if (subEl) subEl.textContent = list.length + '편';
        var crumb = document.querySelector('.topbar .crumb');
        if (crumb) {
          crumb.innerHTML = '글 / <b>' +
            (isTag ? esc(name) : (cat ? esc(U.catPath(cat)) : '전체')) + '</b>';
        }

        /* 상위 분류를 보고 있으면 하위 분류로 좁혀 갈 수 있는 칩 */
        var sub = document.querySelector('[data-subcats]');
        if (sub) {
          var node = null;
          (function find(nodes) {
            (nodes || []).forEach(function (n) {
              if (n.id === cat) node = n;
              else find(n.children);
            });
          })(U.catTree(S.posts));
          var kids = cat && node ? node.children : (cat ? [] : U.catTree(S.posts));
          sub.innerHTML = kids.length
            ? (cat ? '<a class="chip plain" href="#' + encodeURIComponent(cat) +
                     '">전체 ' + node.count + '</a>' : '') +
              kids.map(function (k) {
                return '<a class="chip plain" href="#' + encodeURIComponent(k.id) + '"' +
                  U.catVar(k.id) + '><span class="cat-dot"></span>' + esc(k.label) +
                  '<span class="tg-n">' + k.count + '</span></a>';
              }).join('')
            : '';
        }

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
    /* ── 시뮬레이션 목록 ────────────────────────────
       자료정리집과 같은 생김새로 두었습니다. 글에 넣는 방법도 같으니까요.
       [Sim-xx] 를 누르면 인용 태그가 그대로 복사됩니다.            */
    sims: function (el) {
      var ROOT = window.ROOT || '.';
      var all = S.sims || [];
      if (!all.length) { el.innerHTML = '<p class="empty">아직 없음</p>'; return; }

      el.innerHTML = '<ul class="ref-list">' + all.map(function (r) {
        var post = r.post ? U.postByFile(r.post) : null;
        return '<li class="ref" id="' + esc(r.ref) + '">' +
          '<div class="ref-body">' +
            '<div class="ref-title"><a href="' + ROOT + '/sims/' + esc(r.file) + '">' +
              U.mathify(r.title) + '</a></div>' +
            '<div class="ref-src">' + esc(U.catPath(r.category, ' › ')) +
              (post ? ' · 쓰인 글 <a href="' + ROOT + '/posts/' + esc(post.file) + '">' +
                      U.mathify(post.title) + '</a>' : '') + '</div>' +
            (r.desc ? '<p class="ref-desc">' + esc(r.desc) + '</p>' : '') +
            '<div class="row-tags">' + tags(r.tags) + '</div>' +
          '</div>' +
          '<span class="ref-fmt tag tag--dim">SIM</span>' +
          '<button class="ref-id" data-cite="{{' + esc(r.ref) + '}}">[' + esc(r.ref) + ']</button>' +
        '</li>';
      }).join('') + '</ul>';

      el.querySelectorAll('.ref-id').forEach(function (b) {
        b.addEventListener('click', function () {
          navigator.clipboard.writeText(b.getAttribute('data-cite')).then(function () {
            var t = b.textContent;
            b.textContent = '복사됨 ✓';
            setTimeout(function () { b.textContent = t; }, 1400);
          });
        });
      });
    },

    library: function (el) {
      function item(r) {
        return '<li class="ref" id="' + r.ref + '">' +
          '<div class="ref-body">' +
            '<div class="ref-title">' + linkify(U.mathify(r.title), r.url) + '</div>' +
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
        var h = decodeURIComponent((location.hash || '').slice(1));
        var all = S.library || [];
        var hit = all.filter(function (r) { return r.ref === h; })[0];
        var cat = hit ? hit.category : h;

        /* 보여 줄 분류들 — 상위를 고르면 하위까지 순서대로 */
        var chosen = all.filter(function (r) { return U.catMatches(r.category, cat); });
        var seen = [], groups = [];
        chosen.forEach(function (r) {
          if (seen.indexOf(r.category) < 0) {
            seen.push(r.category);
            groups.push({ id: r.category,
              items: chosen.filter(function (x) { return x.category === r.category; }) });
          }
        });

        el.innerHTML = groups.length
          ? groups.map(function (g) {
              return '<h2 id="' + g.id.replace(/\//g, '-') + '"' + U.catVar(g.id) +
                ' class="cat-head cat-head--d' + Math.min(U.catDepth(g.id), 2) + '">' +
                esc(U.catPath(g.id, ' › ')) +
                ' <span class="h-count">' + g.items.length + '</span></h2>' +
                '<ul class="ref-list">' + g.items.map(item).join('') + '</ul>';
            }).join('')
          : '<p class="empty">항목 없음</p>';

        var crumb = document.querySelector('.topbar .crumb');
        if (crumb) {
          crumb.innerHTML = '자료정리집 / <b>' +
            (cat ? esc(U.catPath(cat)) : '전체') + '</b>';
        }
        bindCopy();

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
      if (!(S.problems || []).length) {
        el.innerHTML = '<li class="empty">아직 올린 문제가 없습니다. ' +
          '<a href="' + ROOT + '/write.html">문제 등록</a>에서 추가할 수 있습니다.</li>';
        return;
      }
      el.innerHTML = (S.problems || []).slice().sort(byDateDesc).map(function (p) {
        return '<li class="prob" data-diff="' + p.diff + '">' +
          '<div class="prob-head">' +
            '<h3 class="prob-title">' + linkify(U.mathify(p.title), p.url) + '</h3>' +
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
      if (!(S.research || []).length) {
        el.innerHTML = '<li class="empty">아직 올린 연구·프로젝트가 없습니다. ' +
          '<a href="' + ROOT + '/write.html">연구 등록</a>에서 추가할 수 있습니다.</li>';
        return;
      }
      el.innerHTML = (S.research || []).map(function (r) {
        var href = r.post ? ROOT + '/posts/' + r.post : (real(r.url) ? r.url : null);
        var inner =
          '<p class="card-meta">' + esc(r.kind || '') + ' · ' + (r.year || '') + '</p>' +
          '<p class="card-title">' + U.mathify(r.title) + '</p>' +
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
