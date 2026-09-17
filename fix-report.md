# tax-automation 버그 수정 보고 (2026-09-17)

> 5개 프로젝트 전체 현황: https://claude.ai/artifact/PvWqAcbkvtL8VSNHZhL48e

## 한 줄 요약
feature-test-report.md의 B1~B12 전부와 문서·설정 불일치(13~15번), 단위 테스트 부재(16번)까지 수정 완료. 백엔드/프론트 빌드 통과, 새 단위 테스트 21개 통과, 인메모리 하네스 33개 체크 전부 통과(핵심: **사용자 A 업로드 → 사용자 B가 같은 XML 업로드가 이제 201 PURCHASE로 정상 처리**). 커밋하지 않고 working tree에만 남겨 두었습니다(21개 수정 + 5개 신규, `git status`로 확인 가능). Node 24 / PostgreSQL이 아직 설치되지 않아(확인 시점 `node v18.20.8`, 5432 닫힘) **실제 DB 기동 검증만 보류**입니다.

---

## 1. 고친 항목

### B2 — 거래 상대방이 같은 세금계산서를 올리면 500 (가장 중요)
| 파일:라인 | 내용 |
|---|---|
| `backend/src/tax-invoices/entities/tax-invoice.entity.ts:25` | `@Index('UQ_tax_invoices_user_invoice_number', ['userId', 'invoiceNumber'], { unique: true })` 추가 |
| `backend/src/tax-invoices/entities/tax-invoice.entity.ts:33` | 컬럼에서 `unique: true` 제거 (`@Column({ type: 'varchar', length: 64 })`) |

- 중복 검사 쿼리(`tax-invoices.service.ts:51` `findOne({ where: { invoiceNumber, userId } })`)와 DB 제약이 이제 정확히 같은 키를 씁니다.
- 검증: 하네스에서 A(판매자) 업로드 201 SALES → B(구매자)가 **같은 XML** 업로드 201 PURCHASE(상대방 상호 '판매자상사') → A가 다시 올리면 400 "이미 등록된 세금계산서입니다". 가짜 저장소도 복합 유니크로 제약을 바꿔 에뮬레이션했습니다.
- **기존 데이터 주의사항**은 README 새 섹션 "스키마 변경 주의 (기존 DB가 있는 경우)"에 적었습니다. 요지: 이미 데이터가 있는 DB는 옛 전역 유니크 인덱스가 남아 `synchronize`가 실패할 수 있고, `(userId, invoiceNumber)` 중복 행이 있으면 새 인덱스 생성이 실패합니다. 확인 SQL과 `DROP CONSTRAINT` 예시 포함.

### B3 — 중복/파싱 실패 시 고아 파일
| 파일:라인 | 내용 |
|---|---|
| `backend/src/tax-invoices/tax-invoices.service.ts:44~59` | 순서를 `파싱 → 중복 검사 → 파일 저장`으로 변경(기존: 저장 → 파싱 → 중복 검사) |

- 검증: 중복 업로드/날짜 오류 XML/`.txt` 업로드 모두 400이면서 가짜 스토리지 파일 수가 그대로였습니다.

### B1 — 수동 등록 `issueDate` 미검증 → 500
- `backend/src/tax-invoices/dtos/create-invoice.dto.ts:24` `@IsString()` → `@IsDateString()` (+ 2행 import 추가)
- 검증: `issueDate:"abc"` → 400(`issueDate must be a valid ISO 8601 date string`), 정상 값 → 201.

### B4 — 회원가입 `businessNumber` 길이 미검증
- `backend/src/auth/dtos/register.dto.ts:22` `@MaxLength(20)` 추가
- 검증: 21자 → 400, `123-45-67890` → 201.

### B5 — `quarter` 범위 미검증
| 파일:라인 | 내용 |
|---|---|
| `backend/src/tax-invoices/dtos/invoice-query.dto.ts` (신규) | `InvoiceSummaryQueryDto`: `year` `@IsInt() @Min(2000) @Max(2100)`, `quarter` `@IsInt() @Min(1) @Max(4)` (`@Type(() => Number)`) |
| `backend/src/tax-invoices/tax-invoices.controller.ts:79~84` | `@Query('year'/'quarter', ParseIntPipe)` → `@Query() query: InvoiceSummaryQueryDto` |
| `backend/src/tax-invoices/tax-invoices.service.ts:180~190` | `getQuarterMonths`가 조용히 1분기로 떨어지지 않고 400을 던지도록 |

- 검증: `quarter=7` → 400, `quarter=0` → 400, `year=abc` → 400, `year` 누락 → 400, `quarter=1` → 200.

### B6 — XML 파서 (네임스페이스 / 콤마 금액 / 날짜)
| 파일:라인 | 내용 |
|---|---|
| `backend/src/tax-invoices/parsers/xml-parser.service.ts:38` | `removeNSPrefix: true` — `<tax:TaxInvoice>` 같은 접두사 네임스페이스 지원 |
| 같은 파일 `:145~156` | `parseAmount()` 신설: 콤마 제거 후 숫자 변환, 숫자가 아니면 400(기존에는 NaN이 DB까지 가서 500) |
| 같은 파일 `:114~122, :133~140` | 헤더 공급가액/세액·품목 수량/단가/공급가액/세액을 전부 `parseAmount`로 |
| 같은 파일 `:158~178` | `parseIssueDate()`: 값이 없거나 `20251345`처럼 실존하지 않는 날짜면 **오늘 날짜로 대체하지 않고 400** |
| 같은 파일 `:97~100` | 승인번호(`ExchangedDocument/ID`)가 비면 400 (빈 문자열끼리 중복 판정되는 문제 예방) |

- 검증: 단위 테스트 9종 + 하네스(접두사 XML 201, `1,000,000` → 1000000, 잘못된 날짜 400).

### B7 — 삭제 시 MinIO 원본 미삭제
- `backend/src/tax-invoices/tax-invoices.service.ts:166~175`: 삭제 후 `rawFileKey`가 있으면 `storageService.deleteFile()` 호출, 실패해도 `logger.warn`만 남기고 삭제 자체는 성공(MinIO 미설치 환경 대비).
- 검증: 하네스에서 DELETE 204 + 가짜 스토리지 `deleted`에 해당 key 기록 확인.

### B8 — 업로드 예외 포맷 통일
- `backend/src/tax-invoices/tax-invoices.controller.ts:44~57`: multipart 아님 → `BadRequestException`, `request.file()` 예외 → `BadRequestException`, 파일 파트 없음 → `throw new Error`(500) 대신 `BadRequestException`.
- 검증: JSON 요청 → 400(`{message, statusCode:400, timestamp}` 전역 필터 포맷), 파일 없는 multipart → 400.

### B9 — 응답 봉투 `statusCode` 상수 200
- `backend/src/common/interceptors/response.interceptor.ts:21, 32~44`: `@HttpCode()` 메타데이터를 읽고, 없으면 POST는 201·그 외 200을 넣습니다.
- 검증: 회원가입/업로드/수동등록 → `statusCode:201`, GET → 200.

### B10 — 수동 등록 번호 길이 오버플로
- `backend/src/tax-invoices/entities/tax-invoice.entity.ts:33`: `varchar(24)` → `varchar(64)` (번호 생성 방식은 유지. `MANUAL-<userId>-<13자리 ms>`는 최대 25~30자라 여유 있음)
- 검증: 하네스에서 생성된 번호 길이 ≤ 64, 가짜 저장소도 64자 제약으로 에뮬레이션.

### B11 — 쿼리 파라미터 무검증(enum 500 위험)
| 파일 | 내용 |
|---|---|
| `backend/src/expenses/dtos/expense-query.dto.ts` (신규) | `category` enum, `year` 2000~2100, `month` 1~12, `search` ≤100자 |
| `backend/src/expenses/expenses.controller.ts:33~45` | 개별 `@Query(...)` + `parseInt` → `@Query() query: ExpenseQueryDto` |
| `backend/src/tax-invoices/dtos/invoice-query.dto.ts` (신규) | `InvoiceListQueryDto`: `direction` enum, `startDate`/`endDate` `@IsDateString()` |
| `backend/src/tax-invoices/tax-invoices.controller.ts:68~77` | 목록 조회도 DTO로 |

- 검증: `category=FOOD`/`direction=XXX`/`year=abc`/`month=13` 전부 400. 하네스의 가짜 저장소에 "enum에 없는 값이면 pg 오류" 로직을 넣어, 검증이 없으면 500이 났을 경로임을 확인했습니다. 정상 필터 조합은 200.

### B12 + 포트 — 프론트 오류 문구·환경변수
| 파일:라인 | 내용 |
|---|---|
| `frontend/src/config/env.ts:1~14` | `VITE_API_URL` 없으면 throw(흰 화면) → 기본값 `http://localhost:4002` 폴백 + `console.warn` |
| `frontend/src/utils/errorMessage.ts` (신규) | `getErrorMessage()`: 네트워크 오류(응답 없음) / 401 인증 실패 / 400·409 검증·중복(서버 메시지 우선) / 기타로 구분 |
| `frontend/src/pages/LoginPage.tsx:22`, `RegisterPage.tsx:25`, `ProfilePage.tsx:30·43`, `ExpensesPage.tsx:58`, `components/invoice/InvoiceUpload.tsx:25` | 고정 문구 → `getErrorMessage(error, 폴백)` |
| `frontend/src/api/client.ts:5·26~28` | **추가 발견 버그**: 로그인/회원가입 요청의 401도 인터셉터가 `location.href='/login'`으로 잡아 페이지를 새로고침 → 오류 문구가 보이지도 않고 사라졌습니다. 이 두 경로는 자동 로그아웃 대상에서 제외 |
| `frontend/.env.example` | `VITE_API_URL=http://localhost:4002` + 설명 주석으로 재작성 |
| `frontend/.env.local` | 삭제(사용자가 임시로 만든 3400 지정 파일) |
| `frontend/vite.config.ts:14` | dev 서버 포트 3001 → 3002 (실제 운용 포트와 일치) |

- 백엔드가 꺼져 있으면 이제 "서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해 주세요", 비밀번호가 틀리면 서버 메시지("이메일 또는 비밀번호가 올바르지 않습니다"), 검증 실패는 서버의 상세 메시지가 그대로 보입니다.

### 13 — 백엔드 .env.example
- `backend/.env.example`: `PORT=4002`, `ALLOWED_ORIGINS=http://localhost:3002`, `DATABASE_URL=...@localhost:5432/taxdb`
- `backend/src/config/configuration.ts:2·22`: 기본값도 4002 / `http://localhost:3002`로 맞춰 `.env` 없이 떠도 프론트와 연결되게.

### 14 — 문서 불일치(README)
- 실행 절차를 **Docker 없이 네이티브 PostgreSQL** 기준으로 재작성: DB 생성 → .env 설정 → `npm run start:dev`(4002) / `npm run dev`(3002) → MinIO(선택, `minio.exe`) → 테스트.
- 요구사항에서 Docker 필수 제거(Docker compose는 "postgres·minio만 있는 선택지"로 각주 처리), DB명 `taxdb`로 통일, 서비스 표 포트 갱신.
- API 목록에 `GET /api/v1/tax-invoices/summary` 추가.
- "스키마 변경 주의" 섹션 신설(B2 마이그레이션).

### 15 — `@nestjs/mapped-types`
- `backend/package.json:19`에 `"@nestjs/mapped-types": "^2.0.5"` 명시적 의존성 추가(현재 node_modules에 2.0.5가 이미 설치돼 있어 `npm install` 없이도 빌드·테스트 통과).

### 16 — 단위 테스트 추가 (DB 불필요, 총 21개)
| 파일 | 테스트 |
|---|---|
| `backend/test/xml-parser.test.js` | 9개 — 매출/매입 판별(하이픈 정규화 포함), 접두사 네임스페이스, 콤마 금액, 품목 태그 추출, 24자리 승인번호 정밀도 + UTC 자정 날짜, 잘못된 날짜 400, TypeCode 매핑, 루트/승인번호 누락 400 |
| `backend/test/vat-summary.test.js` | 5개 — 부가세 집계(매출세액−매입세액), 환급(음수), 4개 분기 시작·종료일 경계, 윤년 경계, 분기 범위 초과 400 |
| `backend/test/dto-validation.test.js` | 6개 — `CreateInvoiceDto.issueDate`, `RegisterDto.businessNumber` 20자, summary `year`/`quarter` 범위, `direction` enum + 날짜, 경비 `category`/`year`/`month`, 화이트리스트(알 수 없는 필드 거부) |
| `backend/test/helpers/invoice-xml.js` | KEC XML v3.0 테스트 XML 생성기(접두사·금액·품목·날짜 옵션) |

- 실행: `cd backend && npm test` (= `nest build && node --test test`). Node 18/24 내장 테스트 러너만 쓰므로 새 devDependency가 없습니다.

---

## 2. 검증 방법과 결과

| 검증 | 명령 | 결과 |
|---|---|---|
| 백엔드 빌드 | `cd backend && npm run build` | 통과(오류 0) |
| 프론트 타입체크+빌드 | `cd frontend && npm run build` (tsc && vite build) | 통과. 기존과 동일한 단일 청크 690kB 경고만 |
| 단위 테스트 | `cd backend && npm test` | **21/21 통과** |
| 인메모리 하네스(실제 HTTP) | `node <scratchpad>/harness2.js` (포트 4102) | **33/33 통과** |
| 실제 DB 기동(4002) | — | **검증 보류**(아래) |

하네스는 이전 테스트와 같은 방식입니다: `@nestjs/testing`으로 `AppModule`을 그대로 올리고 TypeORM `DataSource`만 인메모리 가짜(이번엔 **수정 후 제약**인 복합 유니크·varchar(64)·enum 오류를 에뮬레이션), `StorageService`만 가짜로 교체. 가드·파이프·인터셉터·필터·JWT·bcrypt·multipart·XML 파서는 실제 코드가 127.0.0.1:4102에서 실제 HTTP로 돌았습니다. 스크립트 위치:
`C:\Users\염호준\AppData\Local\Temp\claude\c--\f442cb73-ada7-4f7e-8189-7dc518e32c04\scratchpad\harness2.js`

하네스 주요 결과(발췌):
- `B2: 거래 상대방(B)이 같은 XML 업로드 -> 201 PURCHASE (기존 500)` PASS
- `B3: 중복 거부 시 고아 파일 없음` / `파싱 실패 시 고아 파일 없음` PASS
- `B1: 수동등록 issueDate="abc" -> 400 (기존 500)` PASS
- `B5: quarter=7 -> 400 (기존 200)` PASS
- `B8: 파일 파트 없음 -> 400 (기존 500)` PASS
- `B11: category=FOOD -> 400 (enum 500 방지)` PASS
- `B7: 삭제 시 MinIO 원본도 삭제` PASS

---

## 3. 검증 보류

- **실제 PostgreSQL 기동(4002 포트) + Swagger + 회원가입/로그인 E2E**: 작업 중 두 차례 확인했으나 `node -v`는 계속 `v18.20.8`, 5432 포트도 닫혀 있었습니다(Postgres 서비스 없음). 코드 수정만 마쳤습니다.
- 그래서 다음 항목들은 여전히 **DB 실동작 미확인**입니다: `synchronize`가 만드는 복합 유니크 인덱스의 실제 생성, `varchar(64)` 반영, pg enum 캐스팅, `date` 컬럼 비교(ILIKE·EXTRACT·BETWEEN), CASCADE 실제 동작.
- **MinIO 미설치**: 업로드 성공 경로는 여전히 실제로는 `putObject` 실패(ECONNREFUSED → 500)입니다. 요청하신 대로 "서버는 뜨고 업로드만 실패"를 유지했습니다. B7의 삭제 경로는 MinIO가 없어도 경고만 남고 진행됩니다.
- 브라우저 실사용 확인(로그인 화면 오류 문구가 실제로 네트워크/인증으로 갈리는지)은 백엔드 기동 후 눈으로 봐야 합니다.

---

## 4. 손대지 않은 것

- **결제/PDF 유령 기능**(`pdf-parse`, `TOSS_*`, `receiptFileKey`, `taxInvoiceId` FK 미검증) — 기능 자체가 미구현이라 이번 범위 밖.
- **스케줄 작업 0개**(`ScheduleModule.forRoot()`만 등록) — D-day 알림은 여전히 프론트 배너뿐.
- **간이과세자 부가세 산식**(업종별 부가가치율) — 대시보드는 과세유형과 무관하게 `매출세액−매입세액` 그대로.
- **`startDate`만 주면 기간 필터가 무시되는 동작** — 이번엔 값 형식(날짜인지)만 검증하고 의미 동작은 그대로 뒀습니다.
- **시간대**: 날짜를 UTC 자정 `Date`로 만들어 `date` 컬럼에 넣는 방식 유지(KST/UTC에서는 문제 없음).
- **마이그레이션 파일 미도입** — 여전히 `synchronize: NODE_ENV !== 'production'`.
- **프론트 단일 청크 690kB** 경고, recharts 코드 분할.
- `docker-compose.yml` 파일 자체(postgres·minio)는 그대로 두고 README에서 선택지로만 설명.
- `git add/commit/push`는 전혀 하지 않았습니다. `.run-frontend.log`와 `feature-test-report.md`도 untracked 그대로 뒀습니다.

---

## 5. 사용자가 직접 할 일

1. **PostgreSQL 16 설치 후 DB 생성**: `psql -U postgres -c "CREATE DATABASE taxdb;"`
2. **`backend/.env` 생성**: `cp backend/.env.example backend/.env` 후 `DATABASE_URL`의 비밀번호와 `JWT_SECRET`(32자 이상)만 실제 값으로.
3. **`frontend/.env` 생성**(선택): `cp frontend/.env.example frontend/.env`. 안 만들어도 `http://localhost:4002`로 폴백합니다. 제가 삭제한 `frontend/.env.local`(3400 지정) 때문에 **실행 중인 3002 dev 서버는 이미 재시작되어 4002를 바라봅니다**.
4. **기동**: 터미널 2개로 `cd backend && npm run start:dev`(4002), `cd frontend && npm run dev`(3002). Swagger는 http://localhost:4002/api/docs.
5. **기존 DB에 데이터가 있다면** README "스키마 변경 주의" 섹션의 SQL로 옛 전역 유니크 제약을 먼저 제거하세요(새 DB면 불필요).
6. **MinIO**(원하실 때): `minio.exe server C:\minio-data --console-address ":9001"` 실행 후 업로드 기능이 열립니다.
7. **의존성 정합성**(선택): `cd backend && npm install`을 한 번 돌리면 새로 명시한 `@nestjs/mapped-types`가 직접 의존성으로 기록됩니다(지금도 동작에는 문제 없음).
8. **검토 후 커밋**: 변경은 전부 미커밋 상태입니다. Eclipse/VS Code의 Git 뷰에서 확인 후 직접 커밋하세요.
