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
- Node.js 18+ (20 LTS 이상 권장)
- PostgreSQL 16 (로컬 설치, 기본 포트 5432)
- MinIO (선택) — XML 원본 파일 저장용. 없어도 서버는 뜨고 업로드만 실패합니다.

### 1) 데이터베이스 준비 (네이티브 PostgreSQL)

PostgreSQL 16을 설치한 뒤 `taxdb` 데이터베이스를 만듭니다. 테이블은 `synchronize: true`(비프로덕션)로 서버 기동 시 자동 생성됩니다.

```bash
# psql 로 접속해서 DB 생성 (Windows: SQL Shell 또는 psql -U postgres)
psql -U postgres -c "CREATE DATABASE taxdb;"
```

### 2) 환경변수 설정

```bash
# backend/.env
cp backend/.env.example backend/.env
```

```env
DATABASE_URL=postgresql://postgres:<비밀번호>@localhost:5432/taxdb
JWT_SECRET=your-secret-key-32-chars-minimum
ALLOWED_ORIGINS=http://localhost:3002
PORT=4002
```

```bash
# frontend/.env
cp frontend/.env.example frontend/.env
```

```env
VITE_API_URL=http://localhost:4002
```

> `VITE_API_URL`이 없으면 프론트는 `http://localhost:4002`로 폴백하고 콘솔에 경고만 남깁니다(흰 화면이 되지 않음).

### 3) 실행

```bash
# 백엔드 (터미널 1)
cd backend
npm install
npm run start:dev      # http://localhost:4002

# 프론트엔드 (터미널 2)
cd frontend
npm install
npm run dev            # http://localhost:3002
```

| 서비스 | URL |
|--------|-----|
| 프론트엔드 | http://localhost:3002 |
| 백엔드 API | http://localhost:4002 |
| Swagger 문서 | http://localhost:4002/api/docs |
| PostgreSQL | localhost:5432 (DB: `taxdb`) |

### 4) 파일 저장소(MinIO, 선택)

XML 원본 보관에만 쓰입니다. 없으면 서버는 정상 기동하고 `POST /api/v1/tax-invoices/upload`만 실패합니다.

```bash
# min.io 에서 minio.exe 를 받아 실행 (기본값: localhost:9000 / minioadmin)
minio.exe server C:\minio-data --console-address ":9001"
```

> Docker를 쓰는 환경이라면 `docker compose up -d` 로 postgres(5433)·minio(9000)만 띄울 수도 있습니다. 이때는 `.env`의 포트를 5433으로 바꿔야 합니다. 저장소에는 백엔드·프론트엔드용 compose 서비스가 없습니다.

### 테스트

```bash
cd backend
npm test               # 빌드 후 세무 계산·XML 파서·DTO 검증 단위 테스트 (DB 불필요)
```

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
GET    /api/v1/tax-invoices/summary 분기 부가세 요약 (?year&quarter)
DELETE /api/v1/tax-invoices/:id    삭제

GET    /api/v1/expenses            경비 목록 (필터·검색)
POST   /api/v1/expenses            경비 등록
PATCH  /api/v1/expenses/:id        경비 수정
DELETE /api/v1/expenses/:id        경비 삭제

GET    /api/v1/dashboard/summary   대시보드 통계
```

---

## 스키마 변경 주의 (기존 DB가 있는 경우)

`tax_invoices.invoiceNumber`의 제약이 **전역 유니크 → `(userId, invoiceNumber)` 복합 유니크**로 바뀌었고 길이도 `varchar(24) → varchar(64)`로 늘었습니다.
거래 상대방이 같은 세금계산서(같은 국세청 승인번호)를 올리면 500이 나던 문제를 고치기 위한 변경입니다.

- 새 DB라면 `synchronize: true`가 알아서 만들어 주므로 할 일이 없습니다.
- **이미 데이터가 있는 DB**라면 기존 전역 유니크 인덱스가 남아 있어 `synchronize`가 실패하거나, 반대로 새 복합 유니크를 만들 때 중복 행이 있으면 에러가 납니다. 아래로 정리한 뒤 기동하세요.

```sql
-- 1) 같은 사용자 안에서 중복된 승인번호가 있는지 확인
SELECT "userId", "invoiceNumber", COUNT(*)
FROM tax_invoices GROUP BY 1, 2 HAVING COUNT(*) > 1;

-- 2) 옛 전역 유니크 제약 제거 (이름은 \d tax_invoices 로 확인)
ALTER TABLE tax_invoices DROP CONSTRAINT IF EXISTS "UQ_tax_invoices_invoiceNumber";
```

---

## 라이선스

MIT
