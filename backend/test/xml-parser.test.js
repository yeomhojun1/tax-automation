'use strict';

require('reflect-metadata');
const test = require('node:test');
const assert = require('node:assert/strict');

const { XmlParserService } = require('../dist/tax-invoices/parsers/xml-parser.service');
const { toBuffer } = require('./helpers/invoice-xml');

const parser = new XmlParserService();

test('공급자 사업자번호가 내 번호면 매출(SALES)로 판별한다', () => {
  const parsed = parser.parseXml(toBuffer({}), '1234567890');

  assert.equal(parsed.direction, 'SALES');
  assert.equal(parsed.counterpartyName, '구매자상사');
  assert.equal(parsed.counterpartyBizNumber, '9876543210');
});

test('공급받는자 사업자번호가 내 번호면 매입(PURCHASE)으로 판별한다 (하이픈 무시)', () => {
  const parsed = parser.parseXml(toBuffer({}), '987-65-43210');

  assert.equal(parsed.direction, 'PURCHASE');
  assert.equal(parsed.counterpartyName, '판매자상사');
  assert.equal(parsed.counterpartyBizNumber, '1234567890');
});

test('접두사 네임스페이스(<tax:TaxInvoice>)를 파싱한다', () => {
  const parsed = parser.parseXml(toBuffer({ prefix: 'tax' }), '1234567890');

  assert.equal(parsed.invoiceNumber, '202509160000000000000001');
  assert.equal(parsed.direction, 'SALES');
  assert.equal(parsed.supplyAmount, 1000000);
  assert.equal(parsed.items.length, 1);
});

test('콤마가 들어간 금액 문자열을 숫자로 변환한다', () => {
  const parsed = parser.parseXml(
    toBuffer({
      supplyAmount: '1,000,000',
      taxAmount: '100,000',
      items: [
        {
          name: '컨설팅',
          description: '9월분',
          quantity: '1',
          unitPrice: '1,000,000',
          lineTotal: '1,000,000',
          lineTax: '100,000',
        },
      ],
    }),
    '1234567890',
  );

  assert.equal(parsed.supplyAmount, 1000000);
  assert.equal(parsed.taxAmount, 100000);
  assert.equal(parsed.items[0].supplyAmount, 1000000);
  assert.equal(parsed.items[0].taxAmount, 100000);
});

test('품목(라인 아이템) 태그를 모두 추출한다', () => {
  const parsed = parser.parseXml(
    toBuffer({
      items: [
        { name: '품목A', description: '규격A', quantity: '2', unitPrice: '500', lineTotal: '1000', lineTax: '100' },
        { name: '품목B', description: '규격B', quantity: '3', unitPrice: '100', lineTotal: '300', lineTax: '30' },
      ],
    }),
    '1234567890',
  );

  assert.equal(parsed.items.length, 2);
  assert.deepEqual(parsed.items[0], {
    itemName: '품목A',
    specification: '규격A',
    quantity: 2,
    unitPrice: 500,
    supplyAmount: 1000,
    taxAmount: 100,
  });
  assert.equal(parsed.items[1].itemName, '품목B');
});

test('작성일자를 UTC 자정 Date 로 변환하고 24자리 승인번호 정밀도를 유지한다', () => {
  const parsed = parser.parseXml(toBuffer({ issueDateTime: '20250301120000' }), '1234567890');

  assert.equal(parsed.issueDate.toISOString(), '2025-03-01T00:00:00.000Z');
  assert.equal(typeof parsed.invoiceNumber, 'string');
  assert.equal(parsed.invoiceNumber.length, 24);
});

test('작성일자가 잘못되면 오늘 날짜로 대체하지 않고 400 으로 거부한다', () => {
  assert.throws(
    () => parser.parseXml(toBuffer({ issueDateTime: '20251345' }), '1234567890'),
    (error) => error.getStatus() === 400,
  );
  assert.throws(
    () => parser.parseXml(toBuffer({ issueDateTime: '' }), '1234567890'),
    (error) => error.getStatus() === 400,
  );
});

test('TypeCode 를 과세유형으로 매핑하고 미지값은 과세로 처리한다', () => {
  assert.equal(parser.parseXml(toBuffer({ typeCode: '02' }), '1234567890').taxType, 'ZERO_RATE');
  assert.equal(parser.parseXml(toBuffer({ typeCode: '03' }), '1234567890').taxType, 'EXEMPT');
  assert.equal(parser.parseXml(toBuffer({ typeCode: '99' }), '1234567890').taxType, 'TAXABLE');
});

test('세금계산서 루트가 아니거나 승인번호가 없으면 400 으로 거부한다', () => {
  assert.throws(
    () => parser.parseXml(Buffer.from('<Other><A>1</A></Other>', 'utf-8'), '1234567890'),
    (error) => error.getStatus() === 400,
  );
  assert.throws(
    () => parser.parseXml(toBuffer({ invoiceId: '' }), '1234567890'),
    (error) => error.getStatus() === 400,
  );
});
