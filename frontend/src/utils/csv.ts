import { Expense, TaxInvoice, EXPENSE_CATEGORY_LABEL, InvoiceDirection } from '@/types';

function buildCsv(headers: string[], rows: string[][]): string {
  const bom = '﻿';
  const lines = [headers, ...rows].map((row) =>
    row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','),
  );
  return bom + lines.join('\n');
}

function triggerDownload(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadExpensesCsv(expenses: Expense[]): void {
  const headers = ['날짜', '카테고리', '설명', '금액'];
  const rows = expenses.map((e) => [
    new Date(e.expenseDate).toLocaleDateString('ko-KR'),
    EXPENSE_CATEGORY_LABEL[e.category],
    e.description,
    String(e.amount),
  ]);
  triggerDownload('경비내역.csv', buildCsv(headers, rows));
}

const DIRECTION_LABEL: Record<InvoiceDirection, string> = {
  [InvoiceDirection.SALES]: '매출',
  [InvoiceDirection.PURCHASE]: '매입',
};

export function downloadInvoicesCsv(invoices: TaxInvoice[]): void {
  const headers = ['작성일', '구분', '거래처', '공급가액', '세액'];
  const rows = invoices.map((inv) => [
    new Date(inv.issueDate).toLocaleDateString('ko-KR'),
    DIRECTION_LABEL[inv.direction],
    inv.counterpartyName,
    String(inv.supplyAmount),
    String(inv.taxAmount),
  ]);
  triggerDownload('세금계산서.csv', buildCsv(headers, rows));
}
