# 세금 자동화 — 작은 가게를 위한 세금계산서·경비 정리 도구

혼자 가게를 운영하는 사장님이 세금계산서와 경비를 한곳에 모아 두고, 부가세를 얼마쯤 내야 하는지 미리 볼 수 있게 만든 웹 앱입니다.

## 누가, 어떤 불편을 겪나요

1인 사업자는 홈택스에서 받은 세금계산서, 카드로 쓴 경비, 부가세 신고 날짜를 따로따로 챙깁니다. 신고 때가 되면 엑셀을 열어 매출·매입을 다시 더하고, 이번 분기에 세금이 얼마나 나올지는 세무사에게 물어봐야 압니다. 이 앱은 그 정리를 화면 몇 개로 줄이려는 시도입니다.

## 바로 써 보기

**데모: https://yeomhojun1.github.io/tax-automation/**

- 로그인 화면의 **"데모 계정으로 바로 시작"** 버튼을 누르면 됩니다.
- 직접 입력하려면: 이메일 `demo@example.com` / 비밀번호 `demo1234`
- 데모는 실제 서버 없이 브라우저 안에서 가짜 데이터로 움직입니다. 가상의 빵집 "(가상) 하늘빵집"의 지난 1년여치 매출·매입·경비가 미리 들어 있고, 입력한 내용은 내 브라우저에만 저장됩니다. 화면 맨 위 "데이터 초기화"로 처음 상태로 돌릴 수 있습니다.

## 화면에서 할 수 있는 것

1. **대시보드** — 올해 매출·매입·경비 합계와 월별 그래프, 내야 할 부가세 예상액을 한 화면에서 봅니다.
2. **세금계산서 올리기** — 홈택스 전자세금계산서 XML 파일을 올리면 거래처·금액·품목을 읽어 매출/매입으로 나눠 저장합니다. 파일이 없으면 "샘플 올리기" 버튼으로 해 볼 수 있습니다. 같은 파일을 두 번 올리면 막아 줍니다.
3. **경비 기록** — 월세·전기요금 같은 경비를 항목별로 적고, 검색·수정·삭제하고, 엑셀에서 열리는 CSV로 내려받습니다.
4. **분기별 부가세 리포트** — 1~4분기마다 매출세액에서 매입세액을 뺀 예상 부가세를 보여 줍니다.
5. **신고 마감 알림** — 부가세 신고 마감 30일 전부터 화면 위에 남은 날짜를 띄웁니다.

## 만든 과정

AI 코딩 에이전트로 앱을 만든 뒤, 별도 에이전트에게 전체 기능 46개를 실제로 실행해 점검하게 했습니다([feature-test-report.md](feature-test-report.md)). 이때 "거래 상대방이 같은 세금계산서를 올리면 서버 오류" 같은 버그 12건이 나왔습니다.
그 12건과 문서 불일치를 고치고 단위 테스트 21개를 추가해 다시 검증했습니다([fix-report.md](fix-report.md)). 이 데모 모드도 같은 방식으로 만든 뒤 브라우저 자동 클릭으로 주요 흐름을 확인했습니다.

---

> 아래는 개발자용 설명입니다.
>
> **데모 모드 빌드**: `cd frontend && npm run build:demo` (또는 환경변수 `VITE_DEMO=true`로 `npm run build`). axios 요청을 `frontend/src/demo/mockAdapter.ts`가 브라우저 안에서 처리하고 데이터는 localStorage에 저장합니다. 이 값이 없으면 기존처럼 실제 백엔드를 호출하며, 데모 코드는 번들에 포함되지 않습니다. `master`에 push하면 `.github/workflows/pages.yml`이 데모 빌드를 GitHub Pages에 배포합니다.

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
