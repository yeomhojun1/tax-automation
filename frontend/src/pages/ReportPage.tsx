import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { invoicesApi } from '@/api/invoices.api';
import { InvoiceSummary } from '@/types';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2022 }, (_, i) => CURRENT_YEAR - i);
const QUARTERS = [1, 2, 3, 4] as const;
const QUARTER_LABEL: Record<number, string> = { 1: '1분기 (1~3월)', 2: '2분기 (4~6월)', 3: '3분기 (7~9월)', 4: '4분기 (10~12월)' };

function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

export default function ReportPage(): JSX.Element {
  const [year, setYear] = useState(CURRENT_YEAR);

  const quarterResults = useQueries({
    queries: QUARTERS.map((quarter) => ({
      queryKey: ['invoice-summary', year, quarter],
      queryFn: () => invoicesApi.getSummary({ year, quarter }),
    })),
  });

  const isLoading = quarterResults.some((r) => r.isLoading);
  const summaries = quarterResults.map((r) => r.data);

  const annualTotal = summaries.reduce<Pick<InvoiceSummary, 'salesTaxAmount' | 'purchaseTaxAmount' | 'salesSupplyAmount' | 'purchaseSupplyAmount' | 'estimatedVat'>>(
    (acc, s) => ({
      salesSupplyAmount: acc.salesSupplyAmount + (s?.salesSupplyAmount ?? 0),
      salesTaxAmount: acc.salesTaxAmount + (s?.salesTaxAmount ?? 0),
      purchaseSupplyAmount: acc.purchaseSupplyAmount + (s?.purchaseSupplyAmount ?? 0),
      purchaseTaxAmount: acc.purchaseTaxAmount + (s?.purchaseTaxAmount ?? 0),
      estimatedVat: acc.estimatedVat + (s?.estimatedVat ?? 0),
    }),
    { salesSupplyAmount: 0, salesTaxAmount: 0, purchaseSupplyAmount: 0, purchaseTaxAmount: 0, estimatedVat: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">부가세 신고 리포트</h1>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-gray-500">불러오는 중...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {QUARTERS.map((quarter, idx) => {
              const summary = summaries[idx];
              return <QuarterCard key={quarter} quarter={quarter} summary={summary} />;
            })}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-4">{year}년 연간 합계</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left">구분</th>
                    <th className="px-4 py-3 text-right">매출 공급가액</th>
                    <th className="px-4 py-3 text-right">매출 세액</th>
                    <th className="px-4 py-3 text-right">매입 공급가액</th>
                    <th className="px-4 py-3 text-right">매입 세액</th>
                    <th className="px-4 py-3 text-right">납부 예상액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {QUARTERS.map((quarter, idx) => {
                    const s = summaries[idx];
                    return (
                      <tr key={quarter} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-700">{QUARTER_LABEL[quarter]}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatKRW(s?.salesSupplyAmount ?? 0)}</td>
                        <td className="px-4 py-3 text-right text-blue-700">{formatKRW(s?.salesTaxAmount ?? 0)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatKRW(s?.purchaseSupplyAmount ?? 0)}</td>
                        <td className="px-4 py-3 text-right text-green-700">{formatKRW(s?.purchaseTaxAmount ?? 0)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${(s?.estimatedVat ?? 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatKRW(s?.estimatedVat ?? 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold">
                  <tr>
                    <td className="px-4 py-3 text-gray-800">연간 합계</td>
                    <td className="px-4 py-3 text-right text-gray-800">{formatKRW(annualTotal.salesSupplyAmount)}</td>
                    <td className="px-4 py-3 text-right text-blue-700">{formatKRW(annualTotal.salesTaxAmount)}</td>
                    <td className="px-4 py-3 text-right text-gray-800">{formatKRW(annualTotal.purchaseSupplyAmount)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{formatKRW(annualTotal.purchaseTaxAmount)}</td>
                    <td className={`px-4 py-3 text-right ${annualTotal.estimatedVat >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatKRW(annualTotal.estimatedVat)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface QuarterCardProps {
  quarter: number;
  summary: InvoiceSummary | undefined;
}

function QuarterCard({ quarter, summary }: QuarterCardProps): JSX.Element {
  const vat = summary?.estimatedVat ?? 0;
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <p className="text-xs font-semibold text-gray-500 mb-3">{QUARTER_LABEL[quarter]}</p>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">매출 세액</span>
          <span className="text-blue-700 font-medium">{formatKRW(summary?.salesTaxAmount ?? 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">매입 세액</span>
          <span className="text-green-700 font-medium">{formatKRW(summary?.purchaseTaxAmount ?? 0)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-semibold">
          <span className="text-gray-700">납부 예상액</span>
          <span className={vat >= 0 ? 'text-red-600' : 'text-green-600'}>{formatKRW(vat)}</span>
        </div>
      </div>
    </div>
  );
}
