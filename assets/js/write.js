/* ============================================================
   write.js — 글쓰기 페이지 (write.html 전용)
   · 마크다운 + 확장 문법:
       ^[내용]     → 여백주석 (sidenote)
       [[글 제목]] → 글 연결 (백링크/인용 그래프의 근거)
       겹쳐 쓰기:  ^[[[글 제목]]과 같은 구조] 도 동작
   · 내보내기: .md (frontmatter 원고) / .html (완성 글 페이지)
   ============================================================ */

(function () {
  var $ = function (s) { return document.querySelector(s); };
  var ed = $('#editor'), pv = $('#preview');
  var fTitle = $('#f-title'), fCat = $('#f-cat'), fDate = $('#f-date'), fTags = $('#f-tags');

  fDate.value = new Date().toISOString().slice(0, 10);

  /* ── 확장 마크다운 파서 ──────────────────────────── */
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function slug(t) {
    return t.trim().toLowerCase().replace(/[^\w가-힣]+/g, '-').replace(/^-|-$/g, '');
  }
  function inline(s) {
    /* 여백주석 ^[...] — 내부의 [[...]] 링크까지 처리 */
    s = s.replace(/\^\[((?:[^\[\]]|\[\[[^\]]*\]\])*)\]/g, function (_, body) {
      return 'SN' + inlineLinks(body) + 'NS';
    });
    s = inlineLinks(s);
    s = s.replace(/`([^`]+)`/g, function (_, c) { return '<code>' + c + '</code>'; });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/SN/g, '<span class="sidenote">').replace(/NS/g, '</span>');
    return s;
  }
  function inlineLinks(s) {
    return s.replace(/\[\[([^\]]+)\]\]/g, function (_, t) {
      return '<a class="wikilink" href="' + slug(t) + '.html">' + t + '</a>';
    });
  }

  function parse(src) {
    var out = [], lines = src.split('\n'), i = 0;
    while (i < lines.length) {
      var L = lines[i];

      if (/^```/.test(L)) {                      /* 코드 펜스 */
        var lang = L.slice(3).trim(), buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        out.push('<div class="codeblock"><pre><code class="language-' +
                 (lang || 'plaintext') + '">' + esc(buf.join('\n')) + '</code></pre></div>');
        continue;
      }
      if (/^\$\$\s*$/.test(L)) {                 /* 디스플레이 수식 블록 */
        var mbuf = [];
        i++;
        while (i < lines.length && !/^\$\$\s*$/.test(lines[i])) { mbuf.push(lines[i]); i++; }
        i++;
        out.push('<p>$$' + esc(mbuf.join('\n')) + '$$</p>');
        continue;
      }
      if (/^###\s/.test(L)) { out.push('<h3>' + inline(esc(L.slice(4))) + '</h3>'); i++; continue; }
      if (/^##\s/.test(L))  { out.push('<h2>' + inline(esc(L.slice(3))) + '</h2>'); i++; continue; }
      if (/^#\s/.test(L))   { out.push('<h2>' + inline(esc(L.slice(2))) + '</h2>'); i++; continue; }
      if (/^>\s?/.test(L)) {
        var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
        out.push('<blockquote><p>' + inline(esc(q.join(' '))) + '</p></blockquote>');
        continue;
      }
      if (/^[-*]\s/.test(L)) {
        var items = [];
        while (i < lines.length && /^[-*]\s/.test(lines[i])) { items.push(lines[i].slice(2)); i++; }
        out.push('<ul>' + items.map(function (t) {
          return '<li>' + inline(esc(t)) + '</li>';
        }).join('') + '</ul>');
        continue;
      }
      if (/^---\s*$/.test(L)) { out.push('<hr>'); i++; continue; }
      if (/^\s*$/.test(L)) { i++; continue; }

      var p = [];                                 /* 문단 */
      while (i < lines.length && !/^\s*$/.test(lines[i]) &&
             !/^(#|```|>|[-*]\s|\$\$|---)/.test(lines[i])) { p.push(lines[i]); i++; }
      out.push('<p>' + inline(esc(p.join(' '))) + '</p>');
    }
    return out.join('\n');
  }

  /* ── 실시간 미리보기 ─────────────────────────────── */
  var t = null;
  function refresh() {
    pv.innerHTML =
      '<div class="post-head"><h1>' + esc(fTitle.value || '제목 없음') + '</h1>' +
      '<div class="post-meta"><span class="post-date">' + esc(fDate.value) + '</span>' +
      (fTags.value ? fTags.value.split(',').map(function (x) {
        return '<span class="tag">' + esc(x.trim()) + '</span>';
      }).join(' ') : '') +
      '</div></div><div class="post-body">' + parse(ed.value) + '</div>';
    if (window.renderMathInElement) {
      window.renderMathInElement(pv, { delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ], throwOnError: false });
    }
    if (window.hljs) {
      pv.querySelectorAll('pre code').forEach(function (c) { window.hljs.highlightElement(c); });
    }
  }
  function queue() { clearTimeout(t); t = setTimeout(refresh, 250); }
  [ed, fTitle, fDate, fTags].forEach(function (el) { el.addEventListener('input', queue); });
  refresh();

  /* ── 툴바: 문법 자동 삽입 ────────────────────────── */
  function wrap(before, after, placeholder) {
    var s = ed.selectionStart, e = ed.selectionEnd;
    var sel = ed.value.slice(s, e) || placeholder;
    ed.value = ed.value.slice(0, s) + before + sel + after + ed.value.slice(e);
    ed.focus();
    ed.selectionStart = s + before.length;
    ed.selectionEnd = s + before.length + sel.length;
    queue();
  }
  document.querySelectorAll('[data-ins]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-ins');
      if (k === 'h2')    wrap('\n## ', '\n', '섹션 제목');
      if (k === 'bold')  wrap('**', '**', '굵게');
      if (k === 'code')  wrap('`', '`', 'code');
      if (k === 'fence') wrap('\n```cpp\n', '\n```\n', '// 코드');
      if (k === 'math')  wrap('\n$$\n', '\n$$\n', 'f(x) = x^2');
      if (k === 'imath') wrap('$', '$', 'x');
      if (k === 'sn')    wrap('^[', ']', '여백주석 내용');
      if (k === 'wiki')  wrap('[[', ']]', '글 제목');
      if (k === 'link')  wrap('[', '](https://)', '링크 텍스트');
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
  function fileBase() {
    return fDate.value + '-' + (slug(fTitle.value) || 'untitled');
  }

  $('#exp-md').addEventListener('click', function () {
    var fm = '---\ntitle: ' + fTitle.value + '\ncategory: ' + fCat.value +
             '\ndate: ' + fDate.value + '\ntags: [' + fTags.value + ']\n---\n\n';
    download(fileBase() + '.md', fm + ed.value, 'text/markdown');
  });

  $('#exp-html').addEventListener('click', function () {
    var tags = fTags.value ? fTags.value.split(',').map(function (x) {
      return '<span class="tag">' + esc(x.trim()) + '</span>';
    }).join('\n        ') : '';
    var html = '<!doctype html>\n<html lang="ko">\n<head>\n' +
      '  <meta charset="UTF-8">\n' +
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '  <title>' + esc(fTitle.value) + ' — ' + SITE_NAME + '</title>\n' +
      '  <link rel="icon" href="../assets/favicon.svg">\n' +
      '  <link rel="stylesheet" href="https://hangeul.pstatic.net/hangeul_static/css/nanum-square-neo.css">\n' +
      '  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap" rel="stylesheet">\n' +
      '  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">\n' +
      '  <link rel="stylesheet" href="../assets/css/base.css">\n' +
      '  <link rel="stylesheet" href="../assets/css/layout.css">\n' +
      '  <link rel="stylesheet" href="../assets/css/components.css">\n' +
      '  <link rel="stylesheet" href="../assets/css/post.css">\n' +
      '</head>\n<body data-crumb="글 / ' + esc(fCat.options[fCat.selectedIndex].text) +
      ' / <b>' + esc(fTitle.value) + '</b>">\n' +
      '  <main>\n    <div class="page page--post">\n      <article>\n' +
      '        <div class="post-head">\n          <h1>' + esc(fTitle.value) + '</h1>\n' +
      '          <div class="post-meta">\n            <span class="post-date">' + esc(fDate.value) + '</span>\n' +
      (tags ? '            ' + tags + '\n' : '') +
      '          </div>\n        </div>\n' +
      '        <div class="post-body">\n' + parse(ed.value) + '\n        </div>\n' +
      '      </article>\n      <div class="margin-col"></div>\n    </div>\n  </main>\n' +
      '  <footer><p>&copy; 2026</p></footer>\n' +
      '  <script>window.ROOT=\'..\'<\/script>\n' +
      '  <script src="../assets/js/nav.js"><\/script>\n' +
      '  <script src="../assets/js/progress.js"><\/script>\n' +
      '  <script src="../assets/js/code.js"><\/script>\n' +
      '  <script src="../assets/js/post.js"><\/script>\n' +
      '  <script defer src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js" onload="document.querySelectorAll(\'pre code\').forEach(c=>hljs.highlightElement(c))"><\/script>\n' +
      '  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"><\/script>\n' +
      '  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"\n' +
      '    onload="renderMathInElement(document.body,{delimiters:[{left:\'$$\',right:\'$$\',display:true},{left:\'$\',right:\'$\',display:false}],throwOnError:false})"><\/script>\n' +
      '</body>\n</html>\n';
    download(fileBase() + '.html', html, 'text/html');
  });
})();
