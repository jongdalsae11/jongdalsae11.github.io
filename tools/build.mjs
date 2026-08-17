/* ============================================================
   tools/build.mjs — 사이트 자동 정리 도구
   실행:  node tools/build.mjs        (검사 + 생성)
          node tools/build.mjs --check (검사만, 파일 안 고침)

   하는 일
     1. content.js 검사 — 중복 ref, 없는 파일, 날짜 형식, 고아 글
     2. sitemap.xml 생성
     3. feed.xml (RSS) 생성
     4. 각 글 HTML 의 <title>/description/og 태그를 content.js 기준으로 동기화
     5. 깨진 내부 링크 검사

   GitHub Actions 가 push 때마다 이걸 돌려서 결과를 커밋합니다.
   (직접 돌릴 필요는 없지만, 로컬에서 미리 확인할 때 유용)
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = 'https://jongdalsae11.github.io';
const CHECK_ONLY = process.argv.includes('--check');

const r = (p) => fs.readFileSync(path.join(ROOT, p), 'utf-8');
const w = (p, s) => {
  const full = path.join(ROOT, p);
  const old = fs.existsSync(full) ? fs.readFileSync(full, 'utf-8') : null;
  if (old === s) return false;
  if (!CHECK_ONLY) fs.writeFileSync(full, s);
  return true;
};

/* ── content.js 읽기 ─────────────────────────────── */
const sandbox = { window: {} };
new Function('window', r('assets/data/content.js'))(sandbox.window);
const S = sandbox.window.SITE;

const errors = [];
const notes = [];
const changed = [];

/* ── 1. 검사 ─────────────────────────────────────── */
const files = new Set(S.posts.map((p) => p.file));
const onDisk = fs.readdirSync(path.join(ROOT, 'posts')).filter((f) => f.endsWith('.html'));

const seenRef = new Set();
for (const ref of S.library) {
  if (!ref.ref) errors.push(`자료 "${ref.title}" 에 ref 없음`);
  else if (seenRef.has(ref.ref)) errors.push(`인용 태그 중복: ${ref.ref}`);
  seenRef.add(ref.ref);
}
for (const p of S.posts) {
  if (!fs.existsSync(path.join(ROOT, 'posts', p.file)))
    errors.push(`글 파일 없음: posts/${p.file} ("${p.title}")`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date || ''))
    errors.push(`날짜 형식 오류: "${p.title}" → ${p.date}`);
  if (!p.summary) notes.push(`요약 없음: "${p.title}"`);
  for (const l of p.links || [])
    if (!files.has(l)) errors.push(`"${p.title}" 이 없는 글을 연결: ${l}`);
}
for (const f of onDisk)
  if (!files.has(f)) notes.push(`content.js 에 등록되지 않은 글 파일: posts/${f}`);
for (const rs of S.research || [])
  if (rs.post && !files.has(rs.post)) errors.push(`연구 "${rs.title}" 이 없는 글을 가리킴: ${rs.post}`);

/* 내부 링크 검사 */
const allHtml = [
  ...fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).map((f) => f),
  ...onDisk.map((f) => 'posts/' + f)
];
for (const f of allHtml) {
  const src = r(f).replace(/<code[\s\S]*?<\/code>/g, '');
  for (const m of src.matchAll(/(?:src|href)="(\.{1,2}\/[^"#]+)"/g)) {
    const target = path.resolve(path.dirname(path.join(ROOT, f)), m[1]);
    if (!fs.existsSync(target)) errors.push(`깨진 링크: ${f} → ${m[1]}`);
  }
}

/* ── 2. sitemap.xml ──────────────────────────────── */
const pages = fs.readdirSync(ROOT)
  .filter((f) => f.endsWith('.html') && !['404.html', 'write.html'].includes(f))
  .sort();
const byDate = [...S.posts].sort((a, b) => b.date.localeCompare(a.date));

const urls = [
  `  <url><loc>${SITE_URL}/</loc><priority>1.0</priority></url>`,
  ...pages.filter((f) => f !== 'index.html')
    .map((f) => `  <url><loc>${SITE_URL}/${f}</loc><priority>0.7</priority></url>`),
  ...byDate.map((p) =>
    `  <url><loc>${SITE_URL}/posts/${encodeURI(p.file)}</loc>` +
    `<lastmod>${p.date}</lastmod><priority>0.8</priority></url>`)
];
if (w('sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`))
  changed.push('sitemap.xml');

/* ── 3. feed.xml (RSS 2.0) ───────────────────────── */
const xesc = (s) => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');
const rfc822 = (d) => new Date(d + 'T09:00:00+09:00').toUTCString();
const label = (id) => (S.labels && S.labels[id]) || id;

const items = byDate.slice(0, 30).map((p) => `    <item>
      <title>${xesc(p.title)}</title>
      <link>${SITE_URL}/posts/${encodeURI(p.file)}</link>
      <guid isPermaLink="true">${SITE_URL}/posts/${encodeURI(p.file)}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <category>${xesc(label(p.category))}</category>
      <description>${xesc(p.summary || p.title)}</description>
    </item>`).join('\n');

if (w('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xesc(S.siteName || 'archive')}</title>
    <link>${SITE_URL}/</link>
    <description>경쟁 프로그래밍 · 알고리즘 연구 · 글쓰기</description>
    <language>ko</language>
    <lastBuildDate>${rfc822(byDate[0]?.date || '2026-01-01')}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`)) changed.push('feed.xml');

/* ── 4. 글 HTML 메타 동기화 ──────────────────────── */
for (const p of S.posts) {
  const f = 'posts/' + p.file;
  if (!fs.existsSync(path.join(ROOT, f))) continue;
  let src = r(f);
  const desc = xesc(p.summary || p.title);
  const url = `${SITE_URL}/posts/${encodeURI(p.file)}`;

  const set = (re, replacement) => {
    if (re.test(src)) src = src.replace(re, replacement);
  };
  set(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${desc}">`);
  set(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${desc}">`);
  set(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
  set(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${xesc(p.title)}">`);
  /* 글 분류를 본문에 심어 색 테마가 자동 적용되게 함 */
  if (!/data-cat="/.test(src))
    src = src.replace('<body ', `<body data-cat="${p.category}" `);
  else
    src = src.replace(/data-cat="[^"]*"/, `data-cat="${p.category}"`);

  /* 브레드크럼도 분류 계층에 맞춰 갱신 — 글 / 알고리즘 / 자료구조 / 제목 */
  const chain = p.category.split('/').reduce((acc, part) => {
    acc.push(acc.length ? acc[acc.length - 1] + '/' + part : part);
    return acc;
  }, []);
  const crumb = ['글', ...chain.map(label), `<b>${xesc(p.title)}</b>`].join(' / ');
  if (/data-crumb="/.test(src)) src = src.replace(/data-crumb="[^"]*"/, `data-crumb="${crumb}"`);

  if (w(f, src)) changed.push(f);
}

/* ── 결과 ────────────────────────────────────────── */
const RED = '\x1b[31m', YEL = '\x1b[33m', GRN = '\x1b[32m', DIM = '\x1b[2m', OFF = '\x1b[0m';
console.log(`${DIM}── 사이트 점검 ──${OFF}`);
console.log(`글 ${S.posts.length} · 자료 ${S.library.length} · 문제 ${S.problems.length} · 연구 ${S.research.length}`);

if (errors.length) {
  console.log(`\n${RED}오류 ${errors.length}건${OFF}`);
  errors.forEach((e) => console.log('  ✗ ' + e));
} else {
  console.log(`\n${GRN}오류 없음${OFF}`);
}
if (notes.length) {
  console.log(`\n${YEL}참고 ${notes.length}건${OFF}`);
  notes.forEach((n) => console.log('  · ' + n));
}
if (changed.length) {
  console.log(`\n${CHECK_ONLY ? '갱신 필요' : '갱신됨'}: ${changed.join(', ')}`);
} else {
  console.log('\n생성 파일 최신 상태');
}

process.exit(errors.length ? 1 : 0);
