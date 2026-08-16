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

    /* 신택스 하이라이팅 (highlight.js 가 로드된 경우) */
    if (window.hljs) { window.hljs.highlightElement(code); }

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
