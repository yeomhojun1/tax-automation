'use strict';

require('reflect-metadata');
const test = require('node:test');
const assert = require('node:assert/strict');

const { plainToInstance } = require('class-transformer');
const { validateSync } = require('class-validator');

const { CreateInvoiceDto } = require('../dist/tax-invoices/dtos/create-invoice.dto');
const { InvoiceSummaryQueryDto, InvoiceListQueryDto } = require('../dist/tax-invoices/dtos/invoice-query.dto');
const { ExpenseQueryDto } = require('../dist/expenses/dtos/expense-query.dto');
const { RegisterDto } = require('../dist/auth/dtos/register.dto');

// main.ts 의 전역 ValidationPipe 와 동일한 옵션
function validate(cls, plain) {
  const instance = plainToInstance(cls, plain, { enableImplicitConversion: false });
  const errors = validateSync(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.map((error) => error.property);
}

test('CreateInvoiceDto: issueDate 는 날짜 형식만 허용한다', () => {
  assert.deepEqual(
    validate(CreateInvoiceDto, {
      direction: 'SALES',
      counterpartyName: '거래처',
      supplyAmount: 1000,
      taxAmount: 100,
      issueDate: '2025-09-16',
    }),
    [],
  );

  assert.deepEqual(
    validate(CreateInvoiceDto, {
      direction: 'SALES',
      counterpartyName: '거래처',
      supplyAmount: 1000,
      taxAmount: 100,
      issueDate: 'abc',
    }),
    ['issueDate'],
  );
});

test('RegisterDto: businessNumber 는 20자를 넘을 수 없다', () => {
  const base = { email: 'a@b.com', password: 'password1', businessName: '상호' };

  assert.deepEqual(validate(RegisterDto, { ...base, businessNumber: '123-45-67890' }), []);
  assert.deepEqual(
    validate(RegisterDto, { ...base, businessNumber: '1'.repeat(21) }),
    ['businessNumber'],
  );
});

test('InvoiceSummaryQueryDto: quarter 는 1~4, year 는 상식 범위만 허용한다', () => {
  assert.deepEqual(validate(InvoiceSummaryQueryDto, { year: '2025', quarter: '4' }), []);
  assert.deepEqual(validate(InvoiceSummaryQueryDto, { year: '2025', quarter: '7' }), ['quarter']);
  assert.deepEqual(validate(InvoiceSummaryQueryDto, { year: '2025', quarter: '0' }), ['quarter']);
  assert.deepEqual(validate(InvoiceSummaryQueryDto, { year: '1899', quarter: '1' }), ['year']);
  assert.deepEqual(validate(InvoiceSummaryQueryDto, { year: 'abc', quarter: '1' }), ['year']);
});

test('InvoiceListQueryDto: direction 은 enum 값만 허용한다', () => {
  assert.deepEqual(validate(InvoiceListQueryDto, {}), []);
  assert.deepEqual(validate(InvoiceListQueryDto, { direction: 'PURCHASE' }), []);
  assert.deepEqual(validate(InvoiceListQueryDto, { direction: 'XXX' }), ['direction']);
  assert.deepEqual(validate(InvoiceListQueryDto, { startDate: '2025-13-40' }), ['startDate']);
});

test('ExpenseQueryDto: category/year/month 가 잘못되면 거부한다', () => {
  assert.deepEqual(validate(ExpenseQueryDto, { year: '2025', month: '12', category: 'MEAL_ALLOWANCE' }), []);
  assert.deepEqual(validate(ExpenseQueryDto, { category: 'FOOD' }), ['category']);
  assert.deepEqual(validate(ExpenseQueryDto, { month: '13' }), ['month']);
  assert.deepEqual(validate(ExpenseQueryDto, { year: 'abc' }), ['year']);
});

test('전역 ValidationPipe 옵션대로 알 수 없는 필드는 거부한다', () => {
  assert.deepEqual(validate(ExpenseQueryDto, { unknownField: '1' }), ['unknownField']);
  assert.deepEqual(
    validate(CreateInvoiceDto, {
      direction: 'SALES',
      counterpartyName: '거래처',
      supplyAmount: 1000,
      taxAmount: 100,
      issueDate: '2025-09-16',
      userId: 9,
    }),
    ['userId'],
  );
});
