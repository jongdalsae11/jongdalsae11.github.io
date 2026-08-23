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

  /* ── 한글 → 로마자 ────────────────────────────────
     파일명에 한글이 들어가면 주소가 %EC%9D%B4… 로 깨져 보이므로
     국어의 로마자 표기법(문화체육관광부 고시)에 맞춰 옮깁니다.
     받침이 뒤 음절 첫소리와 만날 때의 소리 변화까지 반영합니다.   */
  var CHO = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
  var JUNG = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo',
              'u','wo','we','wi','yu','eu','ui','i'];
  var JONG = ['','g','k','ks','n','nj','nh','d','l','lg','lm','lb','ls','lt','lp','lh',
              'm','b','bs','s','ss','ng','j','ch','k','t','p','h'];

  function romanize(t) {
    var out = '';
    for (var i = 0; i < t.length; i++) {
      var c = t.charCodeAt(i) - 0xac00;
      if (c < 0 || c > 11171) { out += t[i]; continue; }
      var cho = Math.floor(c / 588),
          jung = Math.floor((c % 588) / 28),
          jong = c % 28;
      /* ㅇ 초성은 소리가 없으므로 자음을 붙이지 않습니다 */
      out += CHO[cho] + JUNG[jung] + JONG[jong];
    }
    return out;
  }

  /* ── 한글 → 영어 낱말 ─────────────────────────────
     브라우저에는 번역기가 없으므로 낱말집으로 옮깁니다.
     낱말집에 없는 말만 로마자로 떨어집니다.
     내 분야 용어는 content.js 의 terms 에 추가하면 바로 반영됩니다. */
  var TERMS = {
    /* 수학 — 해석 */
    '수열': 'sequence', '급수': 'series', '극한': 'limit', '수렴': 'convergence',
    '발산': 'divergence', '연속': 'continuity', '미분': 'derivative', '적분': 'integral',
    '미적분': 'calculus', '해석학': 'analysis', '실해석': 'real-analysis',
    '복소해석': 'complex-analysis', '위상수학': 'topology', '측도': 'measure',
    '코시': 'cauchy', '판정법': 'criterion', '논법': 'argument', '정의': 'definition',
    '정리': 'theorem', '보조정리': 'lemma', '따름정리': 'corollary', '증명': 'proof',
    '반례': 'counterexample', '부등식': 'inequality', '등식': 'identity',
    '함수': 'function', '집합': 'set', '사상': 'map', '공간': 'space',
    '유계': 'bounded', '조밀': 'dense', '균등': 'uniform', '점별': 'pointwise',
    /* 수학 — 대수·정수론 */
    '정수론': 'number-theory', '대수': 'algebra', '선형대수': 'linear-algebra',
    '군': 'group', '환': 'ring', '체': 'field', '행렬': 'matrix', '벡터': 'vector',
    '소수': 'prime', '합동': 'congruence', '나머지': 'remainder', '약수': 'divisor',
    '배수': 'multiple', '오일러': 'euler', '페르마': 'fermat', '가우스': 'gauss',
    '조합': 'combinatorics', '확률': 'probability', '통계': 'statistics',
    '생성함수': 'generating-function', '점화식': 'recurrence',
    /* 알고리즘·전산 */
    '알고리즘': 'algorithm', '자료구조': 'data-structure', '세그먼트': 'segment',
    '세그먼트 트리': 'segment-tree', '트리': 'tree', '그래프': 'graph',
    '탐색': 'search', '이분탐색': 'binary-search', '정렬': 'sort', '완전탐색': 'brute-force',
    '동적계획법': 'dynamic-programming', '분할정복': 'divide-and-conquer',
    '그리디': 'greedy', '백트래킹': 'backtracking', '최단경로': 'shortest-path',
    '최소신장트리': 'minimum-spanning-tree', '플로우': 'flow', '유량': 'flow',
    '해시': 'hash', '스택': 'stack', '큐': 'queue', '힙': 'heap', '덱': 'deque',
    '문자열': 'string', '구현': 'implementation', '최적화': 'optimization',
    '시간복잡도': 'time-complexity', '복잡도': 'complexity', '메모이제이션': 'memoization',
    '좌표압축': 'coordinate-compression', '누적합': 'prefix-sum', '지연전파': 'lazy-propagation',
    '위상정렬': 'topological-sort', '유니온파인드': 'union-find',
    /* 물리·공학 */
    '물리': 'physics', '역학': 'mechanics', '전자기': 'electromagnetism',
    '열역학': 'thermodynamics', '양자': 'quantum', '상대성': 'relativity',
    '파동': 'wave', '진동': 'oscillation', '에너지': 'energy', '운동': 'motion',
    '힘': 'force', '설계': 'design', '실험': 'experiment', '측정': 'measurement',
    /* 글쓰기·일반 */
    '노트': 'note', '정리노트': 'notes', '메모': 'memo', '기록': 'log',
    '회고': 'retrospective', '일지': 'journal', '후기': 'review', '요약': 'summary',
    '입문': 'intro', '첫걸음': 'first-steps', '기초': 'basics', '심화': 'advanced',
    '연습': 'practice', '문제': 'problem', '풀이': 'solution', '해설': 'walkthrough',
    '사용법': 'how-to', '가이드': 'guide', '정리하기': 'organizing', '생각': 'thoughts',
    '이유': 'why', '방법': 'how', '차이': 'difference', '비교': 'comparison',
    '예시': 'example', '적용': 'application', '활용': 'using', '이해': 'understanding',
    '일상': 'daily', '공부': 'study', '독서': 'reading', '책': 'book',
    '프로젝트': 'project', '연구': 'research', '계획': 'plan', '목표': 'goal',
    '오늘': 'today', '어제': 'yesterday', '내일': 'tomorrow', '주간': 'weekly',
    '제목': 'title', '값': 'value', '파이': 'phi', '람다': 'lambda', '시그마': 'sigma',
    '편심': 'eccentric', '도르래': 'pulley', '지렛대': 'lever', '기구': 'device',
    '지연 전파': 'lazy-propagation', '좌표 압축': 'coordinate-compression',
    '누적 합': 'prefix-sum', '이분 탐색': 'binary-search', '동적 계획법': 'dynamic-programming',
    '완전 탐색': 'brute-force', '최단 경로': 'shortest-path', '시간 복잡도': 'time-complexity'
  };

  /* 낱말 뒤에 붙는 조사·어미 — 옮길 때 떼어 냅니다.
     ('활용한' → using + 한,  '최적화하기' → optimization + 하기) */
  var JOSA = /^(으로서|으로써|에서는|에게서|이라는|라는|으로|이라|에서|에게|까지|부터|보다|처럼|마다|조차|밖에|은|는|이|가|을|를|의|에|와|과|도|만|로|랑|이나|나)/;
  var ENDING = /^(하였습니다|했습니다|합니다|입니다|하는|되는|하기|하여|해서|하다|되다|한|된|해|함|됨)/;

  function terms() {
    var extra = (window.SITE && window.SITE.terms) || {};
    var all = {};
    Object.keys(TERMS).forEach(function (k) { all[k] = TERMS[k]; });
    Object.keys(extra).forEach(function (k) { all[k] = extra[k]; });
    return all;
  }

  /* 제목을 영어 낱말로 옮깁니다. 모르는 말은 로마자로 남습니다. */
  function translate(t) {
    var dict = terms();
    /* 긴 표현부터 맞춰야 '세그먼트 트리' 가 '세그먼트'+'트리' 로 쪼개지지 않습니다 */
    var keys = Object.keys(dict).sort(function (a, b) { return b.length - a.length; });
    var s = String(t || '').trim(), out = [], buf = '';

    function flushBuf() {
      if (buf.trim()) out.push(romanize(buf.trim()));
      buf = '';
    }

    outer:
    while (s.length) {
      for (var i = 0; i < keys.length; i++) {
        if (s.indexOf(keys[i]) === 0) {
          flushBuf();
          out.push(dict[keys[i]]);
          s = s.slice(keys[i].length).replace(ENDING, '').replace(JOSA, '');
          continue outer;
        }
      }
      buf += s[0];
      s = s.slice(1);
    }
    flushBuf();
    return out.join(' ');
  }

  /* 제목 → 파일명·주소에 쓸 수 있는 영문 문자열 */
  function slug(t) {
    return translate(t)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/, '');
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

  /* ══════════════════════════════════════════════════
     인용 그래프
     글은 언제나 "이전 글"만 인용하므로 순환이 생길 수 없습니다.
     즉 항상 DAG 이고, 위상 정렬과 층 배치가 반드시 성공합니다.
     ══════════════════════════════════════════════════ */

  /* links: ['a.html'] 은 "이 글이 a 를 인용한다" 는 뜻입니다.
     읽는 순서로 보면 a 가 먼저이므로 화살표는 a → 나 로 그립니다. */
  function graph() {
    var posts = (S().posts || []).slice();
    var byFile = {};
    posts.forEach(function (p) { byFile[p.file] = p; });

    var edges = [];
    posts.forEach(function (p) {
      (p.links || []).forEach(function (l) {
        if (byFile[l]) edges.push({ from: l, to: p.file });
      });
    });
    return { posts: posts, byFile: byFile, edges: edges };
  }

  /* 층(depth) = 그 글에 이르는 가장 긴 인용 사슬의 길이.
     가장 긴 경로를 쓰면 "먼저 읽어야 할 글" 이 반드시 왼쪽에 옵니다. */
  function layers(g) {
    g = g || graph();
    var depth = {}, inFrom = {};
    g.posts.forEach(function (p) { depth[p.file] = 0; inFrom[p.file] = []; });
    g.edges.forEach(function (e) { inFrom[e.to].push(e.from); });

    /* 순환이 없으므로 반복이 반드시 끝납니다 (안전을 위해 상한도 둡니다) */
    var changed = true, guard = 0;
    while (changed && guard++ < g.posts.length + 2) {
      changed = false;
      g.posts.forEach(function (p) {
        var d = 0;
        inFrom[p.file].forEach(function (f) { d = Math.max(d, depth[f] + 1); });
        if (d !== depth[p.file]) { depth[p.file] = d; changed = true; }
      });
    }
    return depth;
  }

  /* 흐름 — content.js 의 flows. 순서 있는 글 목록이며 분류를 가로질러도 됩니다. */
  function flows() {
    return (S().flows || []).filter(function (f) {
      return f && f.id && (f.posts || []).length;
    });
  }
  /* 이 글이 속한 흐름들 */
  function flowsOf(file) {
    return flows().filter(function (f) { return (f.posts || []).indexOf(file) >= 0; });
  }
  /* 흐름 위의 이웃 (앞 글 · 뒤 글) */
  function flowNeighbors(file, flowId) {
    var f = flows().filter(function (x) { return x.id === flowId; })[0] || flowsOf(file)[0];
    if (!f) return null;
    var i = f.posts.indexOf(file);
    if (i < 0) return null;
    return { flow: f, prev: f.posts[i - 1] || null, next: f.posts[i + 1] || null, index: i };
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
    esc: esc, slug: slug, romanize: romanize, translate: translate,
    dot: dot, today: today, label: label,
    tags: tags, real: real, linkify: linkify, byDateDesc: byDateDesc,
    postByFile: postByFile, refById: refById, sortedPosts: sortedPosts,
    catColor: catColor, catVar: catVar, applyTheme: applyTheme,
    catTop: catTop, catDepth: catDepth, catChain: catChain,
    catMatches: catMatches, catPath: catPath, catTree: catTree,
    graph: graph, layers: layers,
    flows: flows, flowsOf: flowsOf, flowNeighbors: flowNeighbors,
    validate: validate
  };
})();
