/* ============================================================
   code.js — 코드 블록 공통 동작
   · <div class="codeblock"><pre><code class="language-cpp">…
     구조를 찾아 줄 번호 / 복사 버튼 / 긴 코드 접기 / 하이라이팅 적용
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.codeblock').forEach(function (block) {
    var pre  = block.querySelector('pre');
    var code = block.querySelector('code');
    if (!pre || !code) return;
    if (block.dataset.ready) return;   /* 두 번 실행돼 줄번호가 겹치는 것 방지 */
    block.dataset.ready = '1';

    /* 신택스 하이라이팅 (highlight.js 가 로드된 경우) */
    if (window.hljs) { window.hljs.highlightElement(code); }

    /* IDE식 들여쓰기 가이드라인 — 몇 단계 안으로 들어갔는지 보여줌 */
    var indentUnit = 4;
    var raw = code.textContent.replace(/\n$/, '').split('\n');
    var maxDepth = 0;
    raw.forEach(function (l) {
      if (!l.trim()) return;
      var sp = l.match(/^[ \t]*/)[0].replace(/\t/g, '    ').length;
      maxDepth = Math.max(maxDepth, Math.floor(sp / indentUnit));
    });
    if (maxDepth > 0) {
      var guides = document.createElement('div');
      guides.className = 'cb-guides';
      var gh = '';
      for (var d = 1; d <= maxDepth; d++) {
        gh += '<span style="left:calc(' + (d * indentUnit) + 'ch)"></span>';
      }
      guides.innerHTML = gh;
      pre.appendChild(guides);
    }

    /* 줄 번호 거터 */
    var lines = code.textContent.replace(/\n$/, '').split('\n').length;
    var nums = '';
    for (var i = 1; i <= lines; i++) nums += i + '\n';
    var scroll = document.createElement('div');
    scroll.className = 'cb-scroll';
    var gutter = document.createElement('div');
    gutter.className = 'cb-gutter';
    gutter.textContent = nums;
    block.insertBefore(scroll, pre);
    scroll.appendChild(gutter);
    scroll.appendChild(pre);

    /* 언어 라벨 */
    var langCls = (code.className.match(/language-([\w+#-]+)/) || [])[1];
    if (langCls && langCls !== 'plaintext') {
      var lab = document.createElement('span');
      lab.className = 'cb-lang';
      lab.textContent = langCls;
      block.appendChild(lab);
    }

    /* 복사 버튼 */
    var copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'cb-copy';
    copy.textContent = '복사';
    copy.addEventListener('click', function () {
      navigator.clipboard.writeText(code.textContent).then(function () {
        copy.textContent = '복사됨 ✓';
        copy.classList.add('ok');
        setTimeout(function () {
          copy.textContent = '복사';
          copy.classList.remove('ok');
        }, 1600);
      });
    });
    block.appendChild(copy);

    /* 긴 코드: 내부 스크롤 + 전체 펼치기 */
    if (scroll.scrollHeight > 560) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cb-expand';
      btn.textContent = '── 전체 펼치기 (' + lines + '줄) ──';
      btn.addEventListener('click', function () {
        var open = block.classList.toggle('expanded');
        btn.textContent = open
          ? '── 접기 ──'
          : '── 전체 펼치기 (' + lines + '줄) ──';
      });
      block.appendChild(btn);
    }
  });
});
