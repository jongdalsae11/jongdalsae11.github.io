/* ============================================================
   rating.js — 온라인 저지 등급을 API 로 직접 가져옵니다

   손으로 적어 두면 반드시 낡습니다. 페이지를 열 때마다 공개 API 에서
   최신값을 받아 채웁니다. 못 받아오면(네트워크·차단·핸들 변경)
   미리 적어 둔 글자가 그대로 남으므로 화면이 비지 않습니다.

     data-solvedac="핸들"   solved.ac  — 티어 · 푼 문제 수
     data-cf="핸들"         Codeforces — 등급 · 레이팅
   ============================================================ */

(function () {
  /* solved.ac 티어는 1~30 의 숫자로 옵니다 (0 = Unrated) */
  var TIER = ['Unrated',
    'Bronze V', 'Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I',
    'Silver V', 'Silver IV', 'Silver III', 'Silver II', 'Silver I',
    'Gold V', 'Gold IV', 'Gold III', 'Gold II', 'Gold I',
    'Platinum V', 'Platinum IV', 'Platinum III', 'Platinum II', 'Platinum I',
    'Diamond V', 'Diamond IV', 'Diamond III', 'Diamond II', 'Diamond I',
    'Ruby V', 'Ruby IV', 'Ruby III', 'Ruby II', 'Ruby I'];

  /* 티어·등급별 색 — 사이트 팔레트와 부딪히지 않게 차분한 값으로 */
  var TIER_COLOR = ['#62627e',
    '#ad5600', '#ad5600', '#ad5600', '#ad5600', '#ad5600',
    '#9fa5b2', '#9fa5b2', '#9fa5b2', '#9fa5b2', '#9fa5b2',
    '#ffb028', '#ffb028', '#ffb028', '#ffb028', '#ffb028',
    '#00c78b', '#00c78b', '#00c78b', '#00c78b', '#00c78b',
    '#00b4fc', '#00b4fc', '#00b4fc', '#00b4fc', '#00b4fc',
    '#ff0062', '#ff0062', '#ff0062', '#ff0062', '#ff0062'];

  var CF_COLOR = {
    newbie: '#9a9ab0', pupil: '#34d399', specialist: '#2dd4bf',
    expert: '#818cf8', 'candidate master': '#c084fc', master: '#fbbf24',
    'international master': '#fbbf24', grandmaster: '#fb7185',
    'international grandmaster': '#fb7185', 'legendary grandmaster': '#fb7185'
  };

  function fill(el, text, color, title) {
    el.textContent = text;
    if (color) el.style.color = color;
    if (title) el.title = title;
    el.classList.add('rating--live');
  }

  /* solved.ac */
  document.querySelectorAll('[data-solvedac]').forEach(function (el) {
    var h = el.getAttribute('data-solvedac');
    fetch('https://solved.ac/api/v3/user/show?handle=' + encodeURIComponent(h))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var t = Math.max(0, Math.min(30, d.tier || 0));
        fill(el, TIER[t], TIER_COLOR[t],
             '레이팅 ' + (d.rating || 0) + ' · 푼 문제 ' + (d.solvedCount || 0) + '개');
      })
      .catch(function () { /* 적어 둔 글자를 그대로 둡니다 */ });
  });

  /* Codeforces */
  document.querySelectorAll('[data-cf]').forEach(function (el) {
    var h = el.getAttribute('data-cf');
    fetch('https://codeforces.com/api/user.info?handles=' + encodeURIComponent(h))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var u = (d.result || [])[0];
        if (!u) throw new Error('없는 핸들');
        var rank = (u.rank || '').toLowerCase();
        fill(el, (u.rank || '—') + (u.rating ? ' · ' + u.rating : ''),
             CF_COLOR[rank] || null,
             u.maxRating ? '최고 ' + u.maxRating + ' (' + (u.maxRank || '') + ')' : '');
      })
      .catch(function () {});
  });
}());
