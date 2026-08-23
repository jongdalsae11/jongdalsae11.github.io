/* ============================================================
   fs.js — 내 컴퓨터의 사이트 폴더에 직접 읽고 쓰기

   브라우저의 File System Access API 를 씁니다. 사용자가 직접 고른 폴더에만,
   그것도 허가한 동안에만 접근합니다. 폴더 손잡이는 IndexedDB 에 넣어 두어
   다음에 열었을 때 다시 고르지 않아도 됩니다.

   작성 도구(save.js)와 그래프 화면(graph.js)이 함께 씁니다.
   같은 손잡이를 쓰므로 한쪽에서 폴더를 연결하면 다른 쪽에서도 바로 됩니다.
   (크롬·엣지 전용)
   ============================================================ */

window.FS = (function () {
  var root = null;
  var supported = !!(window.showDirectoryPicker && window.indexedDB);

  /* ── 폴더 손잡이 보관 ───────────────────────────── */
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
  function keep(h) { return idb('readwrite', function (s) { return s.put(h, 'root'); }); }
  function recall() { return idb('readonly', function (s) { return s.get('root'); }); }

  /* 고른 폴더가 정말 이 사이트의 폴더인지 확인합니다 */
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
      alert('이 브라우저는 폴더 연결을 지원하지 않습니다.\n크롬이나 엣지에서 열어 주세요.');
      return false;
    }
    try {
      var dir = await window.showDirectoryPicker({ mode: 'readwrite' });
      if (!await isSiteRoot(dir)) {
        alert('사이트 폴더가 아닌 것 같습니다.\n' +
              'posts/ 와 assets/data/content.js 가 들어 있는 폴더를 골라 주세요.');
        return false;
      }
      root = dir;
      await keep(dir);
      return true;
    } catch (e) {
      if (e && e.name === 'AbortError') return false;   /* 사용자가 취소 */
      throw e;
    }
  }

  /* 저장 직전 권한 확인 — 브라우저가 세션마다 다시 물을 수 있습니다 */
  async function ensure() {
    if (!root) { try { root = await recall(); } catch (e) {} }
    if (!root) return connect();
    var opt = { mode: 'readwrite' };
    if ((await root.queryPermission(opt)) === 'granted') return true;
    if ((await root.requestPermission(opt)) === 'granted') return true;
    return connect();
  }

  /* 이미 연결해 둔 폴더가 있는지 (권한은 아직 안 물음) */
  async function known() {
    if (root) return true;
    try { root = await recall(); } catch (e) {}
    return !!root;
  }

  /* ── 파일 ───────────────────────────────────────── */
  async function dirOf(parts, create) {
    var dir = root;
    for (var i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i], create ? { create: true } : undefined);
    }
    return dir;
  }
  async function read(path) {
    var parts = path.split('/');
    var fh = await (await dirOf(parts)).getFileHandle(parts[parts.length - 1]);
    return (await fh.getFile()).text();
  }
  async function write(path, text) {
    var parts = path.split('/');
    var fh = await (await dirOf(parts, true))
      .getFileHandle(parts[parts.length - 1], { create: true });
    var w = await fh.createWritable();
    await w.write(text);
    await w.close();
  }
  async function remove(path) {
    var parts = path.split('/');
    await (await dirOf(parts)).removeEntry(parts[parts.length - 1]);
  }

  /* ── content.js 를 다룰 때 쓰는 도구 ─────────────── */

  /* 여는 괄호의 짝을 찾습니다 (따옴표 안은 건너뜁니다) */
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

  /* 최상위 배열( posts: [ … ] )의 내용을 통째로 갈아 끼웁니다 */
  function replaceArray(text, key, body) {
    var head = text.indexOf('\n  ' + key + ': [');
    if (head < 0) throw new Error('content.js 에서 ' + key + ' 목록을 찾지 못했습니다');
    var open = text.indexOf('[', head);
    var close = matchBracket(text, open);
    return text.slice(0, open + 1) + body + text.slice(close);
  }

  return {
    supported: supported,
    connect: connect, ensure: ensure, known: known,
    read: read, write: write, remove: remove,
    matchBracket: matchBracket, replaceArray: replaceArray
  };
}());
