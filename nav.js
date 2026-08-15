/* ============================================================
   공용 내비게이션 — 모든 페이지가 이 파일 하나를 공유합니다.
   메뉴 항목을 추가/수정하려면 아래 NODES 배열만 고치면 됩니다.
   ============================================================ */

var SITE_NAME = '이름';   // ← 여기에 실제 이름/닉네임을 넣으세요

var NODES = [
  { label: '홈',            href: 'index.html'    },
  { label: '이력',          href: 'about.html'    },
  { label: '연구·프로젝트',  href: 'research.html' },
  { label: '글',            href: null, children: [
      { label: '수학',      href: 'posts-math.html'  },
      { label: '알고리즘',  href: 'posts-algo.html'  },
      { label: '에세이',    href: 'posts-essay.html' }
  ]},
  { label: '문제 아카이브',  href: 'archive.html'  },
  { label: '자료정리집',    href: 'notes.html'    },
  { label: '연락처',        href: 'contact.html'  }
];

(function () {
  var current = (location.pathname.split('/').pop() || 'index.html');
  var TOP = 20, GAP = 58, FIRST = 93, X0 = 10, X1 = 100, X2 = 145;

  var flat = [];   // 그래프에 그려질 최상위 노드들
  NODES.forEach(function (n) { flat.push(n); });

  var toggleIdx = flat.findIndex(function (n) { return n.children; });
  var belowStart = toggleIdx + 1;

  var edges = '', dots = '', labels = '';

  flat.forEach(function (n, i) {
    var y = FIRST + i * GAP;
    var isBelow = i > toggleIdx;
    var cls = isBelow ? ' below-elem svg-elem' : '';
    var id = isBelow ? ' id="edge-' + i + '"' : '';
    var delay = isBelow ? ' style="transition-delay:' + ((i - belowStart) * 0.05) + 's"' : '';

    edges += '<path class="edge' + cls + '"' + id + delay +
             ' d="M' + X0 + ',' + TOP + ' C55,' + TOP + ' 55,' + y + ' ' + X1 + ',' + y + '"/>';

    var isActive = n.href === current;
    dots += '<circle class="vertex' + cls + (isActive ? ' active-ring' : '') +
            '" cx="' + X1 + '" cy="' + y + '" r="6.5"' + delay + '/>';

    var animDelay = 0.24 + i * 0.09;
    var style = 'left:117px; top:' + (y - 12) + 'px; animation-delay:' + animDelay.toFixed(2) +
                's;' + (isBelow ? ' transition-delay:' + ((i - belowStart) * 0.05) + 's;' : '');

    if (n.children) {
      labels += '<button class="node-label tree-toggle" aria-expanded="false" id="postsToggle" style="' +
                style + '">' + n.label + '</button>';
    } else {
      labels += '<a class="node-label' + cls + (isActive ? ' active' : '') + '" href="' + n.href +
                '" style="' + style + '">' + n.label + '</a>';
    }
  });

  // 하위 노드(글 카테고리) — 밀려난 자리에 등장
  var kids = flat[toggleIdx].children;
  var toggleY = FIRST + toggleIdx * GAP;
  kids.forEach(function (k, j) {
    var y = FIRST + (belowStart + j) * GAP;
    edges += '<path class="edge sub-elem svg-elem" d="M' + X1 + ',' + toggleY +
             ' C122,' + toggleY + ' 122,' + y + ' ' + X2 + ',' + y + '"/>';
    dots  += '<circle class="vertex sub-elem svg-elem" cx="' + X2 + '" cy="' + y + '" r="5.5"/>';
    labels += '<a class="node-label sub-elem' + (k.href === current ? ' active' : '') +
              '" href="' + k.href + '" style="left:161px; top:' + (y - 11) +
              'px; animation-delay:' + (0.12 + j * 0.07).toFixed(2) + 's;">' + k.label + '</a>';
  });

  var html =
    '<aside class="sidebar"><div class="tree-graph" id="treeGraph">' +
      '<svg width="240" height="' + (FIRST + flat.length * GAP + 120) + '">' + edges + dots + '</svg>' +
      '<span class="node-label root-label" style="left:29px; top:9px; animation-delay:0s;">' + SITE_NAME + '</span>' +
      labels +
    '</div></aside>';

  var mount = document.getElementById('nav-mount');
  if (mount) mount.outerHTML = html;

  // 글 펼치기/접기 — 아래 항목은 밀려나고 선은 다시 그려집니다
  var toggle = document.getElementById('postsToggle');
  var graph  = document.getElementById('treeGraph');
  var PUSH = kids.length * GAP;

  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = graph.classList.toggle('branch-open');
      toggle.setAttribute('aria-expanded', open);
      for (var i = belowStart; i < flat.length; i++) {
        var el = document.getElementById('edge-' + i);
        if (!el) continue;
        var y = FIRST + i * GAP + (open ? PUSH : 0);
        el.setAttribute('d', 'M' + X0 + ',' + TOP + ' C55,' + TOP + ' 55,' + y + ' ' + X1 + ',' + y);
      }
    });
  }
})();
