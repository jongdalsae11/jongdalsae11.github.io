/* ============================================================
   tools/smoke.mjs — 모든 페이지를 실제로 «열어» 보는 검사

   실행:  npm i jsdom      (한 번만)
          node tools/smoke.mjs

   build.mjs 는 데이터와 링크를 검사하지만, 스크립트가 실제로 도는지는
   보지 못합니다. 이 검사는 각 페이지를 jsdom 으로 열어 스크립트를 돌려
   보고 오류가 나는 페이지를 알려 줍니다. 사이드바가 그려지는지,
   글 안의 시뮬레이션 액자가 제대로 만들어지는지도 함께 봅니다.

   ※ jsdom 이 없으면 그냥 건너뜁니다 (CI 를 막지 않습니다).
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let JSDOM;
try { ({ JSDOM } = await import('jsdom')); }
catch {
  console.log('jsdom 이 없어 건너뜁니다.  npm i jsdom  후 다시 실행하세요.');
  process.exit(0);
}

const pages = [
  ...fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')),
  ...fs.readdirSync(path.join(ROOT, 'posts')).map((f) => 'posts/' + f),
  ...(fs.existsSync(path.join(ROOT, 'sims'))
      ? fs.readdirSync(path.join(ROOT, 'sims')).map((f) => 'sims/' + f) : [])
].filter((f) => f.endsWith('.html'));

/* 페이지 하나를 열고, 그 안의 로컬 스크립트를 순서대로 돌립니다.
   (외부 CDN 스크립트는 받지 않습니다 — 없어도 페이지는 돌아야 합니다) */
function open(file, query = '') {
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, file), 'utf-8'), {
    runScripts: 'outside-only',
    url: 'https://jongdalsae11.github.io/' + file + query,
    pretendToBeVisual: true
  });
  const w = dom.window;
  /* jsdom 에 없는 것 몇 개만 살짝 채워 둡니다 */
  if (!w.matchMedia) w.matchMedia = () => ({ matches: false, addListener() {},
    removeListener() {}, addEventListener() {}, removeEventListener() {} });
  if (!w.fetch) w.fetch = () => Promise.reject(new Error('offline'));

  const errs = [];
  w.addEventListener('error', (e) => errs.push(e.message));

  try {
    for (const s of [...w.document.querySelectorAll('script')]) {
      const type = (s.getAttribute('type') || '').toLowerCase();
      /* 원고 보존용 <script type="text/markdown"> 은 코드가 아닙니다 */
      if (type && !/javascript|module/.test(type)) continue;
      const src = s.getAttribute('src');
      if (src) {
        if (/^https?:/.test(src)) continue;
        const rel = src.split('?')[0].replace(/^\.{1,2}\//, '');
        w.eval(fs.readFileSync(path.join(ROOT, rel), 'utf-8'));
      } else w.eval(s.textContent);
    }
    w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  } catch (e) { errs.push(e.message); }

  return { w, errs };
}

const RED = '\x1b[31m', GRN = '\x1b[32m', YEL = '\x1b[33m', DIM = '\x1b[2m', OFF = '\x1b[0m';
const fail = [];
const notes = [];

console.log(`${DIM}── 페이지 열어 보기 ──${OFF}`);
for (const f of pages) {
  const { w, errs } = open(f);
  if (errs.length) { fail.push(`${f} → ${errs.join(' / ')}`); continue; }

  /* 글: 시뮬레이션 인용이 액자로 살아났는지 */
  if (f.startsWith('posts/')) {
    for (const box of w.document.querySelectorAll('.sim-embed')) {
      if (box.classList.contains('sim-embed--missing'))
        fail.push(`${f} → 등록되지 않은 시뮬레이션 인용: ${box.getAttribute('data-sim')}`);
      else if (!box.querySelector('iframe.sim-frame'))
        fail.push(`${f} → 시뮬레이션 액자가 만들어지지 않음: ${box.getAttribute('data-sim')}`);
    }
  }
  /* 시뮬레이션: 단독으로 열었을 때 실제로 그려졌는지 */
  if (f.startsWith('sims/')) {
    if (!w.document.querySelector('.sm-stage'))
      fail.push(`${f} → Sim.run 이 아무것도 그리지 않음`);
    if (w.document.querySelector('.sm-error'))
      fail.push(`${f} → 그리는 중 오류 (콘솔 확인)`);
  }
}

/* 시뮬레이션은 «끼워진 모습» 으로도 한 번 더 */
for (const f of pages.filter((p) => p.startsWith('sims/'))) {
  const { w, errs } = open(f, '?embed=1');
  if (errs.length) { fail.push(`${f}?embed=1 → ${errs.join(' / ')}`); continue; }
  if (w.document.querySelector('.sidebar, .topbar'))
    notes.push(`${f} — 끼운 상태인데 사이드바가 그려짐 (window.EMBED 확인)`);
  if (!w.document.querySelector('.sm-stage'))
    fail.push(`${f}?embed=1 → 그려지지 않음`);
}

console.log(`페이지 ${pages.length}개 · 시뮬레이션 끼움 검사 포함`);
if (fail.length) {
  console.log(`\n${RED}오류 ${fail.length}건${OFF}`);
  fail.forEach((m) => console.log('  ✗ ' + m));
} else {
  console.log(`\n${GRN}오류 없음${OFF}`);
}
if (notes.length) {
  console.log(`\n${YEL}참고 ${notes.length}건${OFF}`);
  notes.forEach((m) => console.log('  · ' + m));
}
process.exit(fail.length ? 1 : 0);
