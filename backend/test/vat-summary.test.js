'use strict';

require('reflect-metadata');
const test = require('node:test');
const assert = require('node:assert/strict');

const { TaxInvoicesService } = require('../dist/tax-invoices/tax-invoices.service');

function createService(invoices) {
  const calls = [];
  const invoiceRepository = {
    find: async (options) => {
      calls.push(options);
      return invoices;
    },
  };
  const service = new TaxInvoicesService(invoiceRepository, {}, {}, {});
  return { service, calls };
}

function invoice(direction, supplyAmount, taxAmount) {
  // decimal 컬럼은 pg 드라이버가 문자열로 돌려주므로 문자열로 흉내낸다
  return { direction, supplyAmount: String(supplyAmount), taxAmount: String(taxAmount) };
}

test('부가세 집계: 매출세액 - 매입세액 = 예상 납부세액', async () => {
  const { service } = createService([
    invoice('SALES', 1000000, 100000),
    invoice('SALES', 500000, 50000),
    invoice('PURCHASE', 300000, 30000),
  ]);

  const summary = await service.getSummary(1, 2025, 1);

  assert.equal(summary.salesSupplyAmount, 1500000);
  assert.equal(summary.salesTaxAmount, 150000);
  assert.equal(summary.purchaseSupplyAmount, 300000);
  assert.equal(summary.purchaseTaxAmount, 30000);
  assert.equal(summary.estimatedVat, 120000);
});

test('부가세 집계: 매입세액이 더 크면 환급(음수)으로 나온다', async () => {
  const { service } = createService([
    invoice('SALES', 1000000, 100000),
    invoice('PURCHASE', 3000000, 300000),
  ]);

  const summary = await service.getSummary(1, 2025, 2);

  assert.equal(summary.estimatedVat, -200000);
  assert.equal(summary.quarter, 2);
});

test('분기 경계: 각 분기의 시작일/종료일이 정확하다', async () => {
  const expected = {
    1: ['2025-01-01', '2025-03-31'],
    2: ['2025-04-01', '2025-06-30'],
    3: ['2025-07-01', '2025-09-30'],
    4: ['2025-10-01', '2025-12-31'],
  };

  for (const quarter of [1, 2, 3, 4]) {
    const { service, calls } = createService([]);
    await service.getSummary(1, 2025, quarter);

    const [start, end] = calls[0].where.issueDate.value;
    assert.equal(toLocalDateString(start), expected[quarter][0]);
    assert.equal(toLocalDateString(end), expected[quarter][1]);
  }
});

test('분기 경계: 윤년 2월 말일(2024-02-29)까지 1분기에 포함된다', async () => {
  const { service, calls } = createService([]);
  await service.getSummary(1, 2024, 1);

  const [, end] = calls[0].where.issueDate.value;
  assert.equal(toLocalDateString(end), '2024-03-31');

  const { service: s2, calls: c2 } = createService([]);
  await s2.getSummary(1, 2024, 2);
  const [start2] = c2[0].where.issueDate.value;
  assert.equal(toLocalDateString(start2), '2024-04-01');
});

test('분기 범위를 벗어나면 조용히 1분기로 계산하지 않고 400 을 던진다', async () => {
  const { service } = createService([]);

  await assert.rejects(
    () => service.getSummary(1, 2025, 7),
    (error) => error.getStatus() === 400,
  );
  await assert.rejects(
    () => service.getSummary(1, 2025, 0),
    (error) => error.getStatus() === 400,
  );
});

function toLocalDateString(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
