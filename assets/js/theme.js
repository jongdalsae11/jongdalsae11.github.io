/* ============================================================
   theme.js — 밝게(종이) / 먹 전환

   ★ 반드시 <head> 안에서, defer 없이 불러옵니다.
     본문이 그려지기 «전에» <html data-theme> 를 세워야 합니다.
     다른 스크립트처럼 맨 아래에 두면, 먹으로 골라 둔 사람에게도
     첫 순간 종이색이 번쩍 지나갑니다.

   두 갈래로 따로 기억합니다
     · 사이트       — 'theme'        기본은 밝게
     · 작성 도구    — 'theme-write'  기본은 먹
       (작성 도구는 손님이 아니라 내가 오래 붙어 있는 작업 공간이라
        밤에 쓰기 편한 쪽을 기본으로 둡니다. 사이트에서 밝게를 골라도
        작성 도구까지 덩달아 밝아지지 않게 칸을 나눴습니다)
     <html data-theme-scope="write"> 인 페이지가 작성 도구입니다.

   글에 끼운 시뮬레이션(iframe)
     부모가 ?theme= 로 지금 모드를 넘겨주고, 바꿀 때는 postMessage 로
     알려 줍니다. localStorage 만 보면 안 되는 이유 — 작성 도구 미리보기
     안의 시뮬레이션은 'theme' 이 아니라 'theme-write' 를 따라야 하는데,
     안쪽 페이지는 자기가 어디에 끼워졌는지 모릅니다.
   ============================================================ */
(function () {
  var root = document.documentElement;
  var scope = root.getAttribute('data-theme-scope');
  var KEY = scope === 'write' ? 'theme-write' : 'theme';
  var DEF = scope === 'write' ? 'dark' : 'light';

  function ok(v) { return v === 'light' || v === 'dark'; }
  /* 사생활 보호 창 등에서는 localStorage 가 예외를 던집니다 */
  function load() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function store(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  var forced = /[?&]theme=(light|dark)/.exec(location.search);
  var cur = forced ? forced[1] : (ok(load()) ? load() : DEF);
  root.setAttribute('data-theme', cur);

  /* 안에 끼운 시뮬레이션들에게도 알립니다 */
  function tellFrames(v) {
    var fs = document.getElementsByTagName('iframe');
    for (var i = 0; i < fs.length; i++) {
      try { fs[i].contentWindow.postMessage({ type: 'theme', theme: v }, location.origin); } catch (e) {}
    }
  }

  function apply(v) {
    if (!ok(v) || v === cur) return;
    cur = v;
    root.setAttribute('data-theme', v);
    tellFrames(v);
    var btns = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < btns.length; i++) paint(btns[i]);
  }

  /* 단추에는 «누르면 갈 곳» 을 적습니다 — 지금 상태가 아니라 */
  function paint(b) {
    var next = cur === 'dark' ? '밝게' : '먹';
    b.textContent = next;
    b.setAttribute('aria-label', next + '으로 바꾸기');
    b.setAttribute('title', next + '으로 바꾸기');
  }

  function set(v) { if (ok(v)) { store(v); apply(v); } }
  function toggle() { set(cur === 'dark' ? 'light' : 'dark'); }

  /* 다른 탭에서 바꾸면 따라갑니다 (부모가 정해 준 iframe 은 제외) */
  window.addEventListener('storage', function (e) {
    if (!forced && e.key === KEY && ok(e.newValue)) apply(e.newValue);
  });
  /* 부모 페이지가 바꿨다고 알려 오면 따라가고,
     안쪽 페이지가 «지금 뭐예요?» 하고 물으면 답합니다.            */
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data) return;
    if (e.data.type === 'theme') apply(e.data.theme);
    else if (e.data.type === 'theme-ask' && e.source) {
      try { e.source.postMessage({ type: 'theme', theme: cur }, location.origin); } catch (x) {}
    }
  });
  /* 끼워진 쪽이면 뜨자마자 부모에게 한 번 묻습니다.
     ?theme= 은 처음 그릴 때만 맞습니다. 작성 도구 미리보기는 액자를
     옮겨 다시 쓰는데, 그러다 다시 로드되면 옛 ?theme= 값으로 돌아가
     부모와 어긋납니다. 물어보면 언제나 지금 값을 받습니다.          */
  if (window.parent && window.parent !== window) {
    try { window.parent.postMessage({ type: 'theme-ask' }, location.origin); } catch (e) {}
  }
  /* data-theme-toggle 이 붙은 단추는 어디에 있든 전환 단추가 됩니다.
     nav.js 가 나중에 그리는 단추도 잡히도록 문서 전체에서 위임합니다. */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-theme-toggle]');
    if (b) { e.preventDefault(); toggle(); }
  });

  window.THEME = {
    get: function () { return cur; },
    set: set,
    toggle: toggle,
    paint: paint
  };
}());
