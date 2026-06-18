import { TaxInvoice, InvoiceDirection, TaxType } from '@/types';

const DIRECTION_LABEL: Record<InvoiceDirection, string> = {
  [InvoiceDirection.SALES]: '매출',
  [InvoiceDirection.PURCHASE]: '매입',
};

const TAX_TYPE_LABEL: Record<TaxType, string> = {
  [TaxType.TAXABLE]: '과세',
  [TaxType.ZERO_RATE]: '영세율',
  [TaxType.EXEMPT]: '면세',
  [TaxType.STATEMENT]: '계산서',
};

function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

interface InvoiceDetailModalProps {
  invoice: TaxInvoice;
  onClose: () => void;
}

export default function InvoiceDetailModal({ invoice, onClose }: InvoiceDetailModalProps): JSX.Element {
  const isDirectionSales = invoice.direction === InvoiceDirection.SALES;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                isDirectionSales ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
              }`}
            >
              {DIRECTION_LABEL[invoice.direction]}
            </span>
            <h2 className="text-lg font-bold text-gray-900">세금계산서 상세</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <InfoRow label="계산서 번호" value={invoice.invoiceNumber} />
            <InfoRow label="거래처" value={invoice.counterpartyName} />
            <InfoRow label="거래처 사업자번호" value={invoice.counterpartyBizNumber ?? '-'} />
            <InfoRow label="세금 유형" value={TAX_TYPE_LABEL[invoice.taxType]} />
            <InfoRow label="발행일" value={formatDate(invoice.issueDate)} />
            <InfoRow label="공급가액" value={formatKRW(Number(invoice.supplyAmount))} />
            <InfoRow label="세액" value={formatKRW(Number(invoice.taxAmount))} />
            <InfoRow
              label="합계"
              value={formatKRW(Number(invoice.supplyAmount) + Number(invoice.taxAmount))}
              highlight
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">품목 내역</h3>
            {invoice.items.length === 0 ? (
              <p className="text-sm text-gray-400 py-3">품목 내역이 없습니다</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left">품명</th>
                      <th className="px-3 py-2 text-left">규격</th>
                      <th className="px-3 py-2 text-right">수량</th>
                      <th className="px-3 py-2 text-right">단가</th>
                      <th className="px-3 py-2 text-right">공급가액</th>
                      <th className="px-3 py-2 text-right">세액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoice.items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-900">{item.itemName}</td>
                        <td className="px-3 py-2 text-gray-500">{item.specification ?? '-'}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{formatKRW(Number(item.unitPrice))}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{formatKRW(Number(item.supplyAmount))}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{formatKRW(Number(item.taxAmount))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-medium">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-right text-gray-600">합계</td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {formatKRW(invoice.items.reduce((s, i) => s + Number(i.supplyAmount), 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {formatKRW(invoice.items.reduce((s, i) => s + Number(i.taxAmount), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function InfoRow({ label, value, highlight = false }: InfoRowProps): JSX.Element {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`font-medium mt-0.5 ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
