# tax-app 리서치 결과

## 1. 홈택스 API 현황

### 결론: 공식 Public API 없음 → MVP는 파일 업로드 방식 채택

국세청이 일반 개발자에게 제공하는 전자세금계산서 조회/발행 공개 REST API는 존재하지 않는다.
삼쩜삼·자비스 등은 사용자 ID/PW를 위임받아 스크래핑하지만, 국세청이 2024년부터 반스크래핑 솔루션을 도입 중이며 법적 리스크가 증가 중이다.

**MVP 전략 (3단계):**
- Phase 1: 사용자가 홈택스에서 다운로드한 XML/PDF를 앱에 업로드
- Phase 2: 팝빌 API 연동 (국세청 공식 ASP 승인 사업자, Node.js SDK 제공)
- Phase 3: 국세청 공식 OpenAPI 출시 시 마이그레이션

## 2. 기술 스택 결정

| 레이어 | 선택 | 이유 |
|--------|------|------|
| Frontend | React 18 + Vite + Tailwind | 컴포넌트 재사용, 빠른 개발 |
| Backend | NestJS + Fastify | 팝빌 SDK 연동, 구독 스케줄링(@nestjs/schedule) |
| DB | PostgreSQL (TypeORM) | 관계형 세금계산서 구조 최적 |
| 파일 | Multer + MinIO (S3 호환) | Docker로 자체 호스팅 가능 |
| XML 파싱 | fast-xml-parser | 타입 지원 양호, KEC XML 구조 파싱 |
| PDF | pdf-parse | 텍스트 추출 |
| 결제 | 토스페이먼츠 (빌링키 방식) | 한국 구독 결제 최적, REST API 직접 연동 |
| 인증 | JWT (NestJS Passport) | 표준 방식 |

## 3. 핵심 도메인 로직

### 부가세 계산
- 일반과세자: 납부세액 = 매출세액 - 매입세액
- 세금계산서 XML의 TypeCode: 01=과세, 02=영세, 03=면세, 04=계산서

### 경비 카테고리 (ExpenseCategory enum)
OFFICE_RENT, LABOR, COMMUNICATION, VEHICLE, VEHICLE_DEPRECIATION,
ENTERTAINMENT, ADVERTISING, SUPPLIES, EDUCATION, INSURANCE,
INTEREST, SOFTWARE, MEAL_ALLOWANCE, FREIGHT, UTILITY, TAX_SERVICE, MISC

### KEC XML v3.0 핵심 파싱 필드
- ID: 세금계산서 번호
- SellerTradeParty: 공급자 (사업자번호, 상호)
- BuyerTradeParty: 공급받는 자
- SpecifiedTradeSettlementMonetarySummation: 공급가액/세액
- IssueDateTime: 작성일자
- TypeCode: 과세유형

## 4. 데이터 모델

```
User
  ├── TaxInvoice (세금계산서) — direction: SALES|PURCHASE
  │     ├── InvoiceItem[] (품목 라인)
  │     └── rawFileKey (MinIO 원본)
  ├── Expense (경비)
  │     ├── category: ExpenseCategory
  │     ├── receiptFileKey?
  │     └── taxInvoiceId?
  └── Subscription
        └── billingKey (토스페이먼츠)
```

## 5. MVP 기능 범위

1. XML/PDF 업로드 + 파싱 + DB 저장
2. 매출/매입 세금계산서 목록 + 대시보드
3. 부가세 계산 (매출세액 - 매입세액)
4. 경비 수동 입력 + 카테고리 분류
5. 토스페이먼츠 월구독 결제 (빌링키 + 매월 자동결제)

## 6. 환경변수 목록

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/taxapp
JWT_SECRET=
ALLOWED_ORIGINS=http://localhost:3001
PORT=3000
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=tax-files
TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=
```
