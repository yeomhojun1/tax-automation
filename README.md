# 세금 자동화 — 소상공인 세금계산서 & 경비처리 플랫폼

1인 사업자를 위한 세금계산서 관리와 경비처리 자동화 SaaS입니다.  
홈택스 XML 세금계산서 업로드, 경비 등록, 부가세 신고 D-day 알림까지 한 곳에서 처리합니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 세금계산서 관리 | 홈택스 XML 업로드 / 수동 등록 / 매출·매입 분류 |
| 경비 관리 | 카테고리별 경비 등록·수정·삭제 / 키워드 검색 |
| 대시보드 | 분기별 매출·매입·경비 현황 한눈에 확인 |
| 부가세 D-day 알림 | 신고 마감 30일 전부터 배너 표시 (일반·간이과세자 구분) |
| CSV 내보내기 | 경비·세금계산서 데이터 엑셀 호환 CSV 다운로드 |
| 비밀번호 변경 | 프로필 페이지에서 안전하게 변경 |

---

## 기술 스택

### Frontend
![React](https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-000000?style=flat-square)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-FF4154?style=flat-square&logo=reactquery&logoColor=white)

### Backend
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-000000?style=flat-square&logo=fastify&logoColor=white)
![TypeORM](https://img.shields.io/badge/TypeORM-FE0803?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)

### Infra
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

---

## 프로젝트 구조

```
tax-app/
├── backend/
│   └── src/
│       ├── auth/           # JWT 인증, 로그인/회원가입, 비밀번호 변경
│       ├── expenses/       # 경비 CRUD, 키워드 검색
│       ├── tax-invoices/   # 세금계산서 업로드·파싱·수동 등록
│       ├── dashboard/      # 분기별 통계 집계
│       └── common/         # 가드, 인터셉터, 필터
├── frontend/
│   └── src/
│       ├── pages/          # 라우팅 단위 페이지
│       ├── components/     # 재사용 컴포넌트
│       ├── api/            # axios 클라이언트 & API 함수
│       ├── store/          # Zustand 전역 상태
│       ├── utils/          # CSV 내보내기 등 유틸
│       └── types/          # 공유 TypeScript 타입
└── docker-compose.yml
```

---

## 시작하기

### 요구사항
- Docker & Docker Compose
- Node.js 18+

### 환경변수 설정

```bash
# backend/.env
cp backend/.env.example backend/.env
```

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/taxdb
JWT_SECRET=your-secret-key-32-chars-minimum
ALLOWED_ORIGINS=http://localhost:3001
PORT=3000
```

```bash
# frontend/.env
cp frontend/.env.example frontend/.env
```

```env
VITE_API_URL=http://localhost:3000
```

### 실행

```bash
# 전체 실행 (DB + 백엔드 + 프론트엔드)
docker compose up --build

# DB 초기화 후 재실행
docker compose down -v && docker compose up --build
```

| 서비스 | URL |
|--------|-----|
| 프론트엔드 | http://localhost:3001 |
| 백엔드 API | http://localhost:3000 |
| Swagger 문서 | http://localhost:3000/api/docs |
| PostgreSQL | localhost:5433 |

---

## 스크린샷

> 대시보드, 세금계산서, 경비관리 화면

| 대시보드 | 세금계산서 | 경비관리 |
|---------|-----------|---------|
| 분기별 매출·매입 통계 | XML 업로드 & 수동 등록 | 카테고리·키워드 필터 |

---

## API 엔드포인트

```
POST   /api/v1/auth/register       회원가입
POST   /api/v1/auth/login          로그인
GET    /api/v1/auth/me             내 정보
PATCH  /api/v1/auth/me             프로필 수정
PATCH  /api/v1/auth/password       비밀번호 변경

GET    /api/v1/tax-invoices        세금계산서 목록
POST   /api/v1/tax-invoices        수동 등록
POST   /api/v1/tax-invoices/upload XML 업로드
DELETE /api/v1/tax-invoices/:id    삭제

GET    /api/v1/expenses            경비 목록 (필터·검색)
POST   /api/v1/expenses            경비 등록
PATCH  /api/v1/expenses/:id        경비 수정
DELETE /api/v1/expenses/:id        경비 삭제

GET    /api/v1/dashboard/summary   대시보드 통계
```

---

## 라이선스

MIT
