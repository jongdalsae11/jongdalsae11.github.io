/* ============================================================
   nav.js — 공용 사이드바 트리 + 얇은 상단 헤더 + 모바일 드로어
   · 메뉴를 바꾸려면 NODES 배열만 수정하면 됩니다.
   · 각 페이지는 <script>window.ROOT='.'</script> (루트) 혹은
     '..' (posts/ 하위) 를 nav.js 로드 전에 선언합니다.
   ============================================================ */

var SITE_NAME = '이름';          // ← 실제 이름/닉네임
var SITE_SUB  = 'archive';

var NODES = [
  { label: '홈',            href: 'index.html' },
  { label: '이력',          href: 'about.html' },
  { label: '연구·프로젝트', href: 'research.html' },
  { label: '글', children: [
      { label: '수학',      href: 'posts/math.html' },
      { label: '알고리즘',  href: 'posts/algo.html' },
      { label: '에세이',    href: 'posts/essay.html' }
  ]},
  { label: '문제 아카이브', href: 'archive.html' },
  { label: '자료정리집', children: [
      { label: '수학',      href: 'library.html#math' },
      { label: '알고리즘',  href: 'library.html#algo' },
      { label: '잡다한 것', href: 'library.html#misc' }
  ]},
  { label: '연락처',        href: 'contact.html' }
];

(function () {
  var ROOT = window.ROOT || '.';
  var here = (location.pathname.split('/').pop() || 'index.html');

  function isActive(href) {
    if (!href) return false;
    var file = href.split('#')[0].split('/').pop() || 'index.html';
    if (file !== here) return false;
    var hash = href.indexOf('#') >= 0 ? href.slice(href.indexOf('#')) : '';
    return hash ? hash === location.hash : true;
  }
  function fileMatches(href) {
    var file = (href || '').split('#')[0].split('/').pop();
    return file === here;
  }

  var html = '<div class="site-id"><a class="plain" href="' + ROOT + '/index.html">' +
             '<span class="site-name">' + SITE_NAME + '</span>' +
             '<span class="site-sub">' + SITE_SUB + '</span></a></div><ul class="tree">';

  NODES.forEach(function (n, i) {
    if (n.children) {
      var childActive = n.children.some(function (c) { return fileMatches(c.href); });
      html += '<li><button type="button" data-branch="b' + i + '" aria-expanded="' + childActive + '">' +
              '<span class="caret">▸</span>' + n.label + '</button>' +
              '<ul class="branch" id="b' + i + '">';
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
    '<aside class="sidebar">' + html + '</aside>' +
    '<button class="nav-fab" type="button" aria-label="메뉴">≡</button>' +
    '<div class="nav-backdrop"></div>');

  /* 아코디언 (부드러운 슬라이드) */
  document.querySelectorAll('.tree button[data-branch]').forEach(function (btn) {
    var branch = document.getElementById(btn.getAttribute('data-branch'));
    function setOpen(open) {
      btn.setAttribute('aria-expanded', open);
      branch.style.maxHeight = open ? branch.scrollHeight + 'px' : '0px';
    }
    setOpen(btn.getAttribute('aria-expanded') === 'true');
    btn.addEventListener('click', function () {
      setOpen(btn.getAttribute('aria-expanded') !== 'true');
    });
  });

  /* 모바일 드로어 */
  var fab = document.querySelector('.nav-fab');
  var backdrop = document.querySelector('.nav-backdrop');
  fab.addEventListener('click', function () { document.body.classList.toggle('nav-open'); });
  backdrop.addEventListener('click', function () { document.body.classList.remove('nav-open'); });
})();
