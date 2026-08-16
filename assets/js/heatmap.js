/* ============================================================
   heatmap.js — 활동 잔디
   · 임의의 난수가 아니라 content.js 에 실제로 등록된
     글 / 문제 / 연구의 날짜만 칠합니다. (기록이 없으면 빈 칸)
   · 오늘 날짜가 항상 맨 오른쪽 칸에 오도록 정렬합니다.
   ============================================================ */

(function () {
  var el = document.getElementById('heat');
  if (!el) return;
  var S = window.SITE || {};
  var WEEKS = 26;

  /* 날짜별 활동 수 집계 */
  var counts = {};
  function add(d) { if (d) counts[d] = (counts[d] || 0) + 1; }
  (S.posts || []).forEach(function (p) { add(p.date); });
  (S.problems || []).forEach(function (p) { add(p.date); });
  (S.research || []).forEach(function (r) { add(r.date); });

  /* 오늘이 포함된 주의 토요일까지 채워서 마지막 열에 오늘이 오게 함 */
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var end = new Date(today);
  end.setDate(end.getDate() + (6 - end.getDay()));
  var start = new Date(end);
  start.setDate(start.getDate() - (WEEKS * 7 - 1));

  function key(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  var html = '', cur = new Date(start), total = 0, months = [];
  var lastMonth = -1;
  for (var w = 0; w < WEEKS; w++) {
    /* 열(주) 단위로 월 라벨 위치 계산 */
    var probe = new Date(cur);
    if (probe.getMonth() !== lastMonth) {
      lastMonth = probe.getMonth();
      months.push({ col: w, m: probe.getMonth() + 1 });
    }
    for (var d = 0; d < 7; d++) {
      var k = key(cur);
      var n = counts[k] || 0;
      total += n;
      var future = cur > today;
      var lv = n >= 4 ? 4 : n === 3 ? 3 : n === 2 ? 2 : n === 1 ? 1 : 0;
      var cls = future ? 'future' : (lv ? 'l' + lv : '');
      var isToday = k === key(today);
      html += '<i' + (cls || isToday ? ' class="' + cls + (isToday ? ' today' : '') + '"' : '') +
              ' title="' + k + (future ? '' : ' · 기록 ' + n + '건') + '"></i>';
      cur.setDate(cur.getDate() + 1);
    }
  }
  el.innerHTML = html;

  /* 월 라벨 */
  var mrow = document.getElementById('heat-months');
  if (mrow) {
    mrow.innerHTML = months.map(function (m) {
      return '<span style="grid-column:' + (m.col + 1) + '">' + m.m + '월</span>';
    }).join('');
  }

  var note = document.getElementById('heat-note');
  if (note) {
    note.textContent = total
      ? '최근 ' + WEEKS + '주 · 기록 ' + total + '건 (글 · 문제 · 연구)'
      : '최근 ' + WEEKS + '주 · 아직 기록이 없습니다';
  }
})();
