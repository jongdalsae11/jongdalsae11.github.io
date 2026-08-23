# 개인 아카이브 사이트

VSCode 다크 테마 기반 개인 아카이브 · <https://jongdalsae11.github.io>

> **평소에 고치는 파일은 `assets/data/content.js` 하나입니다.**
> 글·자료·문제·연구를 여기에 등록하면 왼쪽 트리, 목록 페이지, 홈 대시보드,
> 활동 잔디, 검색, 백링크, 분류색이 전부 자동으로 갱신됩니다.
>
> 자세한 사용법은 사이트의 **[이 사이트에 글 쓰는 법]** 글에 정리되어 있습니다.
> (`posts/2026-08-17-writing-guide.html`)

## 글 올리기 — 저장 → push

작성 도구에서 **폴더 연결** 을 한 번 눌러 `jongdal` 폴더를 지정해 두면,
그 뒤로는 **저장(Ctrl+S)** 한 번에

1. `posts/새글.html` 이 만들어지고
2. `assets/data/content.js` 에 등록까지 됩니다.

남는 일은 `git push` 뿐입니다. (크롬·엣지 전용 · 지원하지 않는 브라우저에서는
기존의 «내려받기 → 직접 옮기기» 방식이 그대로 남아 있습니다)

## 배포 — push 만 하면 끝

```
git add -A
git commit -m "메시지"
git push
```

push 하면 GitHub Actions 가 자동으로

1. `content.js` 를 점검하고 (중복 인용 태그 · 없는 파일 · 날짜 형식 · 깨진 링크)
2. `sitemap.xml` · `feed.xml`(RSS) 를 다시 만들고
3. 각 글의 `<title>` · description · og 태그를 `content.js` 기준으로 맞추고
4. **그 결과를 그대로 Pages 에 올립니다.**

4번이 중요합니다. 예전에는 결과를 저장소에 되커밋해서, push 할 때마다
원격에 `[auto]` 커밋이 하나 더 생겼습니다. 그러면 내 로컬이 항상 한 칸
뒤처져 다음 push 가 거부되고 `git pull` 을 먼저 해야 했습니다.
지금은 커밋을 만들지 않으므로 **그냥 push 하면 됩니다.**

> **한 번만 해 둘 설정** — 저장소 **Settings → Pages → Source** 를
> `Deploy from a branch` 가 아니라 **`GitHub Actions`** 로 바꿔 주세요.
> 이걸 해야 위 4번이 실제로 배포됩니다.

로컬에서 미리 확인하려면 (Node 필요):

```
node tools/build.mjs          # 점검 + 생성
node tools/build.mjs --check  # 점검만 (파일 안 고침)
```

## 파일 구조

```
/
├── index.html      홈 (현황 막대 · 고정 글 · 최근 글 · 활동 잔디)
├── about.html      이력
├── research.html   연구·프로젝트
├── posts.html      글 목록 — #math · #algo · #tag=태그 로 필터
├── archive.html    문제 아카이브 (난이도 필터)
├── library.html    자료정리집 — #math · #Ref-A02 로 특정 자료 강조
├── contact.html    연락처
├── write.html      작성 도구 (글·자료·문제·연구 4가지 모드)
├── 404.html
├── posts/          글 HTML
├── tools/build.mjs 자동 점검·생성 스크립트
├── .github/workflows/site.yml   push 때 자동 실행
├── sitemap.xml · feed.xml       ← 자동 생성 (직접 고치지 마세요)
└── assets/
    ├── data/content.js   ★ 모든 콘텐츠 목록
    ├── css/  base · layout · components · post · write
    ├── js/   util · nav · lists · heatmap · progress · code · post
    │         write(작성) · editor(단축키·슬래시) · compose(태그추천·수정)
    │         sync(양방향 이동) · save(폴더 연결 저장)
    ├── img/  글에 쓰는 이미지     files/  자료 PDF
    └── og.png  링크 공유 썸네일
```

`util.js` 는 공통 함수(escape · 날짜 · 태그 · 링크 · 분류색)와 데이터 점검기를
담고 있으며 다른 스크립트보다 먼저 로드됩니다.

## 빠른 참조

| 하고 싶은 것 | 고칠 곳 |
|---|---|
| 글·자료·문제·연구 추가 | `assets/data/content.js` |
| 새 분류 만들기 | `category` 에 새 값 입력 (트리·인덱스·색 자동 생성) |
| 하위 분류 만들기 | `category: 'algo/graph'` — 슬래시로 계층, 깊이 제한 없음 |
| 분류 한글 이름 | `content.js` 의 `labels` (하위는 `'algo/graph'` 전체 경로로) |
| 분류 강조색 바꾸기 | `content.js` 의 `colors: { math: '#34d399' }` |
| 글끼리 연결(백링크) | `content.js` 의 `links: ['파일명.html']` — 양방향 자동 |
| 이름 바꾸기 | `assets/js/nav.js` 의 `SITE_NAME` |
| 전체 색 바꾸기 | `assets/css/base.css` 의 `:root` |
| 무언가 작성하기 | 사이드바 **+ 새로 쓰기** → 모드 선택 → 등록 코드 복사 |
| 이미 올린 것 고치기 | 글 아래 **고치기** 링크, 또는 작성 도구의 **수정** 버튼 |
| 글 저장 | **폴더 연결** 한 번 → 이후 **Ctrl+S** (파일 생성 + 등록 자동) |

**기본 팔레트** — bg `#0a0a14` · surface `#141423` · text `#e4e4ed` · line `#3a3a52`
· cyan `#38bdf8`(상호작용) · purple `#a855f7`(보조) · orange `#f97316`(1% 강조)
**분류색 팔레트** — cyan · purple · emerald · amber · rose · indigo · teal · orange
(등장 순서대로 자동 배정)

## 기능

**분류** — 슬래시 계층(`math/number-theory`) · 상위 선택 시 하위 포함 ·
색은 최상위 단위로 배정되어 분류가 늘어나도 산만해지지 않음 ·
홈 현황 카드는 최상위만 표시하고 하위는 카드 안에 요약

**탐색** — 트리 사이드바(계층 펼침, 상태 유지, 분류색 점, 현재 글 위치 표시) ·
`Ctrl+K` 검색(↑↓ Enter) · 태그 클릭 필터 · 얇은 브레드크럼 헤더(스크롤 시 숨김) ·
우측 세로 진행 레일(클릭·드래그)

**글** — 여백주석(넓은 화면=여백 / 좁은 화면=바텀 시트) · 목차(현재 위치 표시) ·
읽는 시간 · 이전/다음 글 · 백링크 + 인용 그래프 자동 생성 ·
본문 인용 마크 → 자료정리집 연동 · 드래그 코멘트 → GitHub 이슈

**정리 환경** — `:::정리 제목` … `:::` · 종류별 자동 번호 ·
정리/보조정리/따름정리/명제/정의/예/참고/증명 (한글·영어 이름 모두) ·
증명은 상자 없이 `pf.` 로 시작해 끝에 ∎ ·
이름표는 `content.js` 의 `envLabels` 로 바꿀 수 있음

**코드·수식** — 줄번호 · 들여쓰기 가이드 · 언어 라벨 · 복사 · 긴 코드 접기 · KaTeX

**작성 도구** — 슬래시 메뉴(`/`) · 단축키(`Ctrl+B/I/K/1/2/3/E`) · 목록 자동 이어쓰기 ·
드래그하면 서식바 · 자주 쓴 태그 추천(빈도순) · 이미 올린 것 불러와 **수정** ·
편집/미리보기 드래그 분할 · 트리 접기(`Ctrl+\`) · 전체화면(`F9`)

**기타** — 인쇄 스타일 · 키보드 접근성 · `prefers-reduced-motion` 존중 ·
RSS · OG 썸네일 · sitemap / robots

## 로컬 미리보기

```
python -m http.server
```
→ <http://localhost:8000>
