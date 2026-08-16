/* ============================================================
   content.js — 사이트의 모든 콘텐츠 목록
   ★ 평소에 고치는 파일은 여기 하나입니다.
     글/자료/문제/연구를 여기에 추가하면
     왼쪽 트리 · 목록 페이지 · 홈 대시보드 · 활동 잔디가
     전부 자동으로 갱신됩니다. (카테고리도 자동 생성)
   ============================================================ */

window.SITE = {

  /* 카테고리 한글 이름표.
     여기에 없는 새 카테고리를 써도 동작합니다(이름표는 id 그대로 표시). */
  labels: {
    math: '수학',
    algo: '알고리즘',
    essay: '에세이',
    misc: '잡다한 것',
    physics: '물리'
  },

  /* ── 글 ────────────────────────────────────────────
     category 에 새 값을 쓰면 트리에 새 항목이 자동 생성됩니다.
     file: posts/ 안의 파일명 · pinned: 홈 상단 고정 여부      */
  posts: [
    { title: '이 사이트에 글 쓰는 법 — 기능 전부 설명',
      file: '2026-08-17-writing-guide.html', category: 'essay',
      date: '2026-08-17', tags: ['가이드', '사용법'], pinned: true,
      summary: '코드블록·수식·이미지·여백주석·인용까지, 이 사이트의 모든 기능을 예제와 함께 정리한 글.' },

    { title: '세그먼트 트리를 활용한 LIS O(N log N) 구현',
      file: '2026-08-17-lis-segment-tree.html', category: 'algo',
      date: '2026-08-17', tags: ['세그먼트 트리', 'C++'], pinned: true,
      summary: '값 좌표압축 위에 max 세그먼트 트리를 얹는 표준 구성.' },

    { title: '느리게 갱신되는 구간 트리 노트',
      file: '2026-08-12-lazy-propagation.html', category: 'algo',
      date: '2026-08-12', tags: ['세그먼트 트리', 'lazy'],
      summary: '구간 갱신을 미뤄 두는 아이디어를 짧게 정리한 더미 글.' },

    { title: '오일러 피 함수의 곱셈적 성질',
      file: '2026-08-10-euler-phi.html', category: 'math',
      date: '2026-08-10', tags: ['정수론'],
      summary: '서로소 조건에서 곱셈적임을 보이는 과정을 담은 더미 글.' },

    { title: '급수의 수렴 판정을 다시 보기',
      file: '2026-08-05-series-convergence.html', category: 'math',
      date: '2026-08-05', tags: ['해석학'],
      summary: '비판정법과 근판정법의 관계를 정리한 더미 글.' },

    { title: '첫 합주, 주말의 여백',
      file: '2026-08-01-first-ensemble.html', category: 'essay',
      date: '2026-08-01', tags: ['일상'],
      summary: '연습실에서의 하루를 적은 더미 에세이.' }
  ],

  /* ── 자료정리집 ────────────────────────────────────
     외부 교재·논문·링크 보관소. category 를 새로 쓰면
     트리에 그 카테고리 인덱스가 자동으로 생깁니다.
     ref: 본문에서 인용할 때 쓰는 고유 태그                    */
  library: [
    { ref: 'Ref-M01', title: 'Concrete Mathematics', author: 'Graham, Knuth, Patashnik',
      year: 1994, fmt: 'PDF', category: 'math', url: '#',
      desc: '점화식과 합 계산의 표준 레퍼런스. 생성함수 파트를 자주 들춰봅니다.',
      tags: ['조합론', '생성함수'] },

    { ref: 'Ref-M02', title: 'A Classical Introduction to Modern Number Theory',
      author: 'Ireland, Rosen', year: 1990, fmt: 'PDF', category: 'math', url: '#',
      desc: '정수론 글을 쓸 때 정의와 표기를 맞추는 기준으로 삼는 책.',
      tags: ['정수론'] },

    { ref: 'Ref-A01', title: 'Competitive Programmer’s Handbook',
      author: 'Antti Laaksonen', year: 2018, fmt: 'PDF', category: 'algo', url: '#',
      desc: '자료구조 챕터 구성이 깔끔해서 글의 목차를 짤 때 참고합니다.',
      tags: ['CP', '자료구조'] },

    { ref: 'Ref-A02', title: 'Efficient Range Minimum Queries',
      author: 'Bender, Farach-Colton', year: 2000, fmt: 'LINK', category: 'algo', url: '#',
      desc: 'RMQ와 LCA의 상호 환원을 다룬 고전 논문.',
      tags: ['RMQ', '논문'] },

    { ref: 'Ref-P01', title: 'Classical Mechanics', author: 'Goldstein',
      year: 2001, fmt: 'PDF', category: 'physics', url: '#',
      desc: '라그랑지안 표기를 확인할 때 펼치는 책. (새 카테고리 자동 생성 예시)',
      tags: ['역학'] },

    { ref: 'Ref-P02', title: '편심 도르래 장력 해석 노트', author: '직접 정리',
      year: 2026, fmt: 'PDF', category: 'physics', url: '#',
      desc: '회전각에 따른 장력 변화를 계산한 개인 노트.',
      tags: ['역학', '설계'] },

    { ref: 'Ref-X01', title: 'The Visual Display of Quantitative Information',
      author: 'Edward Tufte', year: 2001, fmt: 'PDF', category: 'misc', url: '#',
      desc: '여백주석과 도표 배치의 원칙을 여기서 가져왔습니다.',
      tags: ['시각화', '디자인'] },

    { ref: 'Ref-X02', title: 'KaTeX 지원 함수 목록', author: 'KaTeX',
      year: 2024, fmt: 'LINK', category: 'misc', url: 'https://katex.org/docs/supported',
      desc: '수식을 쓸 때 지원되는 명령을 확인하는 용도.',
      tags: ['레퍼런스'] }
  ],

  /* ── 직접 만든 문제 ────────────────────────────────
     diff: easy | mid | hard                                  */
  problems: [
    { title: '증가하는 부분 수열과 쿼리', date: '2026-08-14', diff: 'hard',
      tags: ['세그먼트 트리'], url: '#',
      note: '지하철에서 떠오른 아이디어. LIS에 쿼리를 얹으면 어디까지 어려워지는지 궁금했습니다.' },

    { title: '두 갈래 길의 최소 비용', date: '2026-08-03', diff: 'mid',
      tags: ['그래프', 'DP'], url: '#',
      note: '조건을 세 번 비틀고 나서야 의도한 풀이만 남았습니다.' }
  ],

  /* ── 연구·프로젝트 ─────────────────────────────────
     post: 이 항목과 연결할 글의 file (선택)                  */
  research: [
    { title: '편심 도르래를 이용한 가변 저항 운동기구',
      kind: 'ONGOING', year: 2026,
      desc: '회전각에 따라 장력이 변하는 구조를 설계하고 실측값과 비교하는 중.',
      tags: ['역학', '설계'], url: '#', post: null },

    { title: '구간 쿼리 자료구조 비교 노트',
      kind: 'PROJECT', year: 2025,
      desc: '세그먼트 트리·펜윅·스파스 테이블의 실측 성능을 정리한 프로젝트.',
      tags: ['알고리즘'], url: '#', post: '2026-08-17-lis-segment-tree.html' }
  ],

  /* 홈 대시보드 '현재 탐구 중' 한 줄 */
  now: '세그먼트 트리 최적화와 에세이 한 편을 번갈아 다루는 중'
};
