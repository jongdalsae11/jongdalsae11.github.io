/* ============================================================
   content.js — 사이트의 모든 콘텐츠 목록
   ★ 평소에 고치는 파일은 여기 하나입니다.
     글/자료/문제/연구를 여기에 추가하면
     왼쪽 트리 · 목록 페이지 · 홈 대시보드 · 활동 잔디가
     전부 자동으로 갱신됩니다. (카테고리도 자동 생성)
   ============================================================ */

window.SITE = {

  /* 분류 이름표.
     분류는 슬래시로 계층을 만듭니다.  예) 'math/number-theory'
     상위·하위 모두 여기에 이름을 적어 주세요.
     (적지 않으면 영문 id 가 그대로 보이고 콘솔에 알려 줍니다)   */
  labels: {
    math: '수학',
    'math/number-theory': '정수론',
    'math/analysis': '해석학',

    algo: '알고리즘',
    'algo/data-structure': '자료구조',
    'algo/graph': '그래프',

    essay: '에세이',
    'essay/guide': '기록·사용법',

    'math/combinatorics': '조합론',
    misc: '잡다한 것'
  },

  /* 분류별 강조색 (선택).
     적지 않으면 등장 순서대로 자동 배정됩니다.
     특정 분류의 색만 바꾸고 싶을 때 한 줄 추가하세요.
     예) colors: { math: '#34d399' }                          */
  colors: {},

  /* ── 글 ────────────────────────────────────────────
     category 에 새 값을 쓰면 트리에 새 항목이 자동 생성됩니다.
     category 는 슬래시로 계층을 만들 수 있습니다 ('algo/graph')
     file:   posts/ 안의 파일명
     pinned: 홈 상단 고정 여부
     links:  이 글이 인용한 다른 글의 file 목록.
             적어 두면 글 하단의 백링크 두 목록과 인용 관계
             그래프가 자동으로 만들어집니다. (양쪽 다 자동)     */
  /* 파일명을 만들 때 쓰는 한국어 → 영어 낱말집.
     흔한 수학·알고리즘·물리 용어는 이미 util.js 에 들어 있고,
     여기에 적은 것이 우선합니다. 없는 말은 로마자로 떨어지므로
     자주 쓰는 내 용어를 여기 추가해 두면 파일명이 깔끔해집니다.
       예)  '편미분': 'partial-derivative',  '종달새': 'skylark'      */
  terms: {
  },

  /* 정리 환경(:::정리 … :::)의 화면 이름표.
     여기 적은 것이 기본값을 덮어씁니다. 예를 들어 전부 영어로 쓰고 싶다면
       envLabels: { thm: 'Theorem', lem: 'Lemma', def: 'Definition' }
     기본값 — thm 정리 · lem 보조정리 · cor 따름정리 · prop 명제
              def 정의 · ex 예 · rem 참고 · proof pf                    */
  envLabels: {
  },

  /* ── 흐름 ──────────────────────────────────────────
     읽는 순서를 정한 글 목록입니다. 분류를 가로질러도 됩니다.
     그래프 화면(graph.html)에서 주황색 굵은 선으로 그려지며,
     그 화면의 «흐름 편집» 으로 노드를 순서대로 눌러 만들 수도 있습니다.
       { id: 'analysis', label: '해석학 기초',
         posts: ['먼저.html', '다음.html', '마지막.html'] }          */
  flows: [
    { id: 'analysis-basics',
      label: '해석학의 기초',
      posts: ['2026-08-23-sequence-limit.html', '2026-08-23-cauchy-sequence.html'] }
  ],

  posts: [
    { title: '실수체 $\R$의 완비성',
      file: '2026-08-31-completeness-of-the-real-numbers.html',
      category: 'math/analysis',
      date: '2026-08-31',
      tags: ['수열', '실수'],
      links: ['2026-08-23-cauchy-sequence.html'],
      summary: '완비성 공리를 통한 실수체의 완비를 다룬다.' },

    { title: '코시 열',
      file: '2026-08-23-cauchy-sequence.html',
      category: 'math/analysis',
      date: '2026-08-23',
      tags: ['수열', '극한'],
      links: ['2026-08-23-sequence-limit.html'],
      summary: '항들 사이의 거리를 이용한 수열의 수렴성' },

    { title: '수열의 극한',
      file: '2026-08-23-sequence-limit.html',
      category: 'math/analysis',
      date: '2026-08-23',
      tags: ['극한', '수열'],
      summary: '수열의 극한의 엄밀한 정의를 다룬다' },

    { title: '이 사이트에 글 쓰는 법 — 기능 전부 설명',
      file: '2026-08-17-writing-guide.html', category: 'essay/guide',
      date: '2026-08-17', tags: ['가이드', '사용법'], pinned: true,
      links: [],
      summary: '코드블록·수식·이미지·여백주석·인용까지, 이 사이트의 모든 기능을 예제와 함께 정리한 글.' }
  ],

  /* ── 자료정리집 ────────────────────────────────────
     외부 교재·논문·링크 보관소. category 를 새로 쓰면
     트리에 그 카테고리 인덱스가 자동으로 생깁니다.
     ref: 본문에서 인용할 때 쓰는 고유 태그                    */
  library: [
    { ref: 'Ref-A02', title: 'Efficient Range Minimum Queries',
      author: 'Bender, Farach-Colton', year: 2000, fmt: 'LINK', category: 'algo/data-structure', url: 'https://dl.acm.org/doi/10.5555/646388.690192',
      desc: 'RMQ와 LCA의 상호 환원을 다룬 고전 논문.',
      tags: ['RMQ', '논문'] }
  ],

  /* ── 직접 만든 문제 ────────────────────────────────
     diff: easy | mid | hard                                  */
  problems: [
  ],

  /* ── 연구·프로젝트 ─────────────────────────────────
     post: 이 항목과 연결할 글의 file (선택)                  */
  research: [
  ],

  /* 홈 대시보드 '현재 탐구 중' 한 줄 */
  now: '해석학을 처음부터 다시 쌓는 중 — 배운 것을 문제 풀이에 써먹어 보려고'
};
