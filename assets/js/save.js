/* ============================================================
   save.js — 폴더를 한 번 연결해 두면 저장이 클릭 한 번

   지금까지: 내려받기 → 탐색기에서 posts/ 로 옮기기 → 등록 코드 복사 →
             content.js 열어서 붙여넣기 → 저장 → git push   (6단계)
   이제:     저장 버튼 → git push                            (2단계)

   브라우저의 File System Access API 를 씁니다. 사용자가 직접 고른 폴더에만,
   그것도 허가한 동안에만 접근합니다. 폴더 손잡이는 IndexedDB 에 넣어 두어
   다음에 열었을 때 다시 고르지 않아도 됩니다.
   (크롬·엣지 전용. 지원하지 않으면 기존 내려받기 방식이 그대로 남습니다)
   ============================================================ */

(function () {
  var W = window.WRITE;
  if (!W) return;

  var supported = !!(window.showDirectoryPicker && window.indexedDB);
  var root = null;                 /* jongdal 폴더 손잡이 */

  var btnSave = document.getElementById('btn-save');
  var btnLink = document.getElementById('btn-link');
  var statusEl = document.getElementById('save-state');
  if (!btnSave || !btnLink) return;

  /* ── 폴더 손잡이 보관 (IndexedDB) ───────────────── */
  function idb(mode, fn) {
    return new Promise(function (res, rej) {
      var open = indexedDB.open('jongdal-fs', 1);
      open.onupgradeneeded = function () { open.result.createObjectStore('h'); };
      open.onerror = function () { rej(open.error); };
      open.onsuccess = function () {
        var tx = open.result.transaction('h', mode);
        var rq = fn(tx.objectStore('h'));
        rq.onsuccess = function () { res(rq.result); };
        rq.onerror = function () { rej(rq.error); };
      };
    });
  }
  var keep = function (h) { return idb('readwrite', function (s) { return s.put(h, 'root'); }); };
  var recall = function () { return idb('readonly', function (s) { return s.get('root'); }); };

  /* ── 상태 표시 ──────────────────────────────────── */
  function show(msg, kind) {
    statusEl.textContent = msg || '';
    statusEl.className = 'save-state' + (kind ? ' save-state--' + kind : '');
  }
  function setLinked(on) {
    document.body.classList.toggle('fs-linked', on);
    btnLink.textContent = on ? '폴더 연결됨' : '폴더 연결';
    btnLink.title = on ? '다른 폴더로 바꾸려면 누르세요'
                       : 'jongdal 폴더를 한 번 연결하면 저장이 한 번에 끝납니다';
  }

  /* ── 폴더 확인 · 연결 ───────────────────────────── */
  async function isSiteRoot(dir) {
    try {
      await dir.getDirectoryHandle('posts');
      var assets = await dir.getDirectoryHandle('assets');
      var data = await assets.getDirectoryHandle('data');
      await data.getFileHandle('content.js');
      return true;
    } catch (e) { return false; }
  }

  async function connect() {
    if (!supported) {
      alert('이 브라우저는 폴더 연결을 지원하지 않습니다.\n' +
            '크롬이나 엣지에서 열면 저장이 한 번에 끝납니다.\n' +
            '지금은 아래 «글 파일 내려받기» 를 쓰세요.');
      return false;
    }
    try {
      var dir = await window.showDirectoryPicker({ mode: 'readwrite' });
      if (!await isSiteRoot(dir)) {
        alert('사이트 폴더가 아닌 것 같습니다.\n' +
              'posts/ 와 assets/data/content.js 가 들어 있는 jongdal 폴더를 골라 주세요.');
        return false;
      }
      root = dir;
      await keep(dir);
      setLinked(true);
      show('연결됨 — 이제 저장 한 번으로 끝납니다', 'ok');
      return true;
    } catch (e) {
      if (e && e.name === 'AbortError') return false;   /* 사용자가 취소 */
      show('폴더를 연결하지 못했습니다: ' + e.message, 'bad');
      return false;
    }
  }

  /* 저장 직전에 권한을 확인합니다 (브라우저가 세션마다 다시 물을 수 있음) */
  async function ensure() {
    if (!root) {
      try { root = await recall(); } catch (e) {}
    }
    if (!root) return connect();
    var opt = { mode: 'readwrite' };
    if ((await root.queryPermission(opt)) === 'granted') return true;
    if ((await root.requestPermission(opt)) === 'granted') return true;
    return connect();
  }

  /* ── 파일 읽기 · 쓰기 ───────────────────────────── */
  async function readFile(path) {
    var parts = path.split('/'), dir = root;
    for (var i = 0; i < parts.length - 1; i++) dir = await dir.getDirectoryHandle(parts[i]);
    var fh = await dir.getFileHandle(parts[parts.length - 1]);
    return (await fh.getFile()).text();
  }
  async function writeFile(path, text) {
    var parts = path.split('/'), dir = root;
    for (var i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i], { create: true });
    }
    var fh = await dir.getFileHandle(parts[parts.length - 1], { create: true });
    var w = await fh.createWritable();
    await w.write(text);
    await w.close();
  }

  /* ── content.js 에 항목 넣기/바꾸기 ─────────────────
     같은 id 가 이미 있으면 그 항목만 갈아 끼우고, 없으면 배열 맨 앞에 넣습니다.
     중괄호를 세어 항목의 끝을 찾으므로 줄바꿈 모양이 달라도 안전합니다.   */
  function patchContent(text, reg) {
    var head = text.indexOf('\n  ' + reg.key + ': [');
    if (head < 0) throw new Error('content.js 에서 ' + reg.key + ' 목록을 찾지 못했습니다');
    var open = text.indexOf('[', head) + 1;

    /* 이미 있는 항목인지 — id 값으로 찾습니다 */
    var idPat = new RegExp(reg.idKey + ":\\s*'" + reg.idVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'");
    var arrEnd = matchBracket(text, open - 1);
    var slice = text.slice(open, arrEnd);
    var hit = slice.search(idPat);

    if (hit >= 0) {
      /* 그 항목을 감싸는 { … } 를 되짚어 찾습니다 */
      var s = text.lastIndexOf('{', open + hit);
      var e = matchBracket(text, s) + 1;
      if (text[e] === ',') e++;
      return text.slice(0, s).replace(/[ \t]*$/, '    ') + reg.text.replace(/^\s*/, '') + text.slice(e);
    }
    return text.slice(0, open) + '\n' + reg.text + '\n' + text.slice(open);
  }

  /* 여는 괄호의 짝을 찾습니다 (따옴표 안은 건너뜀) */
  function matchBracket(text, at) {
    var open = text[at], close = open === '[' ? ']' : '}';
    var depth = 0, quote = null;
    for (var i = at; i < text.length; i++) {
      var c = text[i];
      if (quote) {
        if (c === '\\') i++;
        else if (c === quote) quote = null;
        continue;
      }
      if (c === "'" || c === '"') { quote = c; continue; }
      if (c === open) depth++;
      else if (c === close && --depth === 0) return i;
    }
    throw new Error('content.js 의 괄호가 맞지 않습니다');
  }

  /* ── 저장 ───────────────────────────────────────── */
  async function save() {
    var mode = W.getMode();
    var F = W.F;

    if (mode === 'post' && !F.title.value.trim()) {
      alert('제목을 입력해 주세요.'); F.title.focus(); return;
    }
    W.genRegister();
    var reg = W.lastReg();
    if (!reg || !reg.idVal) { alert('먼저 내용을 채워 주세요.'); return; }

    show('저장하는 중…');
    btnSave.disabled = true;
    try {
      if (!await ensure()) { show(''); return; }

      var done = [];

      /* 1. 글이면 HTML 파일부터 */
      if (mode === 'post') {
        var file = 'posts/' + W.fileBase() + '.html';
        await writeFile(file, W.buildPostHTML());
        done.push(file);
      }

      /* 2. content.js 에 등록 */
      var path = 'assets/data/content.js';
      var before = await readFile(path);
      var after = patchContent(before, reg);
      if (after !== before) {
        await writeFile(path, after);
        done.push(path + (before.length > after.length - reg.text.length ? ' (갱신)' : ''));
      }

      show('저장 완료 — ' + done.join(' · ') + '  이제 git push 만 하면 됩니다', 'ok');
      document.querySelector('.w-tabs button[data-tab="register"]').click();
      document.querySelectorAll('.w-steps li').forEach(function (li) { li.classList.add('on'); });
    } catch (e) {
      show('저장 실패: ' + e.message, 'bad');
      console.error(e);
    } finally {
      btnSave.disabled = false;
    }
  }

  btnLink.addEventListener('click', connect);
  btnSave.addEventListener('click', save);

  /* Ctrl+S 로도 저장 */
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      save();
    }
  });

  /* ── 처음 열 때 ─────────────────────────────────── */
  if (!supported) {
    btnLink.hidden = true;
    btnSave.hidden = true;
    show('');
  } else {
    recall().then(function (h) {
      if (!h) return;
      root = h;
      h.queryPermission({ mode: 'readwrite' }).then(function (p) {
        setLinked(true);
        if (p !== 'granted') show('폴더 연결됨 — 저장할 때 한 번 허용을 물어봅니다');
      });
    }).catch(function () {});
  }
}());
