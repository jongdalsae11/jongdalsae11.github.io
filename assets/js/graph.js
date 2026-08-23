/* ============================================================
   graph.js — 인용 관계를 한 화면에 펼치는 유향 그래프

   배치
     · 가로(x)  = 위상 깊이. 그 글에 이르는 가장 긴 인용 사슬의 길이이므로,
                  "먼저 읽어야 할 글" 이 반드시 왼쪽에 옵니다.
                  글은 언제나 이전 글만 인용하므로 순환이 없고(DAG),
                  이 계산은 항상 성공합니다.
     · 세로(y)  = 흐름(레인). 흐름 하나가 가로줄 하나를 차지하고,
                  주황 굵은 선이 화면을 가로지릅니다.
     · 흐름에 없는 글은 자기가 이어진 글 옆에 작은 회색 점으로 붙습니다.
     · 아무 데도 안 걸린 글은 맨 아래 «미연결» 줄에 모입니다.

   흐름 편집
     노드를 읽는 순서대로 누르면 흐름이 만들어지고,
     저장하면 content.js 의 flows 에 직접 써집니다. (폴더 연결 필요)
   ============================================================ */

(function () {
  var host = document.getElementById('graph');
  if (!host) return;

  var U = window.U, S = window.SITE || {};
  var ROOT = window.ROOT || '.';

  var COL = 210;          /* 열 간격 */
  var LANE = 96;          /* 레인 간격 */
  var SAT = 30;           /* 위성(작은 점)이 레인에서 떨어지는 거리 */
  var NODE_W = 156, NODE_H = 34;

  /* ══════════════════════════════════════════════════
     1. 배치 계산
     ══════════════════════════════════════════════════ */
  function layout() {
    var g = U.graph();
    var depth = U.layers(g);
    var flows = U.flows();

    var node = {};                       /* file → {x, y, kind, ...} */
    g.posts.forEach(function (p) {
      node[p.file] = { post: p, depth: depth[p.file], lane: null, kind: 'sat', x: 0, y: 0 };
    });

    /* ── 흐름 위의 글: 레인에 놓고 x 가 반드시 오른쪽으로 가게 ── */
    flows.forEach(function (f, li) {
      var lastX = -1;
      f.posts.forEach(function (file, i) {
        var n = node[file];
        if (!n) return;                  /* content.js 에 없는 파일은 건너뜀 */
        n.kind = 'flow';
        n.lane = li;
        n.flowId = f.id;
        n.order = i;
        n.x = Math.max(n.depth, lastX + 1);
        lastX = n.x;
      });
    });

    /* ── 흐름 밖의 글: 이어진 흐름 글 옆에 위성으로 ── */
    var linked = {};
    g.edges.forEach(function (e) {
      (linked[e.from] = linked[e.from] || []).push(e.to);
      (linked[e.to] = linked[e.to] || []).push(e.from);
    });

    var laneCount = flows.length;
    g.posts.forEach(function (p) {
      var n = node[p.file];
      if (n.kind === 'flow') return;
      /* 이어진 글 중 흐름에 속한 것이 있으면 그 레인 곁에 */
      var anchor = (linked[p.file] || []).map(function (f) { return node[f]; })
        .filter(function (x) { return x && x.kind === 'flow'; })[0];
      if (anchor) { n.lane = anchor.lane; n.near = anchor.post.file; }
      else if ((linked[p.file] || []).length) { n.lane = laneCount; }   /* 이어졌지만 흐름 밖 */
      else { n.lane = -1; }                                            /* 아무 데도 안 걸림 */
      n.x = n.depth;
    });

    /* ── 실제 좌표 ── */
    var orphanLane = laneCount + (g.posts.some(function (p) {
      return node[p.file].lane === laneCount;
    }) ? 1 : 0);

    var used = {};                        /* 같은 칸에 여럿이면 위아래로 비켜 놓기 */
    g.posts.forEach(function (p) {
      var n = node[p.file];
      var laneIdx = n.lane === -1 ? orphanLane : n.lane;
      n.px = 90 + n.x * COL;
      var baseY = 70 + laneIdx * LANE;

      if (n.kind === 'flow') { n.py = baseY; }
      else {
        var key = laneIdx + ':' + n.x;
        var k = (used[key] = (used[key] || 0) + 1);
        /* 위·아래로 번갈아 비켜 놓습니다 */
        n.py = baseY + (k % 2 ? 1 : -1) * (SAT + Math.floor((k - 1) / 2) * 24);
      }
    });

    /* 흐름 화살표인지 표시 */
    var flowEdge = {};
    flows.forEach(function (f) {
      for (var i = 0; i + 1 < f.posts.length; i++) {
        flowEdge[f.posts[i] + '>' + f.posts[i + 1]] = f.id;
      }
    });

    return { g: g, node: node, flows: flows, flowEdge: flowEdge,
             orphanLane: orphanLane, laneCount: laneCount };
  }

  /* ══════════════════════════════════════════════════
     2. 그리기
     ══════════════════════════════════════════════════ */
  var view = { x: 0, y: 0, k: 1 };
  var L = null;
  var picking = false, picked = [];

  function esc(s) { return U.esc(s); }

  function curve(a, b) {
    var dx = Math.max(40, (b.px - a.px) * 0.45);
    return 'M' + a.px + ',' + a.py +
           ' C' + (a.px + dx) + ',' + a.py +
           ' ' + (b.px - dx) + ',' + b.py +
           ' ' + b.px + ',' + b.py;
  }

  function draw() {
    L = layout();
    var n = L.node, parts = [];
    var maxX = 0, maxLane = L.orphanLane;
    Object.keys(n).forEach(function (f) { maxX = Math.max(maxX, n[f].px); });

    var W = maxX + 260, H = 70 + (maxLane + 1) * LANE + 90;

    /* 레인 이름표 + 바탕줄 */
    L.flows.forEach(function (f, i) {
      var y = 70 + i * LANE;
      parts.push('<line class="lane-rule" x1="70" y1="' + y + '" x2="' + (W - 40) + '" y2="' + y + '"/>');
      parts.push('<text class="lane-label" x="70" y="' + (y - 26) + '">' + esc(f.label || f.id) + '</text>');
    });
    if (L.laneCount !== L.orphanLane) {
      var yo = 70 + L.laneCount * LANE;
      parts.push('<text class="lane-label lane-label--dim" x="70" y="' + (yo - 26) + '">이어진 글</text>');
    }
    var yz = 70 + L.orphanLane * LANE;
    var hasOrphan = Object.keys(n).some(function (f) { return n[f].lane === -1; });
    if (hasOrphan) {
      parts.push('<text class="lane-label lane-label--dim" x="70" y="' + (yz - 26) + '">미연결</text>');
    }

    /* 화살표 — 흐름은 주황 굵게, 나머지는 얇은 회색 */
    L.g.edges.forEach(function (e) {
      var a = n[e.from], b = n[e.to];
      if (!a || !b) return;
      var isFlow = L.flowEdge[e.from + '>' + e.to];
      parts.push('<path class="ge ' + (isFlow ? 'ge--flow' : '') +
        '" data-from="' + esc(e.from) + '" data-to="' + esc(e.to) + '" d="' + curve(a, b) +
        '" marker-end="url(#' + (isFlow ? 'ah-flow' : 'ah') + ')"/>');
    });

    /* 노드 */
    Object.keys(n).forEach(function (file) {
      var d = n[file], p = d.post;
      var pick = picked.indexOf(file);
      var cls = 'gn gn--' + d.kind + (pick >= 0 ? ' gn--picked' : '');
      var color = U.catColor(p.category);

      if (d.kind === 'flow') {
        parts.push(
          '<g class="' + cls + '" data-file="' + esc(file) + '" transform="translate(' +
          (d.px - NODE_W / 2) + ',' + (d.py - NODE_H / 2) + ')" style="--cat:' + color + '">' +
          '<rect class="gn-box" width="' + NODE_W + '" height="' + NODE_H + '" rx="8"/>' +
          '<text class="gn-t" x="' + (NODE_W / 2) + '" y="' + (NODE_H / 2 + 4) + '">' +
          esc(cut(p.title, 13)) + '</text>' +
          (pick >= 0 ? '<circle class="gn-no" cx="10" cy="10" r="9"/><text class="gn-non" x="10" y="14">' +
            (pick + 1) + '</text>' : '') +
          '<title>' + esc(p.title) + '</title></g>');
      } else {
        parts.push(
          '<g class="' + cls + '" data-file="' + esc(file) + '" transform="translate(' +
          d.px + ',' + d.py + ')" style="--cat:' + color + '">' +
          '<circle class="gn-dot" r="7"/>' +
          '<text class="gn-s" x="0" y="22">' + esc(cut(p.title, 9)) + '</text>' +
          (pick >= 0 ? '<circle class="gn-no" cx="12" cy="-12" r="9"/><text class="gn-non" x="12" y="-8">' +
            (pick + 1) + '</text>' : '') +
          '<title>' + esc(p.title) + '</title></g>');
      }
    });

    host.innerHTML =
      '<svg id="gsvg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' +
      '<defs>' +
        '<marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">' +
          '<path d="M0,0 L10,5 L0,10 z" class="ah"/></marker>' +
        '<marker id="ah-flow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">' +
          '<path d="M0,0 L10,5 L0,10 z" class="ah ah--flow"/></marker>' +
      '</defs>' + parts.join('') + '</svg>';

    apply();
    stats();
  }

  function cut(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  function apply() {
    var svg = document.getElementById('gsvg');
    if (svg) svg.style.transform =
      'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.k + ')';
  }

  function stats() {
    var el = document.getElementById('g-stats');
    if (!el) return;
    var iso = Object.keys(L.node).filter(function (f) { return L.node[f].lane === -1; }).length;
    el.textContent = '글 ' + L.g.posts.length + ' · 인용 ' + L.g.edges.length +
      ' · 흐름 ' + L.flows.length + (iso ? ' · 미연결 ' + iso : '');
  }

  /* ══════════════════════════════════════════════════
     3. 조작 — 끌기 · 확대 · 강조 · 이동
     ══════════════════════════════════════════════════ */
  var drag = null;
  host.addEventListener('mousedown', function (e) {
    if (e.target.closest && e.target.closest('.gn')) return;
    drag = { x: e.clientX - view.x, y: e.clientY - view.y };
    host.classList.add('dragging');
  });
  window.addEventListener('mousemove', function (e) {
    if (!drag) return;
    view.x = e.clientX - drag.x;
    view.y = e.clientY - drag.y;
    apply();
  });
  window.addEventListener('mouseup', function () { drag = null; host.classList.remove('dragging'); });

  host.addEventListener('wheel', function (e) {
    e.preventDefault();
    var k = view.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12);
    view.k = Math.min(2.5, Math.max(0.3, k));
    apply();
  }, { passive: false });

  /* 마우스를 올리면 그 글과 이어진 화살표만 밝게 */
  host.addEventListener('mouseover', function (e) {
    var g = e.target.closest && e.target.closest('.gn');
    if (!g) return;
    var f = g.getAttribute('data-file');
    host.classList.add('focusing');
    host.querySelectorAll('.ge').forEach(function (p) {
      p.classList.toggle('on', p.getAttribute('data-from') === f || p.getAttribute('data-to') === f);
    });
    var near = {};
    host.querySelectorAll('.ge.on').forEach(function (p) {
      near[p.getAttribute('data-from')] = 1; near[p.getAttribute('data-to')] = 1;
    });
    host.querySelectorAll('.gn').forEach(function (x) {
      x.classList.toggle('on', !!near[x.getAttribute('data-file')]);
    });
  });
  host.addEventListener('mouseleave', function () {
    host.classList.remove('focusing');
    host.querySelectorAll('.on').forEach(function (x) { x.classList.remove('on'); });
  });

  host.addEventListener('click', function (e) {
    var g = e.target.closest && e.target.closest('.gn');
    if (!g) return;
    var file = g.getAttribute('data-file');
    if (!picking) { location.href = ROOT + '/posts/' + file; return; }
    /* 편집 중 — 순서대로 담고, 이미 담긴 것을 누르면 뺍니다 */
    var i = picked.indexOf(file);
    if (i >= 0) picked.splice(i, 1); else picked.push(file);
    draw();
    renderPickList();
  });

  /* ══════════════════════════════════════════════════
     4. 흐름 편집
     ══════════════════════════════════════════════════ */
  var panel = document.getElementById('flow-edit');
  var nameEl = document.getElementById('flow-name');
  var listEl = document.getElementById('flow-list');
  var stateEl = document.getElementById('flow-state');

  function renderPickList() {
    if (!listEl) return;
    listEl.innerHTML = picked.length
      ? picked.map(function (f, i) {
          var p = U.postByFile(f);
          return '<li><b>' + (i + 1) + '</b>' + esc(p ? p.title : f) +
                 '<button type="button" data-drop="' + esc(f) + '" aria-label="빼기">×</button></li>';
        }).join('')
      : '<li class="fl-empty">그래프에서 글을 읽는 순서대로 누르세요</li>';
  }

  function setPicking(on) {
    picking = on;
    document.body.classList.toggle('picking', on);
    if (panel) panel.hidden = !on;
    var btn = document.getElementById('btn-flow');
    if (btn) {
      btn.textContent = on ? '편집 끝내기' : '흐름 편집';
      btn.setAttribute('aria-pressed', String(on));
    }
    if (!on) { picked = []; }
    draw();
    renderPickList();
  }

  var btnFlow = document.getElementById('btn-flow');
  if (btnFlow) btnFlow.addEventListener('click', function () { setPicking(!picking); });

  if (listEl) {
    listEl.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-drop]');
      if (!b) return;
      var i = picked.indexOf(b.getAttribute('data-drop'));
      if (i >= 0) { picked.splice(i, 1); draw(); renderPickList(); }
    });
  }

  /* 기존 흐름을 불러와 고치기 */
  var pickFlow = document.getElementById('flow-pick');
  function fillFlowPicker() {
    if (!pickFlow) return;
    pickFlow.innerHTML = '<option value="">— 새 흐름 —</option>' +
      U.flows().map(function (f) {
        return '<option value="' + esc(f.id) + '">' + esc(f.label || f.id) + '</option>';
      }).join('');
  }
  fillFlowPicker();
  if (pickFlow) {
    pickFlow.addEventListener('change', function () {
      var f = U.flows().filter(function (x) { return x.id === pickFlow.value; })[0];
      picked = f ? f.posts.slice() : [];
      if (nameEl) nameEl.value = f ? (f.label || '') : '';
      draw();
      renderPickList();
    });
  }

  /* ── 저장 ── */
  function show(msg, kind) {
    if (!stateEl) return;
    stateEl.textContent = msg || '';
    stateEl.className = 'flow-state' + (kind ? ' flow-state--' + kind : '');
  }

  function flowsSource(list) {
    if (!list.length) return '\n  ';
    return '\n' + list.map(function (f) {
      return "    { id: '" + f.id + "',\n" +
             "      label: " + JSON.stringify(f.label || f.id).replace(/"/g, "'") + ",\n" +
             "      posts: [" + f.posts.map(function (p) { return "'" + p + "'"; }).join(', ') + "] }";
    }).join(',\n\n') + '\n  ';
  }

  var btnSave = document.getElementById('btn-flow-save');
  if (btnSave) {
    btnSave.addEventListener('click', async function () {
      if (!picked.length) { show('글을 먼저 골라 주세요', 'bad'); return; }
      var label = (nameEl && nameEl.value.trim()) || '이름 없는 흐름';
      var id = (pickFlow && pickFlow.value) || U.slug(label) || ('flow-' + Date.now());

      show('저장하는 중…');
      btnSave.disabled = true;
      try {
        if (!await window.FS.ensure()) { show(''); return; }
        var path = 'assets/data/content.js';
        var text = await window.FS.read(path);

        var list = U.flows().filter(function (f) { return f.id !== id; });
        list.push({ id: id, label: label, posts: picked.slice() });

        await window.FS.write(path, window.FS.replaceArray(text, 'flows', flowsSource(list)));

        /* 화면에도 바로 반영 */
        S.flows = list;
        window.SITE.flows = list;
        show('저장 완료 — 이제 git push 만 하면 됩니다', 'ok');
        fillFlowPicker();
        if (pickFlow) pickFlow.value = id;
        draw();
      } catch (e) {
        show('저장 실패: ' + e.message, 'bad');
        console.error(e);
      } finally { btnSave.disabled = false; }
    });
  }

  var btnDel = document.getElementById('btn-flow-del');
  if (btnDel) {
    btnDel.addEventListener('click', async function () {
      var id = pickFlow && pickFlow.value;
      if (!id) { show('지울 흐름을 먼저 고르세요', 'bad'); return; }
      if (!confirm('흐름 "' + id + '" 을 지울까요?\n글 자체는 지워지지 않습니다.')) return;
      try {
        if (!await window.FS.ensure()) return;
        var path = 'assets/data/content.js';
        var text = await window.FS.read(path);
        var list = U.flows().filter(function (f) { return f.id !== id; });
        await window.FS.write(path, window.FS.replaceArray(text, 'flows', flowsSource(list)));
        S.flows = list; window.SITE.flows = list;
        picked = [];
        show('흐름을 지웠습니다', 'ok');
        fillFlowPicker();
        draw(); renderPickList();
      } catch (e) { show('실패: ' + e.message, 'bad'); }
    });
  }

  /* ── 처음 그리기 ── */
  draw();
  renderPickList();
  if (!window.FS || !window.FS.supported) {
    var b = document.getElementById('btn-flow');
    if (b) b.title = '흐름 편집은 크롬·엣지에서만 됩니다 (폴더 접근 필요)';
  }
}());
