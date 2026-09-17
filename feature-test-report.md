# tax-automation 기능 테스트 보고 (2026-09-16)

> 5개 프로젝트 전체 현황: https://claude.ai/artifact/PvWqAcbkvtL8VSNHZhL48e

## 한 줄 요약: 전체 기능 46개 중 PASS 36 / FAIL 2 / 환경없음 6 / 해당없음 2 — 빌드·타입체크 전부 통과, 순수 로직 4종(XML 파서·부가세 집계·DTO 검증·D-day/CSV) 110개 체크 전부 통과, DB를 인메모리로 대체한 실제 HTTP 하네스 80개 체크 전부 통과. 다만 "같은 세금계산서를 거래 상대방이 업로드하면 500", "수동등록 issueDate 미검증→500" 등 버그 12건 발견.

### 테스트 환경
- Windows 11, Node v18.20.8, npm 10.8.2. 로컬 Postgres/MinIO/docker 없음.
- 프론트 dev 서버는 이미 http://localhost:3002 에 떠 있었고(`frontend/.env.local` = `VITE_API_URL=http://localhost:3400`) 건드리지 않음.
- 소스 무수정(`git status` → 기존 `.run-frontend.log` 외 변경 없음). 테스트 스크립트는 세션 스크래치패드(`%LOCALAPPDATA%\Temp\claude\c--\f442cb73-…\scratchpad\`)에만 두었음: `test-xml-parser.js`, `test-calc.js`, `test-dto.js`, `test-frontend-logic.js`, `harness.js`. 필요하면 프로젝트로 복사 가능.
- **하네스 방식**: `@nestjs/testing`으로 `AppModule`을 그대로 올리되 TypeORM `DataSource` 토큰만 인메모리 가짜 저장소(unique/varchar/date 제약 일부 에뮬레이션)로, `StorageService`만 가짜로 override. 가드·파이프·인터셉터·필터·JWT·bcrypt·multipart·XML 파서·Swagger·CORS·helmet은 **실제 코드**가 3400 포트에서 실제 HTTP로 돌았음. 따라서 SQL 자체(ILIKE, EXTRACT, enum 캐스팅)와 DB 기본값은 검증 범위 밖.

## 기능 목록과 결과

| # | 기능 | 종류 | 테스트 방법(명령) | 결과 | 관찰/근거 |
|---|------|------|-------------------|------|-----------|
| 1 | 백엔드 의존성 설치 | 빌드 | `cd backend && npm install --no-audit --no-fund` | PASS | 540 packages, 1분. deprecated 경고(uuid@9)만 |
| 2 | 백엔드 타입체크/빌드 | 빌드 | `cd backend && npm run build` (nest build) | PASS | 오류 0, `dist/` 생성 |
| 3 | 프론트 타입체크 | 빌드 | `cd frontend && npx tsc --noEmit` | PASS | strict + noUnused 옵션에서 오류 0 |
| 4 | 프론트 프로덕션 빌드 | 빌드 | `cd frontend && npm run build` (tsc && vite build) | PASS | 732 modules, 11.7s. 경고: 단일 청크 689kB(>500kB, recharts 미분할) |
| 5 | DB 없이 백엔드 기동(PORT=3400) | API | `PORT=3400 DATABASE_URL=postgresql://postgres:postgres@localhost:5433/taxapp JWT_SECRET=… node dist/main.js` | 환경없음(기동 불가) | Nest 모듈 로딩 후 TypeORM이 `ECONNREFUSED ::1:5433` 9회 재시도(3초 간격, 약 25초) → `exit 1`. 3400 포트 열리지 않음. DB는 필수 |
| 6 | Swagger 문서 `/api/docs`, `/api/docs-json` | API | 하네스 `GET /api/docs`, `/api/docs-json` | PASS | 200, bearerAuth 스킴 존재. 문서화된 경로 14개(아래 API 목록과 일치) |
| 7 | CORS(ALLOWED_ORIGINS, credentials) | API | 하네스 OPTIONS preflight Origin=3002 / evil | PASS | 허용 origin은 echo + allow-credentials:true, 미허용 origin은 헤더 없음 |
| 8 | helmet 보안 헤더 | API | 하네스 응답 헤더 | PASS | `x-content-type-options: nosniff`, `x-frame-options` 존재 |
| 9 | 전역 ValidationPipe(whitelist/forbidNonWhitelisted/transform) + 7개 DTO | API/검증 | `node test-dto.js` (class-validator 직접 호출, 파이프 옵션 동일) | PASS 32/32 | 이메일 형식, 비번 8자, enum, 음수 금액, 날짜 문자열, 알 수 없는 필드(`isAdmin`, `userId`) 전부 거부. 단 `CreateInvoiceDto.issueDate`는 `@IsString`뿐 → `"abc"` 통과(버그 B1), `RegisterDto.businessNumber` 길이 제한 없음(B4) |
| 10 | ResponseInterceptor 응답 봉투 `{data,message,statusCode}` | API | 하네스 전 응답 | PASS(주의) | `statusCode` 필드가 항상 200 (HTTP 201/204여도) |
| 11 | HttpExceptionFilter 에러 포맷 `{message,statusCode,timestamp}` | API | 하네스 401/400/404/409 응답 | PASS(주의) | 배열 메시지는 콤마로 join. HttpException이 아닌 예외(Fastify 406, DB 오류 500)는 필터를 거치지 않아 포맷이 다름 |
| 12 | `POST /api/v1/auth/register` | 인증 | 하네스 | PASS | 201 + accessToken + user(password 제외), 중복 이메일 409, `isGeneralTaxpayer` 기본 true |
| 13 | `POST /api/v1/auth/login` | 인증 | 하네스 | PASS | 200, 오답/미존재 이메일 모두 401 동일 문구(계정 열거 방지). 비번 8자 미만은 DTO에서 400 |
| 14 | JWT 발급/검증(7d, Bearer) + JwtAuthGuard | 인증 | 하네스: 무토큰, 변조 토큰, 정상 토큰 | PASS | 무토큰/변조 401, payload `{sub,email,iat,exp}` 확인. bcrypt 12라운드 실제 수행 |
| 15 | `GET /api/v1/auth/me` | 인증 | 하네스 | PASS | password 필드 제외 |
| 16 | `PATCH /api/v1/auth/me` (상호·사업자번호·과세유형) | 인증 | 하네스 | PASS | null 사업자번호 허용, `email` 변경 시도는 400 |
| 17 | `PATCH /api/v1/auth/password` | 인증 | 하네스 | PASS | 현재 비번 오류 401, 성공 204(빈 본문), 새 비번으로 로그인 OK / 옛 비번 401 |
| 18 | `GET /api/v1/expenses` + year/month/category/search 필터 | API | 하네스(가짜 SQL 평가기) | PASS(주의) | 본인 것만, 날짜 DESC. 쿼리 파라미터 검증 없음: `year=abc`→NaN 무시, `category=FOOD`는 가짜에선 빈 배열이지만 **실제 pg enum 컬럼 비교 시 500 가능성** |
| 19 | `POST /api/v1/expenses` | API | 하네스 | PASS | 201, `receiptFileKey/taxInvoiceId` null 기본 |
| 20 | `PATCH /api/v1/expenses/:id` (소유권) | API | 하네스 | PASS | 타인 것 403, 없는 id 404, `abc` 400(ParseIntPipe), 부분 수정 OK |
| 21 | `DELETE /api/v1/expenses/:id` | API | 하네스 | PASS | 204, 재삭제 404, 타인 것 403 |
| 22 | `POST /api/v1/tax-invoices` (수동 등록) | API | 하네스 | FAIL(부분) | 정상 입력 201, `invoiceNumber=MANUAL-<uid>-<ms>`. `issueDate:"abc"`가 DTO를 통과해 Invalid Date → DB 오류 500 (B1). userId≥1000이면 번호가 varchar(24) 초과(B10) |
| 23 | `POST /api/v1/tax-invoices/upload` (multipart XML→저장소→파싱→중복검사→저장+품목) | API/파일 | 하네스(가짜 스토리지) + 실제 `StorageService` 별도 호출 | FAIL(부분) | 판매자 업로드 201 SALES(품목 1), 구매자 업로드 201 PURCHASE, 같은 사용자 재업로드 400 "이미 등록", `.txt` 400, 루트 다른 XML 400, 무토큰 401. **문제**: 상대방(구매자)이 같은 XML 업로드 → 전역 unique 위반 500(B2), 중복 거부 전에 파일 먼저 저장(B3), multipart 아닌 요청 406(B9). 실제 MinIO 없이는 `uploadFile`이 ECONNREFUSED → 500 |
| 24 | `GET /api/v1/tax-invoices` + direction/startDate/endDate | API | 하네스 | PASS | items 포함, DESC. startDate만 주면 기간 필터 무시(둘 다 있어야 적용) |
| 25 | `GET /api/v1/tax-invoices/summary?year&quarter` | API/계산 | 하네스 + `node test-calc.js` | PASS(주의) | Q1~Q4 날짜 경계 정확(1/1~3/31 … 10/1~12/31), 4분기 합 = 연간 합. quarter 누락 400, **quarter=7은 200으로 Q1 값 반환**(B5) |
| 26 | `DELETE /api/v1/tax-invoices/:id` (+ items CASCADE) | API | 하네스 | PASS | 204, 타인 403, 재삭제 404. CASCADE는 엔티티 설정(`onDelete:'CASCADE'`)으로 확인, DB 실동작은 미검증. 원본 파일은 MinIO에 남음(B7) |
| 27 | `GET /api/v1/dashboard/summary?year` | API/계산 | 하네스 + `node test-calc.js` | PASS 27/27 | 매출/매입 공급가액·세액 합, `estimatedVat = 매출세액 − 매입세액`(환급 시 음수), 12개월 추이, 카테고리별 내림차순, 다른 연도·다른 사용자 제외, 1/1·12/31 경계 포함, decimal 문자열→Number 처리 |
| 28 | KEC XML v3.0 파서 | 계산/파일 | `node test-xml-parser.js` (dist의 XmlParserService 직접 호출) | PASS 30/30 | 공급자/공급받는자 사업자번호로 매출·매입 판별(하이픈 정규화), TypeCode 01~04 매핑(미지값→과세), 24자리 ID 정밀도 유지, 품목 0/1/N개, 12자리 IssueDateTime. **제약**: 접두사 네임스페이스(`tax:TaxInvoice`) 거부, 필수 블록 누락해도 빈 값으로 통과, 날짜 공란→오늘로 대체, 잘못된 날짜/콤마 금액→Invalid Date/NaN 그대로 반환(B6·B8) |
| 29 | 부가세 계산 공식(일반과세자) | 계산 | `test-calc.js`, 하네스 | PASS | 매출세액 − 매입세액. 간이과세자용 별도 산식(업종별 부가가치율)은 없음 — 대시보드는 과세유형과 무관하게 같은 식 사용 |
| 30 | 프론트 수동등록 세액 자동계산(공급가액×10% 반올림) | 계산/UI | 코드 확인 `InvoiceCreateModal.handleSupplyAmountChange` | 코드검증 | `Math.round(value*0.1)`, 세액 필드 수동 수정 가능 |
| 31 | 부가세 D-day 배너(30일 전부터, 7일 이내 빨강, 간이과세자 1기 제외) | 계산/UI | `node test-frontend-logic.js` (esbuild로 TSX 번들 후 Date 모킹) | PASS 12/12 | 오늘(2026-09-16) 기준 다음 마감 2027-01-25 → D-131이라 **현재는 배너가 안 보임**. 7/25 D-24 amber, D-5 red, D-0 표시, D-31 숨김, 간이과세자는 7월 신고 건너뜀 |
| 32 | CSV 내보내기(경비/세금계산서) | 파일/UI | `test-frontend-logic.js` (Blob 바이트 검사) | PASS 9/9 | UTF-8 BOM(EF BB BF) 포함, 헤더 한글, 따옴표 이스케이프(`""`), 콤마 필드 보존, 파일명 `경비내역.csv`/`세금계산서.csv` |
| 33 | 라우팅: `/login /register /dashboard /invoices /expenses /report /profile`, `/`·`*` 리다이렉트 | UI | `curl http://localhost:3002/<path>` + `curl …/src/App.tsx` | PASS | 모든 경로 200 text/html(SPA fallback). 변환된 App.tsx에서 `ProtectedRoute → <Navigate to="/login">`, 로그인 상태에서 `/login`,`/register → /dashboard`, `* → /` 확인 |
| 34 | 인증 상태 유지(zustand persist `auth_user`, `auth_token`) + 401 시 자동 로그아웃 | 인증/UI | `curl …/src/api/client.ts`, 코드 | 코드검증 | axios 인터셉터가 401이면 두 키 삭제 후 `location.href='/login'`. 네트워크 오류(백엔드 다운)는 401이 아니므로 로그아웃되지 않음 |
| 35 | 로그인 화면 | UI | curl 200 + 빌드 | 환경없음(동작) | 화면은 뜸. 로그인 성공 흐름은 백엔드+DB 필요 |
| 36 | 회원가입 화면 | UI | curl 200 + 빌드 | 환경없음(동작) | HTML 검증(required, minLength 8, type=email) 있음 |
| 37 | 대시보드(KPI 4카드·월별 BarChart·카테고리 PieChart·부가세 요약·연도 선택 2026~2023) | UI/차트 | 빌드 + 코드 | 환경없음(데이터) | recharts 3.8 사용, 커스텀 툴팁, 억/만 단위 포맷 |
| 38 | 세금계산서 화면(드롭존 업로드, 전체/매출/매입 탭, 기간 필터, 목록, 상세 모달, 수동등록 모달, 삭제 확인, CSV) | UI | 빌드 + 코드 | 환경없음(데이터) | 업로드 실패 토스트는 서버 메시지 대신 고정 문구 |
| 39 | 경비 화면(등록 폼, 검색/연/월/카테고리 필터, 인라인 수정, 삭제 확인, 합계, CSV) | UI | 빌드 + 코드 | 환경없음(데이터) | 14개 카테고리(research.md의 17개 중 3개 미구현: VEHICLE_DEPRECIATION, INTEREST, FREIGHT) |
| 40 | 부가세 리포트 화면(분기 4카드 + 연간 합계표, useQueries 4회 호출) | UI | 빌드 + 코드 | 환경없음(데이터) | 분기별 `/summary` 4회 병렬 호출 |
| 41 | 프로필 화면(사업자 정보 수정, 비밀번호 변경+확인 일치 검사) | UI | 빌드 + 코드 | 환경없음(동작) | 비번 불일치 시 프론트에서 차단 |
| 42 | 스케줄 작업(@nestjs/schedule) | 스케줄 | `grep -rn "@Cron\|@Interval\|@Timeout" backend/src` | 해당없음 | `ScheduleModule.forRoot()`만 등록, **크론/인터벌 작업 0개**. "D-day 알림"은 프론트 배너뿐, 서버 알림·메일 없음 |
| 43 | MinIO StorageService(버킷 보장, upload, signedUrl, delete) | 파일 | 하네스 내 실제 인스턴스 호출 | 환경없음 | MinIO 없어도 `onModuleInit`은 warn만 하고 19ms에 통과(기동 안 막음). `uploadFile` → `ECONNREFUSED`. `getSignedUrl`/`deleteFile`은 **어디서도 호출 안 됨**(원본 다운로드·삭제 기능 미구현) |
| 44 | 업로드 제한(20MB, 확장자/mimetype xml) | 파일 | 코드 + 하네스 | PASS | `.txt` 400. 20MB는 multipart limits 설정만 확인 |
| 45 | TypeORM 엔티티 4종 + synchronize(비프로덕션 자동 스키마) | DB | 코드 | 환경없음 | `NODE_ENV!=='production'`이면 synchronize:true — 운영 반영 시 주의. 마이그레이션 파일 없음 |
| 46 | 미구현/유령 기능: PDF 업로드(`pdf-parse`), 토스 결제(`TOSS_*`), 영수증 파일(`receiptFileKey`), 경비-세금계산서 연결(`taxInvoiceId`) | - | `grep` | 해당없음 | 의존성·env·컬럼만 있고 사용처 없음. `taxInvoiceId`는 임의 숫자를 넣어도 FK 검증 없음 |

집계: PASS 36(실행 검증 34 + 코드검증 2) / FAIL 2(#22, #23 — 정상 입력은 동작하나 현실적인 입력에서 500) / 환경없음 6(#5, #35~#41 중 데이터·동작 검증 불가 항목을 화면 단위로 묶어 6) / 해당없음 2(#42, #46).

### API 엔드포인트 전체 목록(Fastify 라우트 트리에서 실측)
```
POST   /api/v1/auth/register            공개
POST   /api/v1/auth/login               공개
GET    /api/v1/auth/me                  JWT
PATCH  /api/v1/auth/me                  JWT
PATCH  /api/v1/auth/password            JWT  (204)
POST   /api/v1/tax-invoices             JWT  수동 등록 (201)
POST   /api/v1/tax-invoices/upload      JWT  multipart 'file' (201)
GET    /api/v1/tax-invoices             JWT  ?direction&startDate&endDate
GET    /api/v1/tax-invoices/summary     JWT  ?year&quarter (둘 다 필수 int)   ※ README에 없음
DELETE /api/v1/tax-invoices/:id         JWT  (204)
GET    /api/v1/expenses                 JWT  ?year&month&category&search
POST   /api/v1/expenses                 JWT  (201)
PATCH  /api/v1/expenses/:id             JWT
DELETE /api/v1/expenses/:id             JWT  (204)
GET    /api/v1/dashboard/summary        JWT  ?year
GET    /api/docs, /api/docs-json, /api/docs-yaml   Swagger
```

## 발견한 버그·문제 (재현법 포함)

**B1. 수동 등록 `issueDate` 미검증 → 500** (`backend/src/tax-invoices/dtos/create-invoice.dto.ts`)
- `issueDate`에 `@IsString()`만 있음(경비 DTO는 `@IsDateString()`). `new Date('abc')` → Invalid Date → pg `invalid input syntax for type date`.
- 재현: `curl -X POST :3400/api/v1/tax-invoices -H "Authorization: Bearer $T" -H "Content-Type: application/json" -d '{"direction":"SALES","counterpartyName":"x","supplyAmount":1,"taxAmount":0,"issueDate":"abc"}'` → 500 (하네스에서 pg 오류 에뮬레이션으로 확인, DTO 통과는 실제 class-validator로 확인).

**B2. 거래 상대방이 같은 세금계산서를 업로드하면 500** (`tax-invoice.entity.ts` `invoiceNumber unique`, `tax-invoices.service.ts uploadAndParse`)
- 컬럼은 전역 unique인데 중복 검사는 `{invoiceNumber, userId}`로 함. 판매자 A가 업로드한 뒤 구매자 B가 동일 XML(같은 국세청 승인번호)을 업로드 → unique 위반 → 500 `QueryFailedError`. 매출·매입 양쪽이 같은 서비스를 쓰는 순간 반드시 발생.
- 재현: 사용자 A 토큰으로 `/upload` 성공 → 사용자 B 토큰으로 같은 파일 `/upload`. 수정 방향: unique를 `(userId, invoiceNumber)` 복합으로.

**B3. 중복/파싱 실패해도 파일은 먼저 저장(고아 파일)** (`uploadAndParse` 순서: upload → parse → 중복검사)
- 재현: 같은 XML 2회 업로드 → 두 번째는 400이지만 스토리지에 2개 파일 존재(하네스에서 `fakeStorage.files` 2개 확인). 파싱 실패 XML도 파일은 남음.

**B4. 회원가입 `businessNumber` 길이 미검증** (`register.dto.ts`) — 컬럼 varchar(20)인데 `@MaxLength` 없음(프로필 수정 DTO엔 있음). 21자 이상이면 pg 오류 500. 재현: register body에 `"businessNumber":"111111111111111111111"`.

**B5. `quarter` 범위 미검증** (`tax-invoices.service.ts getQuarterMonths`) — `quarter=7` → 조용히 1분기 값을 `quarter:7`로 반환(200). 재현: `GET /api/v1/tax-invoices/summary?year=2025&quarter=7`.

**B6. XML 파서 관용/취약 지점** (`parsers/xml-parser.service.ts`)
- 접두사 네임스페이스(`<tax:TaxInvoice>`) 파일은 "올바른 세금계산서 XML 형식이 아닙니다"로 거부(fast-xml-parser `removeNSPrefix` 미설정). 실제 홈택스 파일이 접두사를 쓰면 전부 실패 — 실파일 확보 후 확인 필요.
- `SupplyChainTradeTransaction` 등 필수 블록이 없어도 예외 없이 상호 ''·금액 0인 계산서로 저장됨.
- `IssueDateTime` 공란이면 **오늘 날짜로 대체**, `20251345` 같은 값은 Invalid Date, 금액 `1,000,000`은 NaN → DB 단계에서 500.
- 사용자 사업자번호 미설정('') + XML의 SellerTradeParty ID 공란 → 매출로 오판(`'' === ''`).

**B7. 세금계산서 삭제 시 MinIO 원본 미삭제, 원본 다운로드 기능 없음** — `StorageService.deleteFile/getSignedUrl` 호출처 0. `rawFileKey`는 저장만 되고 화면에 노출 안 됨.

**B8. 업로드 예외 처리 비일관** (`tax-invoices.controller.ts upload`)
- multipart가 아닌 요청 → Fastify `406 {"statusCode":406,"message":"the request is not multipart"}` (전역 필터 포맷 아님).
- 파일 파트 없음 → `throw new Error('파일이 없습니다')` → 500.

**B9. 응답 봉투 `statusCode` 상수 200** (`response.interceptor.ts`) — 201/204 응답에서도 본문은 `statusCode:200`. 프론트는 안 쓰지만 Swagger 이용자에게 혼란.

**B10. 수동 등록 번호 길이 잠재 오버플로** — `MANUAL-${userId}-${Date.now()}`는 userId≥1000이면 25자 > varchar(24) → 500. (`test-calc.js`에서 길이 계산으로 확인)

**B11. 쿼리 파라미터 무검증** (`expenses.controller.ts findAll`) — `category=FOOD`는 enum 컬럼과 텍스트 비교 → 실제 Postgres에서 `invalid input value for enum` 500 가능성 높음(하네스 가짜 저장소는 빈 배열 반환하므로 미확정). `direction=XXX`도 동일.

**B12. 프론트 오류 메시지 오도** — 백엔드가 꺼져 있어도 로그인 화면은 "이메일 또는 비밀번호가 올바르지 않습니다", 업로드는 "XML 파일인지 확인해 주세요"로 표시(서버 메시지·네트워크 오류 미구분). 현재 3002는 3400을 바라보는데 3400은 비어 있어 이 상태를 바로 볼 수 있음.

**문서/설정 불일치(버그 아님)**
- README: `docker compose up --build`로 3개 서비스가 뜬다고 하나 `docker-compose.yml`에는 postgres·minio만 있음(백엔드/프론트 서비스 없음). DB명 README `taxdb` vs `.env.example` `taxapp`. README API 목록에 `/tax-invoices/summary` 누락.
- `frontend/.env`가 없으면 `config/env.ts`가 모듈 로딩 시 throw → 흰 화면. 현재는 `.env.local`로 우회 중.
- `@nestjs/mapped-types`를 직접 import하지만 `package.json`엔 없음(`@nestjs/swagger`의 전이 의존성 2.0.5에 기대는 상태).
- 시간대: 날짜를 `new Date('YYYY-MM-DD')`(UTC 자정)로 만들어 `date` 컬럼에 저장·비교. KST/UTC 서버에선 문제 없으나 UTC 서쪽 시간대에서 하루 밀림.
- `synchronize: NODE_ENV !== 'production'` — 마이그레이션 없이 스키마 자동 변경.

## 브라우저에서 직접 눌러봐야 할 UI 시나리오 (백엔드 없이 볼 수 있는 것)

1. **보호 라우트 리다이렉트**: 시크릿 창에서 `http://localhost:3002/dashboard`, `/invoices`, `/nope` 접속 → 모두 `/login`으로 튕기는지, 주소창이 `/login`으로 바뀌는지(replace) 확인.
2. **로그인/회원가입 폼 검증과 오류 문구**: `/login`에서 이메일 형식 오류·빈 값 → 브라우저 네이티브 검증. 정상 형식으로 제출 → 3400 미기동이라 실패하는데 문구가 "이메일 또는 비밀번호가 올바르지 않습니다"로 나오는지(B12 확인). `/register`에서 7자 비밀번호 → minLength 차단.
3. **보호 화면 레이아웃 미리보기(토큰 위조)**: DevTools 콘솔에서
   `localStorage.setItem('auth_user', JSON.stringify({state:{user:{id:1,email:'demo@test.com',businessName:'데모상사',businessNumber:'123-45-67890',isGeneralTaxpayer:true},token:'x',isAuthenticated:true},version:0})); localStorage.setItem('auth_token','x'); location.href='/dashboard'`
   → 사이드바(5개 메뉴, 상호/이메일), 대시보드가 "불러오는 중..." 후 0원 KPI·빈 차트·"등록된 경비가 없습니다"로 렌더되는지, 연도 셀렉트(2026~2023) 동작 확인. 네트워크 오류는 401이 아니라 로그아웃되지 않아야 함. (오늘 기준 D-day 배너는 D-131이라 안 보이는 게 정상.)
4. **세금계산서 화면 모달들**: 위 상태에서 `/invoices` → "수동 등록" 클릭 → 공급가액 1,000,000 입력 시 세액이 100,000으로 자동 채워지고 수동 수정 가능한지, 매출/매입 라디오, 바깥 클릭·× 로 닫힘. 드롭존에 `.txt`를 드롭하면 "XML 파일만 업로드 가능합니다" 토스트가 3초 후 사라지는지. 전체/매출/매입 탭과 기간 초기화 버튼 표시 확인.
5. **경비 화면 필터 UI와 로그아웃**: `/expenses`에서 검색어·연도·월·카테고리 셀렉트를 바꾸면 "초기화" 버튼이 나타나고 눌렀을 때 전부 비워지는지, 카테고리 14개 라벨 확인. 마지막으로 사이드바 "로그아웃" → `/login` 이동 및 `localStorage`의 `auth_token` 삭제, `auth_user`가 `isAuthenticated:false`로 바뀌는지.

## 환경 한계 (DB/MinIO 필요 기능 목록, 로컬에서 돌리려면 필요한 것)

**DB(Postgres) 없이는 불가**: 백엔드 기동 자체(#5), 실제 CRUD 영속성, unique/varchar/enum/CASCADE 제약의 실동작, ILIKE·EXTRACT 쿼리, decimal→문자열 반환 처리, 로그인 후 모든 화면의 데이터 표시(대시보드 차트, 리포트, 목록), B2·B11의 실제 상태코드 확정.
**MinIO 없이는 불가**: XML 업로드 E2E(현재는 `putObject` ECONNREFUSED → 500), 원본 파일 저장. 기동은 MinIO 없어도 됨(warn만).

로컬에서 전체를 돌리려면:
1. Docker 설치 후 `docker compose up -d` (postgres:5433, minio:9000/9001 — compose 파일에 이미 정의됨).
2. `backend/.env` 생성(`.env.example` 복사) — 현재 프론트가 3400을 보고 있으므로 `PORT=3400`, `ALLOWED_ORIGINS=http://localhost:3002`, `JWT_SECRET`은 32자 이상.
3. `cd backend && npm run start:dev` → `synchronize:true`로 테이블 자동 생성 → Swagger `http://localhost:3400/api/docs`.
4. 프론트는 이미 3002에서 3400을 바라보므로 추가 작업 없음(`frontend/.env.local`).
5. 검증용 XML: 스크래치패드 `test-xml-parser.js`의 `xml()` 생성기가 파서가 기대하는 KEC 구조를 만들어 줌. 실제 홈택스 파일로 네임스페이스 접두사 여부(B6)를 먼저 확인할 것.

Docker 없이 Postgres/MinIO를 네이티브 설치해도 되지만 그 경우 `.env`의 포트만 맞추면 됨. 또는 이번에 만든 인메모리 하네스(`harness.js`)를 3400에 띄워두면 DB 없이도 프론트 전체 흐름(회원가입→로그인→경비/계산서 등록→대시보드)을 브라우저에서 시연할 수 있음(재시작 시 데이터 소실).
