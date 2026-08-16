# 개인 아카이브 사이트

VSCode 다크 테마 기반 개인 아카이브. `https://jongdalsae11.github.io`

## 파일 구조

```
/
├── index.html        홈 (대시보드: 현재 탐구 중 · 고정 글 · 최근 글 · 활동 잔디)
├── about.html        이력 (활동/수상 표)
├── research.html     연구·프로젝트 (카드)
├── archive.html      문제 아카이브 (문제집 스타일 + 난이도 필터)
├── library.html      자료정리집 (레퍼런스 라이브러리, [Ref-xx] 인용 태그 복사)
├── contact.html      연락처
├── write.html        글쓰기 도구 (메뉴에 없음 — /write.html 로 직접 접속)
├── 404.html          404 (컴파일러 에러 컨셉)
├── posts/
│   ├── math.html     글 목록 · 수학
│   ├── algo.html     글 목록 · 알고리즘
│   ├── essay.html    글 목록 · 에세이
│   └── 2026-08-17-lis-segment-tree.html   샘플 글 (여백주석/백링크/인용그래프 데모)
└── assets/
    ├── css/
    │   ├── base.css        디자인 토큰(:root) · 타이포 · 링크 · 스크롤바
    │   ├── layout.css      헤더 · 사이드바 트리 · 그리드 · 진행 레일 · 모바일
    │   ├── components.css  목록 · 태그 · 카드 · 코드블록 · 문제집 · 라이브러리
    │   └── post.css        글 본문 · 여백주석 · 백링크 · 인용 그래프
    ├── js/
    │   ├── nav.js          사이드바 트리 (메뉴 수정은 여기 NODES 배열)
    │   ├── progress.js     우측 세로 읽기 진행 레일
    │   ├── code.js         코드블록: 줄번호 · 복사 · 접기 · 하이라이팅
    │   ├── post.js         여백주석 배치 · 인용 그래프 렌더
    │   └── write.js        글쓰기 도구 로직
    ├── img/                글에 쓰는 이미지
    └── favicon.svg
```

## 자주 하는 일

- **이름/메뉴 바꾸기** → `assets/js/nav.js` 맨 위 `SITE_NAME`, `NODES`
- **색 바꾸기** → `assets/css/base.css` 맨 위 `:root` (팔레트: bg `#0a0a14` · surface `#141423` · text `#e4e4ed` · line `#3a3a52` · cyan `#38bdf8` · purple `#a855f7` · orange `#f97316`)
- **글 쓰기** → `/write.html` 접속 → 작성 → HTML 내보내기 → 받은 파일을 `posts/`에 넣고 목록 페이지(`posts/*.html`)와 홈 최근 글에 항목 추가
- **여백주석** → 본문에서 `^[내용]`, 글 연결은 `[[글 제목]]`
- **OG 썸네일** → 홈 화면을 캡처해서 `assets/og.png`로 저장하면 링크 공유 미리보기에 적용됨

## 로컬 미리보기

폴더에서 `python -m http.server` 실행 후 `http://localhost:8000` 접속.
(파일 더블클릭으로도 대부분 동작하지만 404 페이지는 서버 환경 기준)

## 배포

```
git add -A
git commit -m "메시지"
git push
```
