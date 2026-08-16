# 개인 아카이브 사이트

VSCode 다크 테마 기반 개인 아카이브. `https://jongdalsae11.github.io`

> **평소에 고치는 파일은 `assets/data/content.js` 하나입니다.**
> 글·자료·문제·연구를 여기에 등록하면 왼쪽 트리, 목록 페이지, 홈 대시보드,
> 활동 잔디, 검색이 전부 자동으로 갱신됩니다. 카테고리도 자동 생성됩니다.
>
> 자세한 사용법은 사이트의 **[이 사이트에 글 쓰는 법]** 글에 전부 정리해 두었습니다.
> (`posts/2026-08-17-writing-guide.html`)

## 파일 구조

```
/
├── index.html      홈 대시보드 (현재 탐구 중 · 고정 글 · 최근 글 · 활동 잔디)
├── about.html      이력
├── research.html   연구·프로젝트 (데이터 기반 카드)
├── posts.html      글 목록 — #math, #algo, #essay … 해시로 분류
├── archive.html    문제 아카이브 (문제집 스타일 + 난이도 필터)
├── library.html    자료정리집 — #math, #algo, #physics … 해시로 분류
├── contact.html    연락처
├── write.html      글쓰기 도구 (메뉴에 없음 · 주소 직접 입력)
├── 404.html
├── posts/          글 HTML 파일들
└── assets/
    ├── data/content.js   ★ 모든 콘텐츠 목록 (이 파일만 고치면 됨)
    ├── css/  base · layout · components · post
    ├── js/   nav · lists · heatmap · progress · code · post · write
    ├── img/  글에 쓰는 이미지
    └── files/  자료정리집 PDF 등
```

## 빠른 참조

| 하고 싶은 것 | 고칠 곳 |
|---|---|
| 글·자료·문제·연구 추가 | `assets/data/content.js` |
| 새 카테고리 만들기 | `content.js`에서 `category`에 새 값 입력 (자동 생성) |
| 카테고리 한글 이름 | `content.js`의 `labels` |
| 이름 바꾸기 | `assets/js/nav.js`의 `SITE_NAME` |
| 색 바꾸기 | `assets/css/base.css`의 `:root` |
| 글 작성 | `/write.html` → HTML 내보내기 → `posts/`에 넣고 `content.js` 등록 |

**팔레트** — bg `#0a0a14` · surface `#141423` · text `#e4e4ed` · line `#3a3a52`
· cyan `#38bdf8`(상호작용) · purple `#a855f7`(분류·보조) · orange `#f97316`(1% 강조)

## 기능

트리 사이드바(펼침 상태 유지) · `Ctrl+K` 검색 · 얇은 브레드크럼 헤더(스크롤 시 숨김)
· 우측 세로 진행 레일 · 여백주석(넓은 화면 = 여백 / 좁은 화면 = 바텀 시트)
· 본문 인용 마크 → 자료정리집 자동 연동 · 백링크 + 인용 그래프
· 코드블록(줄번호·들여쓰기 가이드·복사·긴 코드 접기) · KaTeX 수식
· 드래그 코멘트 → GitHub 이슈 · 모바일 블러 드로어

## 로컬 미리보기

```
python -m http.server
```
→ `http://localhost:8000`

## 배포

```
git add -A
git commit -m "메시지"
git push
```
