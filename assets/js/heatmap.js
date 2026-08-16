/* ============================================================
   heatmap.js — 활동 잔디 (solved.ac 스트릭 표 형태)
   · 왼쪽에 요일 축, 아래에 월 축 (겹치지 않게 최소 간격 확보)
   · content.js 에 등록된 글·문제·연구의 날짜만 칠함
   · 오늘이 항상 마지막 열, 칸에 커서를 올리면 날짜와 기록 수 표시
   ============================================================ */

(function () {
  var host = document.getElementById('heat');
  if (!host) return;
  var S = window.SITE || {};
  var WEEKS = 26;
  var DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  /* 날짜별 기록 수집 */
  var byDate = {};
  function add(d, kind, title) {
    if (!d) return;
    (byDate[d] = byDate[d] || []).push({ kind: kind, title: title });
  }
  (S.posts || []).forEach(function (p) { add(p.date, '글', p.title); });
  (S.problems || []).forEach(function (p) { add(p.date, '문제', p.title); });
  (S.research || []).forEach(function (r) { add(r.date, '연구', r.title); });

  /* 오늘이 마지막 열에 오도록 범위 계산 */
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var end = new Date(today);
  end.setDate(end.getDate() + (6 - end.getDay()));
  var start = new Date(end);
  start.setDate(start.getDate() - (WEEKS * 7 - 1));

  function key(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  var cells = '', cands = [], lastMonth = -1;
  var cur = new Date(start), total = 0;

  for (var w = 0; w < WEEKS; w++) {
    var colMonth = new Date(cur).getMonth();
    if (colMonth !== lastMonth) {
      lastMonth = colMonth;
      cands.push({ col: w + 1, text: (colMonth + 1) + '월' });
    }
    for (var d = 0; d < 7; d++) {
      var k = key(cur);
      var recs = byDate[k] || [];
      var n = recs.length;
      total += n;
      var future = cur > today;
      var lv = n >= 4 ? 4 : n;
      var cls = 'hc' + (future ? ' future' : (lv ? ' l' + lv : '')) +
                (k === key(today) ? ' today' : '');
      var tip = future ? k : k + '||' + n + '||' +
                recs.map(function (r) { return r.kind + ' · ' + r.title; }).join('|');
      cells += '<i class="' + cls + '" data-tip="' + tip.replace(/"/g, '&quot;') + '"></i>';
      cur.setDate(cur.getDate() + 1);
    }
  }

  /* 라벨이 서로 겹치지 않도록 3칸 미만이면 정리.
     맨 앞의 잘린 달은 다음 달 라벨에 자리를 내준다. */
  var months = [];
  cands.forEach(function (c) {
    if (!months.length) { months.push(c); return; }
    if (c.col - months[months.length - 1].col >= 3) months.push(c);
    else if (months.length === 1) months[0] = c;
  });

  host.innerHTML =
    '<div class="heat-chart">' +
      '<div class="heat-dow">' + DOW.map(function (x, i) {
        return '<span>' + (i % 2 === 1 ? x : '') + '</span>';
      }).join('') + '</div>' +
      '<div class="heat-scroll">' +
        '<div class="heat-cells">' + cells + '</div>' +
        '<div class="heat-months">' + months.map(function (m) {
          return '<span style="grid-column:' + m.col + '">' + m.text + '</span>';
        }).join('') + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="heat-legend">' +
      '<span>적음</span>' +
      '<i class="hc"></i><i class="hc l1"></i><i class="hc l2"></i>' +
      '<i class="hc l3"></i><i class="hc l4"></i>' +
      '<span>많음</span>' +
    '</div>';

  var note = document.getElementById('heat-note');
  if (note) {
    note.textContent = total
      ? '최근 ' + WEEKS + '주 · 기록 ' + total + '건 (글 · 문제 · 연구)'
      : '최근 ' + WEEKS + '주 · 아직 기록이 없습니다';
  }

  /* 오른쪽 끝(오늘)이 보이도록 스크롤 */
  var scroller = host.querySelector('.heat-scroll');
  scroller.scrollLeft = scroller.scrollWidth;

  /* ── 커서 올리면 날짜 / 기록 표시 ───────────────── */
  var tip = document.createElement('div');
  tip.className = 'heat-tip';
  tip.hidden = true;
  document.body.appendChild(tip);

  host.addEventListener('mouseover', function (e) {
    var c = e.target.closest('.hc[data-tip]');
    if (!c) return;
    var parts = c.getAttribute('data-tip').split('||');
    var date = parts[0], n = parts[1], list = parts[2];
    if (n === undefined) {                      /* 미래 날짜 */
      tip.innerHTML = '<b>' + date + '</b>';
    } else {
      tip.innerHTML = '<b>' + date + '</b><span>기록 ' + n + '건</span>' +
        (list ? '<em>' + list.split('|').join('<br>') + '</em>' : '');
    }
    tip.hidden = false;
    var r = c.getBoundingClientRect();
    var top = r.top + window.scrollY - tip.offsetHeight - 9;
    var left = r.left + window.scrollX + r.width / 2 - tip.offsetWidth / 2;
    tip.style.top = top + 'px';
    tip.style.left = Math.max(8, Math.min(left, window.innerWidth - tip.offsetWidth - 8)) + 'px';
  });
  host.addEventListener('mouseout', function (e) {
    if (e.target.closest('.hc')) tip.hidden = true;
  });
})();
