/* ============================================================
   write.js — 글쓰기 도구
   · 마크다운 + 확장 문법
       ^[내용]      여백주석
       [[글 제목]]  내 글 연결
       {{Ref-A01}}  자료정리집 인용
       !!내용!!     결론 강조 상자
   · 자동 저장 · 등록 코드 자동 생성 · 자료/글 선택 목록
   ============================================================ */

(function () {
  var $ = function (s) { return document.querySelector(s); };
  var S = window.SITE || { posts: [], library: [], labels: {} };
  var DRAFT = 'write-draft';

  var ed = $('#editor');
  var F = {
    title: $('#f-title'), cat: $('#f-cat'), date: $('#f-date'),
    tags: $('#f-tags'), summary: $('#f-summary'), pinned: $('#f-pinned')
  };

  /* 분류 후보를 기존 데이터에서 채움 */
  var known = [];
  (S.posts || []).forEach(function (p) {
    if (p.category && known.indexOf(p.category) < 0) known.push(p.category);
  });
  $('#cat-list').innerHTML = known.map(function (c) {
    var l = (S.labels || {})[c];
    return '<option value="' + c + '">' + (l ? c + ' — ' + l : c) + '</option>';
  }).join('');

  /* ── 유틸 ────────────────────────────────────────── */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function slug(t) {
    return String(t).trim().toLowerCase()
      .replace(/[^\w가-힣]+/g, '-').replace(/^-|-$/g, '');
  }
  function fileBase() {
    return (F.date.value || '날짜') + '-' + (slug(F.title.value) || 'untitled');
  }
  function tagArr() {
    return F.tags.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  }
  /* 오늘 날짜 (UTC 아님 — 한국에서 오전에 쓰면 하루 밀리는 문제 방지) */
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  /* ── 확장 마크다운 파서 ──────────────────────────── */
  function inlineLinks(s) {
    /* 자료 인용 {{Ref-xx}} */
    s = s.replace(/\{\{([A-Za-z0-9_-]+)\}\}/g, function (_, id) {
      return '<span class="cite" data-ref="' + id + '"></span>';
    });
    /* 글 연결 [[제목]] */
    return s.replace(/\[\[([^\]]+)\]\]/g, function (_, t) {
      var hit = (S.posts || []).filter(function (p) { return p.title === t; })[0];
      var href = hit ? hit.file : slug(t) + '.html';
      return '<a class="wikilink" href="' + href + '">' + t + '</a>';
    });
  }
  function inline(s) {
    s = s.replace(/\^\[((?:[^\[\]]|\[\[[^\]]*\]\]|\{\{[^}]*\}\})*)\]/g, function (_, b) {
      return '\u0001' + inlineLinks(b) + '\u0002';
    });
    s = inlineLinks(s);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return s.replace(/\u0001/g, '<span class="sidenote">').replace(/\u0002/g, '</span>');
  }

  function parse(src) {
    var out = [], L = src.split('\n'), i = 0;
    while (i < L.length) {
      var ln = L[i];

      if (/^```/.test(ln)) {
        var lang = ln.slice(3).trim(), buf = [];
        i++;
        while (i < L.length && !/^```/.test(L[i])) { buf.push(L[i]); i++; }
        i++;
        out.push('<div class="codeblock"><pre><code class="language-' +
                 (lang || 'plaintext') + '">' + esc(buf.join('\n')) + '</code></pre></div>');
        continue;
      }
      if (/^\$\$\s*$/.test(ln)) {
        var m = []; i++;
        while (i < L.length && !/^\$\$\s*$/.test(L[i])) { m.push(L[i]); i++; }
        i++;
        out.push('<p>$$' + esc(m.join('\n')) + '$$</p>');
        continue;
      }
      if (/^!!/.test(ln) && /!!\s*$/.test(ln)) {
        out.push('<div class="key">' + inline(esc(ln.replace(/^!!|!!\s*$/g, ''))) + '</div>');
        i++; continue;
      }
      if (/^###\s/.test(ln)) { out.push('<h3>' + inline(esc(ln.slice(4))) + '</h3>'); i++; continue; }
      if (/^##\s/.test(ln))  { out.push('<h2>' + inline(esc(ln.slice(3))) + '</h2>'); i++; continue; }
      if (/^#\s/.test(ln))   { out.push('<h2>' + inline(esc(ln.slice(2))) + '</h2>'); i++; continue; }
      if (/^<figure/.test(ln)) {                       /* 이미지 블록은 그대로 통과 */
        var fg = [];
        while (i < L.length && !/<\/figure>/.test(L[i])) { fg.push(L[i]); i++; }
        fg.push(L[i] || ''); i++;
        out.push(fg.join('\n'));
        continue;
      }
      if (/^>\s?/.test(ln)) {
        var q = [];
        while (i < L.length && /^>\s?/.test(L[i])) { q.push(L[i].replace(/^>\s?/, '')); i++; }
        out.push('<blockquote><p>' + inline(esc(q.join(' '))) + '</p></blockquote>');
        continue;
      }
      if (/^[-*]\s/.test(ln)) {
        var it = [];
        while (i < L.length && /^[-*]\s/.test(L[i])) { it.push(L[i].slice(2)); i++; }
        out.push('<ul>' + it.map(function (t) {
          return '<li>' + inline(esc(t)) + '</li>';
        }).join('') + '</ul>');
        continue;
      }
      if (/^---\s*$/.test(ln)) { out.push('<hr>'); i++; continue; }
      if (/^\s*$/.test(ln)) { i++; continue; }

      var p = [];
      while (i < L.length && !/^\s*$/.test(L[i]) &&
             !/^(#|```|>|[-*]\s|\$\$|---|!!|<figure)/.test(L[i])) { p.push(L[i]); i++; }
      out.push('<p>' + inline(esc(p.join(' '))) + '</p>');
    }
    return out.join('\n');
  }

  /* ── 미리보기 ────────────────────────────────────── */
  function bodyHTML() { return parse(ed.value); }

  function refresh() {
    var pv = $('#preview');
    pv.innerHTML =
      '<div class="post-head"><h1>' + esc(F.title.value || '제목 없음') + '</h1>' +
      '<div class="post-meta"><span class="post-date">' +
      (F.date.value || '').replace(/-/g, '.') + '</span>' +
      tagArr().map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') +
      '</div></div><div class="post-body">' + bodyHTML() + '</div>';

    /* 미리보기에서도 인용 마크를 실제 자료 정보로 보여줌 */
    pv.querySelectorAll('.cite[data-ref]').forEach(function (mk) {
      var id = mk.getAttribute('data-ref');
      var r = (S.library || []).filter(function (x) { return x.ref === id; })[0];
      var sn = document.createElement('span');
      sn.className = 'sidenote sidenote--ref';
      sn.innerHTML = r
        ? '<span class="sn-cite">[' + r.ref + ']</span> ' + esc(r.title) +
          (r.author ? ' · ' + esc(r.author) : '') + (r.year ? ' (' + r.year + ')' : '')
        : '<span class="sn-cite">[' + esc(id) + ']</span> 자료정리집에 없는 인용입니다';
      mk.parentNode.replaceChild(sn, mk);
    });

    if (window.renderMathInElement) {
      window.renderMathInElement(pv, {
        delimiters: [{ left: '$$', right: '$$', display: true },
                     { left: '$', right: '$', display: false }],
        throwOnError: false
      });
    }
    if (window.hljs) {
      pv.querySelectorAll('pre code').forEach(function (c) { window.hljs.highlightElement(c); });
    }
    $('#f-filename').textContent = fileBase() + '.html';
    genRegister();
    save();
  }
  var t = null;
  function queue() { clearTimeout(t); t = setTimeout(refresh, 220); }
  Object.keys(F).forEach(function (k) {
    F[k].addEventListener(F[k].type === 'checkbox' ? 'change' : 'input', queue);
  });
  ed.addEventListener('input', queue);

  /* ── 자동 저장 ───────────────────────────────────── */
  function save() {
    try {
      localStorage.setItem(DRAFT, JSON.stringify({
        title: F.title.value, cat: F.cat.value, date: F.date.value,
        tags: F.tags.value, summary: F.summary.value,
        pinned: F.pinned.checked, body: ed.value
      }));
      var s = $('#w-saved');
      s.classList.add('flash');
      setTimeout(function () { s.classList.remove('flash'); }, 400);
    } catch (e) {}
  }
  function restore() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(DRAFT)); } catch (e) {}
    if (d) {
      F.title.value = d.title || ''; F.cat.value = d.cat || 'essay';
      F.date.value = d.date || todayStr();
      F.tags.value = d.tags || ''; F.summary.value = d.summary || '';
      F.pinned.checked = !!d.pinned; ed.value = d.body || '';
    } else {
      F.date.value = todayStr();
      F.cat.value = 'essay';
    }
  }

  $('#btn-clear').addEventListener('click', function () {
    if (!confirm('작성 중인 내용을 모두 지울까요?')) return;
    F.title.value = ''; F.tags.value = ''; F.summary.value = '';
    F.pinned.checked = false; ed.value = '';
    refresh();
  });

  /* ── 등록 코드 생성 ──────────────────────────────── */
  function genRegister() {
    var entry =
      "    { title: '" + (F.title.value || '제목').replace(/'/g, "\\'") + "',\n" +
      "      file: '" + fileBase() + ".html',\n" +
      "      category: '" + (F.cat.value || 'essay') + "',\n" +
      "      date: '" + F.date.value + "',\n" +
      "      tags: [" + tagArr().map(function (t) { return "'" + t.replace(/'/g, "\\'") + "'"; }).join(', ') + "],\n" +
      (F.pinned.checked ? "      pinned: true,\n" : "") +
      "      summary: '" + (F.summary.value || '').replace(/'/g, "\\'") + "' },";
    $('#gen-entry').textContent = entry;

    $('#gen-git').textContent =
      'cd C:\\Users\\songh\\jongdal\n' +
      'git add -A\n' +
      'git commit -m "새 글: ' + (F.title.value || '제목') + '"\n' +
      'git push';

    var c = F.cat.value || 'essay';
    $('#gen-label').textContent = c + ": '한글이름'";
  }

  /* ── 툴바 ────────────────────────────────────────── */
  function wrap(before, after, placeholder) {
    var s = ed.selectionStart, e = ed.selectionEnd;
    var sel = ed.value.slice(s, e) || placeholder || '';
    ed.value = ed.value.slice(0, s) + before + sel + after + ed.value.slice(e);
    ed.focus();
    ed.selectionStart = s + before.length;
    ed.selectionEnd = s + before.length + sel.length;
    queue();
  }
  function insert(text) {
    var s = ed.selectionStart;
    ed.value = ed.value.slice(0, s) + text + ed.value.slice(ed.selectionEnd);
    ed.focus();
    ed.selectionStart = ed.selectionEnd = s + text.length;
    queue();
  }
  var INS = {
    h2:     ['\n## ', '\n', '제목'],
    h3:     ['\n### ', '\n', '소제목'],
    bold:   ['**', '**', '굵게'],
    italic: ['*', '*', '기울임'],
    list:   ['\n- ', '\n', '항목'],
    quote:  ['\n> ', '\n', '인용문'],
    code:   ['`', '`', 'code'],
    fence:  ['\n```cpp\n', '\n```\n', '// 코드를 여기에'],
    imath:  ['$', '$', 'x^2'],
    math:   ['\n$$\n', '\n$$\n', 'f(x) = x^2'],
    key:    ['\n!!', '!!\n', '핵심 결론'],
    sn:     ['^[', ']', '여백에 들어갈 설명'],
    link:   ['[', '](https://)', '링크 텍스트']
  };
  document.querySelectorAll('[data-ins]').forEach(function (b) {
    b.addEventListener('click', function () {
      var a = INS[b.getAttribute('data-ins')];
      if (a) wrap(a[0], a[1], a[2]);
    });
  });

  /* ── 이미지 넣기 ─────────────────────────────────── */
  $('#btn-img').addEventListener('click', function () {
    var name = prompt('assets/img/ 안의 파일명을 입력하세요\n예: my-diagram.svg');
    if (!name) return;
    var cap = prompt('캡션 (없으면 비워 두세요)') || '';
    insert('\n<figure>\n  <img src="../assets/img/' + name + '" alt="' + (cap || '그림') + '">\n' +
      (cap ? '  <figcaption><span class="fig-no">Fig.</span>' + cap + '</figcaption>\n' : '') +
      '</figure>\n');
  });

  /* ── 선택 목록 (글 연결 / 자료 인용) ─────────────── */
  var picker = $('#picker'), pq = $('#picker-q'), plist = $('#picker-list');
  var pmode = null, pdata = [];

  function openPicker(mode) {
    if (pmode === mode && !picker.hidden) { picker.hidden = true; pmode = null; return; }
    pmode = mode;
    pdata = mode === 'wiki'
      ? (S.posts || []).map(function (p) {
          return { main: p.title, sub: (S.labels[p.category] || p.category) + ' · ' + p.date,
                   find: (p.tags || []).join(' ') + ' ' + p.category,
                   ins: '[[' + p.title + ']]' };
        })
      : (S.library || []).map(function (r) {
          return { main: r.title, sub: r.ref + ' · ' + (r.author || ''),
                   find: (r.tags || []).join(' ') + ' ' + r.category + ' ' + (r.desc || ''),
                   ins: '{{' + r.ref + '}}' };
        });
    picker.hidden = false;
    pq.value = '';
    pq.placeholder = mode === 'wiki' ? '연결할 글 검색…' : '인용할 자료 검색…';
    drawPicker('');
    pq.focus();
  }
  function drawPicker(q) {
    var s = q.toLowerCase();
    var hits = pdata.filter(function (d) {
      return (d.main + ' ' + d.sub + ' ' + (d.find || '')).toLowerCase().indexOf(s) >= 0;
    });
    plist.innerHTML = hits.length
      ? hits.map(function (d, i) {
          return '<li data-i="' + pdata.indexOf(d) + '">' + esc(d.main) +
                 '<span class="pk-sub">' + esc(d.sub) + '</span></li>';
        }).join('')
      : '<li class="pk-empty">결과 없음</li>';
  }
  pq.addEventListener('input', function () { drawPicker(pq.value); });
  plist.addEventListener('click', function (e) {
    var li = e.target.closest('li[data-i]');
    if (!li) return;
    insert(pdata[+li.getAttribute('data-i')].ins);
    picker.hidden = true; pmode = null;
  });
  $('#btn-wiki').addEventListener('click', function () { openPicker('wiki'); });
  $('#btn-cite').addEventListener('click', function () { openPicker('cite'); });

  /* ── 탭 ──────────────────────────────────────────── */
  document.querySelectorAll('.w-tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.w-tabs button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      ['preview', 'register', 'help'].forEach(function (n) {
        document.getElementById('tab-' + n).hidden = (n !== b.getAttribute('data-tab'));
      });
    });
  });

  /* ── 복사 버튼 ───────────────────────────────────── */
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var el = document.querySelector(b.getAttribute('data-copy'));
      navigator.clipboard.writeText(el.textContent).then(function () {
        b.textContent = '복사됨 ✓'; b.classList.add('ok');
        setTimeout(function () { b.textContent = '복사'; b.classList.remove('ok'); }, 1500);
      });
    });
  });

  /* ── 내보내기 ────────────────────────────────────── */
  function download(name, text, mime) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: mime }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  $('#exp-md').addEventListener('click', function () {
    var fm = '---\ntitle: ' + F.title.value + '\ncategory: ' + F.cat.value +
             '\ndate: ' + F.date.value + '\ntags: [' + F.tags.value + ']' +
             '\nsummary: ' + F.summary.value + '\n---\n\n';
    download(fileBase() + '.md', fm + ed.value, 'text/markdown');
  });

  $('#exp-html').addEventListener('click', function () {
    if (!F.title.value.trim()) { alert('제목을 입력해 주세요.'); F.title.focus(); return; }
    var catLabel = (S.labels || {})[F.cat.value] || F.cat.value;
    var tagHTML = tagArr().map(function (t) {
      return '<span class="tag">' + esc(t) + '</span>';
    }).join('\n            ');

    var html = '<!doctype html>\n<html lang="ko">\n<head>\n' +
      '  <meta charset="UTF-8">\n' +
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '  <title>' + esc(F.title.value) + ' — ' + SITE_NAME + '</title>\n' +
      '  <meta property="og:title" content="' + esc(F.title.value) + '">\n' +
      '  <meta property="og:description" content="' + esc(F.summary.value) + '">\n' +
      '  <link rel="icon" href="../assets/favicon.svg">\n' +
      '  <link rel="preconnect" href="https://fonts.googleapis.com">\n' +
      '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
      '  <link rel="stylesheet" href="https://hangeul.pstatic.net/hangeul_static/css/nanum-square-neo.css">\n' +
      '  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap" rel="stylesheet">\n' +
      '  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">\n' +
      '  <link rel="stylesheet" href="../assets/css/base.css">\n' +
      '  <link rel="stylesheet" href="../assets/css/layout.css">\n' +
      '  <link rel="stylesheet" href="../assets/css/components.css">\n' +
      '  <link rel="stylesheet" href="../assets/css/post.css">\n' +
      '</head>\n<body data-crumb="글 / ' + esc(catLabel) +
      ' / <b>' + esc(F.title.value) + '</b>">\n' +
      '  <main>\n    <div class="page page--post">\n      <article>\n' +
      '        <div class="post-head">\n          <h1>' + esc(F.title.value) + '</h1>\n' +
      '          <div class="post-meta">\n            <span class="post-date">' +
      F.date.value.replace(/-/g, '.') + '</span>\n' +
      (tagHTML ? '            ' + tagHTML + '\n' : '') +
      '          </div>\n        </div>\n' +
      '        <div class="post-body">\n' + bodyHTML() + '\n        </div>\n' +
      '      </article>\n      <div class="margin-col"></div>\n    </div>\n  </main>\n' +
      '  <footer><p>&copy; 2026</p></footer>\n' +
      '  <script>window.ROOT=\'..\'<\/script>\n' +
      '  <script src="../assets/data/content.js"><\/script>\n' +
      '  <script src="../assets/js/nav.js"><\/script>\n' +
      '  <script src="../assets/js/progress.js"><\/script>\n' +
      '  <script defer src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"><\/script>\n' +
      '  <script src="../assets/js/code.js"><\/script>\n' +
      '  <script src="../assets/js/post.js"><\/script>\n' +
      '  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"><\/script>\n' +
      '  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"\n' +
      '    onload="renderMathInElement(document.body,{delimiters:[{left:\'$$\',right:\'$$\',display:true},{left:\'$\',right:\'$\',display:false}],throwOnError:false})"><\/script>\n' +
      '</body>\n</html>\n';

    download(fileBase() + '.html', html, 'text/html');

    /* 내려받으면 등록 탭으로 자동 이동 */
    document.querySelector('.w-tabs button[data-tab="register"]').click();
    document.querySelectorAll('.w-steps li').forEach(function (li) { li.classList.add('on'); });
  });

  restore();
  refresh();
})();
