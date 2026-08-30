/* ============================================================
   graph.js — 인용 관계를 한 화면에 펼치는 유향 그래프

   배치
     · 가로(x)  = 위상 깊이. 그 글에 이르는 가장 긴 인용 사슬의 길이이므로,
                  "먼저 읽어야 할 글" 이 반드시 왼쪽에 옵니다.
                  글은 언제나 이전 글만 인용하므로 순환이 없고(DAG),
                  이 계산은 항상 성공합니다.
     · 세로(y)  = 흐름(레인). 흐름 하나가 가로줄 하나를 차지하고,
                  주황 굵은 선이 화면을 가로지릅니다.
     · 이름표는 왼쪽 여백(거터)에만 두어 노드와 겹치지 않게 합니다.

   조작
     · 노드를 끌어 옮길 수 있고, 옮긴 자리는 브라우저에 기억됩니다.
     · 바탕을 끌면 이동, 휠로 확대, 처음 열면 가운데에 맞춰 놓습니다.
     · 화살표는 눈에 보이는 선보다 두꺼운 "잡는 영역" 을 따로 깔아
       가늘어도 정확히 집을 수 있습니다.

   흐름 편집
     노드를 읽는 순서대로 누르면 흐름이 만들어지고,
     저장하면 content.js 의 flows 에 직접 써집니다. (폴더 연결 필요)
   ============================================================ */

(function () {
  var host = document.getElementById('graph');
  if (!host) return;

  var U = window.U, S = window.SITE || {};
  var ROOT = window.ROOT || '.';
  var SVGNS = 'http://www.w3.org/2000/svg';

  var COL = 230;          /* 열 간격 */
  var LANE = 130;         /* 레인 간격 */
  var SAT = 46;           /* 흐름 밖 글이 레인에서 비켜나는 거리 */
  var GUTTER = 250;       /* 왼쪽 이름표 자리 — 노드는 이 오른쪽부터 */

  var MOVED_KEY = 'graph-moved';

  /* ══════════════════════════════════════════════════
     1. 배치
     ══════════════════════════════════════════════════ */
  var moved = {};
  try { moved = JSON.parse(localStorage.getItem(MOVED_KEY) || '{}') || {}; } catch (e) {}
  function saveMoved() {
    try { localStorage.setItem(MOVED_KEY, JSON.stringify(moved)); } catch (e) {}
  }

  function layout() {
    var g = U.graph();
    var depth = U.layers(g);
    var flows = U.flows();

    var deg = {};
    g.edges.forEach(function (e) {
      deg[e.from] = (deg[e.from] || 0) + 1;
      deg[e.to] = (deg[e.to] || 0) + 1;
    });

    var node = {};
    g.posts.forEach(function (p) {
      node[p.file] = { post: p, depth: depth[p.file], deg: deg[p.file] || 0,
                       lane: null, kind: 'sat', x: 0 };
    });

    flows.forEach(function (f, li) {
      var lastX = -1;
      f.posts.forEach(function (file, i) {
        var n = node[file];
        if (!n) return;
        n.kind = 'flow'; n.lane = li; n.flowId = f.id; n.order = i;
        n.x = Math.max(n.depth, lastX + 1);
        lastX = n.x;
      });
    });

    var linked = {};
    g.edges.forEach(function (e) {
      (linked[e.from] = linked[e.from] || []).push(e.to);
      (linked[e.to] = linked[e.to] || []).push(e.from);
    });

    var laneCount = flows.length;
    g.posts.forEach(function (p) {
      var n = node[p.file];
      if (n.kind === 'flow') return;
      var anchor = (linked[p.file] || []).map(function (f) { return node[f]; })
        .filter(function (x) { return x && x.kind === 'flow'; })[0];
      if (anchor) n.lane = anchor.lane;
      else if ((linked[p.file] || []).length) n.lane = laneCount;
      else n.lane = -1;
      n.x = n.depth;
    });

    var hasLoose = g.posts.some(function (p) { return node[p.file].lane === laneCount; });
    var orphanLane = laneCount + (hasLoose ? 1 : 0);

    var used = {};
    g.posts.forEach(function (p) {
      var n = node[p.file];
      var laneIdx = n.lane === -1 ? orphanLane : n.lane;
      n.laneIdx = laneIdx;
      n.px = GUTTER + n.x * COL;
      var baseY = 90 + laneIdx * LANE;

      if (n.kind === 'flow') n.py = baseY;
      else {
        var key = laneIdx + ':' + n.x;
        var k = (used[key] = (used[key] || 0) + 1);
        n.py = baseY + (k % 2 ? 1 : -1) * (SAT + Math.floor((k - 1) / 2) * 40);
      }
      /* 직접 옮긴 자리가 있으면 그것이 우선 */
      var m = moved[p.file];
      if (m) { n.px = m.x; n.py = m.y; n.manual = true; }
    });

    var flowEdge = {};
    flows.forEach(function (f) {
      for (var i = 0; i + 1 < f.posts.length; i++) {
        flowEdge[f.posts[i] + '>' + f.posts[i + 1]] = f.id;
      }
    });

    return { g: g, node: node, flows: flows, flowEdge: flowEdge,
             laneCount: laneCount, orphanLane: orphanLane, hasLoose: hasLoose };
  }

  /* 노드 반지름 — 이어진 곳이 많을수록 큽니다 (옵시디언과 같은 방식) */
  function radius(n) {
    var base = n.kind === 'flow' ? 13 : 9;
    return Math.min(26, base + n.deg * 2.2);
  }

  /* ══════════════════════════════════════════════════
     2. 그리기
     ══════════════════════════════════════════════════ */
  var view = { x: 0, y: 0, k: 1 };
  var L = null, svg = null, gRoot = null;
  var elNode = {}, elEdge = [];
  var picking = false, picked = [];
  var fitted = false;

  function el(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    return e;
  }
  function cut(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }
  function d(a, b) {
    var dx = Math.max(50, Math.abs(b.px - a.px) * 0.45);
    return 'M' + a.px + ',' + a.py +
           ' C' + (a.px + dx) + ',' + a.py + ' ' + (b.px - dx) + ',' + b.py +
           ' ' + b.px + ',' + b.py;
  }

  function build() {
    L = layout();
    elNode = {}; elEdge = [];
    host.innerHTML = '';

    svg = el('svg', { id: 'gsvg' });
    var defs = el('defs');
    [['ah', 'ah'], ['ah-flow', 'ah ah--flow']].forEach(function (m) {
      var mk = el('marker', { id: m[0], viewBox: '0 0 10 10', refX: 9, refY: 5,
                              markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' });
      mk.appendChild(el('path', { d: 'M0,0 L10,5 L0,10 z', 'class': m[1] }));
      defs.appendChild(mk);
    });
    svg.appendChild(defs);

    gRoot = el('g', { 'class': 'g-root' });
    svg.appendChild(gRoot);

    var gLanes = el('g'), gEdges = el('g'), gNodes = el('g');
    gRoot.appendChild(gLanes); gRoot.appendChild(gEdges); gRoot.appendChild(gNodes);

    /* ── 레인: 이름표는 왼쪽 거터에만 (노드와 겹치지 않게) ── */
    var maxPx = 0;
    Object.keys(L.node).forEach(function (f) { maxPx = Math.max(maxPx, L.node[f].px); });
    var right = maxPx + 200;

    function lane(i, text, dim) {
      var y = 90 + i * LANE;
      gLanes.appendChild(el('line', { 'class': 'lane-rule',
        x1: GUTTER - 40, y1: y, x2: right, y2: y }));
      var t = el('text', { 'class': 'lane-label' + (dim ? ' lane-label--dim' : ''),
        x: 24, y: y + 4 });
      t.textContent = text;
      gLanes.appendChild(t);
    }
    L.flows.forEach(function (f, i) { lane(i, f.label || f.id, false); });
    if (L.hasLoose) lane(L.laneCount, '이어진 글', true);
    if (Object.keys(L.node).some(function (f) { return L.node[f].lane === -1; })) {
      lane(L.orphanLane, '미연결', true);
    }

    /* ── 화살표: 잡는 영역(두꺼운 투명선) + 보이는 선 ── */
    L.g.edges.forEach(function (e) {
      var a = L.node[e.from], b = L.node[e.to];
      if (!a || !b) return;
      var isFlow = !!L.flowEdge[e.from + '>' + e.to];
      var path = d(a, b);

      var hit = el('path', { 'class': 'ge-hit', d: path,
        'data-from': e.from, 'data-to': e.to });
      var line = el('path', { 'class': 'ge' + (isFlow ? ' ge--flow' : ''), d: path,
        'data-from': e.from, 'data-to': e.to,
        'marker-end': 'url(#' + (isFlow ? 'ah-flow' : 'ah') + ')' });

      var ap = U.postByFile(e.from), bp = U.postByFile(e.to);
      var tip = el('title');
      tip.textContent = U.mathPlain(bp ? bp.title : e.to) + ' 이(가) ' +
                        U.mathPlain(ap ? ap.title : e.from) + ' 을(를) 인용';
      hit.appendChild(tip);

      gEdges.appendChild(hit);
      gEdges.appendChild(line);
      elEdge.push({ from: e.from, to: e.to, hit: hit, line: line });
    });

    /* ── 노드: 옵시디언처럼 원 + 아래 이름 ── */
    Object.keys(L.node).forEach(function (file) {
      var n = L.node[file], p = n.post, r = radius(n);
      var g = el('g', { 'class': 'gn gn--' + n.kind, 'data-file': file,
        transform: 'translate(' + n.px + ',' + n.py + ')' });
      g.style.setProperty('--cat', U.catColor(p.category));

      g.appendChild(el('circle', { 'class': 'gn-halo', r: r + 7 }));
      g.appendChild(el('circle', { 'class': 'gn-dot', r: r }));

      var t = el('text', { 'class': 'gn-label', y: r + 17 });
      /* SVG 안에서는 수식을 그릴 수 없으므로 읽을 수 있는 글자로 바꿉니다 */
      t.textContent = cut(U.mathPlain(p.title), 14);
      g.appendChild(t);

      var badge = el('g', { 'class': 'gn-badge' });
      badge.appendChild(el('circle', { r: 9, cx: r + 2, cy: -r - 2 }));
      var bt = el('text', { x: r + 2, y: -r + 2 });
      badge.appendChild(bt);
      g.appendChild(badge);

      var tip = el('title');
      tip.textContent = U.mathPlain(p.title) + '  ·  ' + U.catPath(p.category, ' › ') + '  ·  ' + p.date;
      g.appendChild(tip);

      gNodes.appendChild(g);
      elNode[file] = { g: g, r: r, label: t, badgeText: bt, badge: badge };
    });

    host.appendChild(svg);
    paintPicked();
    apply();
    stats();
    if (!fitted) { fit(); fitted = true; }
  }

  /* 옮긴 노드에 딸린 화살표만 다시 그립니다 */
  function refreshEdges(file) {
    elEdge.forEach(function (e) {
      if (e.from !== file && e.to !== file) return;
      var path = d(L.node[e.from], L.node[e.to]);
      e.hit.setAttribute('d', path);
      e.line.setAttribute('d', path);
    });
  }

  function paintPicked() {
    Object.keys(elNode).forEach(function (f) {
      var i = picked.indexOf(f);
      elNode[f].g.classList.toggle('gn--picked', i >= 0);
      elNode[f].badge.style.display = i >= 0 ? '' : 'none';
      if (i >= 0) elNode[f].badgeText.textContent = i + 1;
    });
  }

  function apply() {
    if (gRoot) gRoot.setAttribute('transform',
      'translate(' + view.x + ',' + view.y + ') scale(' + view.k + ')');
  }

  /* 처음 열 때 — 내용 전체가 가운데에 오도록 */
  function fit() {
    var files = Object.keys(L.node);
    if (!files.length) return;
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    files.forEach(function (f) {
      var n = L.node[f], r = radius(n) + 26;
      x0 = Math.min(x0, n.px - r); x1 = Math.max(x1, n.px + r);
      y0 = Math.min(y0, n.py - r); y1 = Math.max(y1, n.py + r);
    });
    /* 왼쪽 이름표 자리도 함께 보이도록 */
    x0 = Math.min(x0, 10);

    var W = host.clientWidth || 900, H = host.clientHeight || 560;
    var k = Math.min(1.1, Math.min(W / (x1 - x0 + 40), H / (y1 - y0 + 40)));
    k = Math.max(0.25, k);
    view.k = k;
    view.x = (W - (x1 - x0) * k) / 2 - x0 * k;
    view.y = (H - (y1 - y0) * k) / 2 - y0 * k;
    apply();
  }

  function stats() {
    var el2 = document.getElementById('g-stats');
    if (!el2) return;
    var iso = Object.keys(L.node).filter(function (f) { return L.node[f].lane === -1; }).length;
    el2.textContent = '글 ' + L.g.posts.length + ' · 인용 ' + L.g.edges.length +
      ' · 흐름 ' + L.flows.length + (iso ? ' · 미연결 ' + iso : '');
  }

  /* ══════════════════════════════════════════════════
     3. 조작
     ══════════════════════════════════════════════════ */
  var mode = null;     /* 'pan' | 'node' */
  var drag = null;

  function svgPoint(e) {
    var box = host.getBoundingClientRect();
    return { x: (e.clientX - box.left - view.x) / view.k,
             y: (e.clientY - box.top - view.y) / view.k };
  }

  host.addEventListener('mousedown', function (e) {
    var g = e.target.closest && e.target.closest('.gn');
    if (g) {
      var file = g.getAttribute('data-file');
      var p = svgPoint(e);
      mode = 'node';
      drag = { file: file, dx: p.x - L.node[file].px, dy: p.y - L.node[file].py, movedPx: 0 };
      host.classList.add('dragging');
      e.preventDefault();
      return;
    }
    mode = 'pan';
    drag = { x: e.clientX - view.x, y: e.clientY - view.y };
    host.classList.add('panning');
  });

  window.addEventListener('mousemove', function (e) {
    if (!drag) return;
    if (mode === 'pan') {
      view.x = e.clientX - drag.x;
      view.y = e.clientY - drag.y;
      apply();
      return;
    }
    var p = svgPoint(e);
    var n = L.node[drag.file];
    var nx = p.x - drag.dx, ny = p.y - drag.dy;
    drag.movedPx += Math.abs(nx - n.px) + Math.abs(ny - n.py);
    n.px = nx; n.py = ny;
    elNode[drag.file].g.setAttribute('transform', 'translate(' + nx + ',' + ny + ')');
    refreshEdges(drag.file);
  });

  window.addEventListener('mouseup', function () {
    if (drag && mode === 'node') {
      /* 3px 넘게 움직였으면 "옮김" 으로 보고 자리를 기억합니다 */
      if (drag.movedPx > 3) {
        moved[drag.file] = { x: L.node[drag.file].px, y: L.node[drag.file].py };
        saveMoved();
        suppressClick = true;
        setTimeout(function () { suppressClick = false; }, 0);
      }
    }
    drag = null; mode = null;
    host.classList.remove('dragging', 'panning');
  });

  host.addEventListener('wheel', function (e) {
    e.preventDefault();
    var box = host.getBoundingClientRect();
    var mx = e.clientX - box.left, my = e.clientY - box.top;
    var k2 = Math.min(2.5, Math.max(0.2, view.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
    /* 마우스 아래 지점을 고정한 채 확대 */
    view.x = mx - (mx - view.x) * (k2 / view.k);
    view.y = my - (my - view.y) * (k2 / view.k);
    view.k = k2;
    apply();
  }, { passive: false });

  /* ── 강조 ── */
  function focusOn(files) {
    host.classList.add('focusing');
    var set = {};
    files.forEach(function (f) { set[f] = 1; });
    elEdge.forEach(function (e) {
      var on = set[e.from] && set[e.to];
      e.line.classList.toggle('on', !!on);
    });
    Object.keys(elNode).forEach(function (f) {
      elNode[f].g.classList.toggle('on', !!set[f]);
    });
  }
  function clearFocus() {
    host.classList.remove('focusing');
    elEdge.forEach(function (e) { e.line.classList.remove('on'); });
    Object.keys(elNode).forEach(function (f) { elNode[f].g.classList.remove('on'); });
  }

  host.addEventListener('mouseover', function (e) {
    if (drag) return;
    var g = e.target.closest && e.target.closest('.gn');
    if (g) {
      var f = g.getAttribute('data-file');
      var near = [f];
      elEdge.forEach(function (x) {
        if (x.from === f) near.push(x.to);
        if (x.to === f) near.push(x.from);
      });
      focusOn(near);
      return;
    }
    var hit = e.target.closest && e.target.closest('.ge-hit');
    if (hit) {
      focusOn([hit.getAttribute('data-from'), hit.getAttribute('data-to')]);
      hit.classList.add('on');
    }
  });
  host.addEventListener('mouseout', function (e) {
    var hit = e.target.closest && e.target.closest('.ge-hit');
    if (hit) hit.classList.remove('on');
  });
  host.addEventListener('mouseleave', clearFocus);

  /* ── 누르기 ── */
  var suppressClick = false;
  host.addEventListener('click', function (e) {
    if (suppressClick) return;
    var g = e.target.closest && e.target.closest('.gn');
    if (!g) return;
    var file = g.getAttribute('data-file');
    if (!picking) { location.href = ROOT + '/posts/' + file; return; }
    var i = picked.indexOf(file);
    if (i >= 0) picked.splice(i, 1); else picked.push(file);
    paintPicked();
    renderPickList();
  });

  /* ── 단추들 ── */
  var btnFit = document.getElementById('btn-fit');
  if (btnFit) btnFit.addEventListener('click', fit);

  var btnReset = document.getElementById('btn-reset');
  if (btnReset) {
    btnReset.addEventListener('click', function () {
      if (!Object.keys(moved).length) return;
      if (!confirm('직접 옮긴 자리를 모두 되돌릴까요?')) return;
      moved = {}; saveMoved();
      build(); fit();
    });
  }

  window.addEventListener('resize', function () { if (!fitted) fit(); });

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
          return '<li><b>' + (i + 1) + '</b><span>' + U.mathify(p ? p.title : f) +
                 '</span><button type="button" data-drop="' + U.esc(f) + '" aria-label="빼기">×</button></li>';
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
    if (!on) picked = [];
    paintPicked();
    renderPickList();
  }

  var btnFlow = document.getElementById('btn-flow');
  if (btnFlow) btnFlow.addEventListener('click', function () { setPicking(!picking); });

  if (listEl) {
    listEl.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-drop]');
      if (!b) return;
      var i = picked.indexOf(b.getAttribute('data-drop'));
      if (i >= 0) { picked.splice(i, 1); paintPicked(); renderPickList(); }
    });
  }

  var pickFlow = document.getElementById('flow-pick');
  function fillFlowPicker() {
    if (!pickFlow) return;
    var cur = pickFlow.value;
    pickFlow.innerHTML = '<option value="">— 새 흐름 —</option>' +
      U.flows().map(function (f) {
        return '<option value="' + U.esc(f.id) + '">' + U.esc(f.label || f.id) + '</option>';
      }).join('');
    pickFlow.value = cur;
  }
  fillFlowPicker();
  if (pickFlow) {
    pickFlow.addEventListener('change', function () {
      var f = U.flows().filter(function (x) { return x.id === pickFlow.value; })[0];
      picked = f ? f.posts.slice() : [];
      if (nameEl) nameEl.value = f ? (f.label || '') : '';
      paintPicked(); renderPickList();
    });
  }

  function show(msg, kind) {
    if (!stateEl) return;
    stateEl.textContent = msg || '';
    stateEl.className = 'flow-state' + (kind ? ' flow-state--' + kind : '');
  }

  function flowsSource(list) {
    if (!list.length) return '\n  ';
    return '\n' + list.map(function (f) {
      return "    { id: '" + f.id + "',\n" +
             "      label: '" + String(f.label || f.id).replace(/'/g, "\\'") + "',\n" +
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

        S.flows = list; window.SITE.flows = list;
        show('저장 완료 — 이제 git push 만 하면 됩니다', 'ok');
        fillFlowPicker();
        if (pickFlow) pickFlow.value = id;
        build();
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
        if (pickFlow) pickFlow.value = '';
        build(); renderPickList();
      } catch (e) { show('실패: ' + e.message, 'bad'); }
    });
  }

  /* ── 시작 ── */
  build();
  renderPickList();
  if (!window.FS || !window.FS.supported) {
    var b = document.getElementById('btn-flow');
    if (b) b.title = '흐름 편집은 크롬·엣지에서만 됩니다 (폴더 접근 필요)';
  }
}());
