import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '@/api/invoices.api';
import { InvoiceDirection, TaxInvoice } from '@/types';
import InvoiceUpload from '@/components/invoice/InvoiceUpload';
import InvoiceDetailModal from '@/components/invoice/InvoiceDetailModal';
import InvoiceCreateModal from '@/components/invoice/InvoiceCreateModal';
import ConfirmModal from '@/components/common/ConfirmModal';
import { downloadInvoicesCsv } from '@/utils/csv';

const DIRECTION_LABEL: Record<InvoiceDirection, string> = {
  [InvoiceDirection.SALES]: '매출',
  [InvoiceDirection.PURCHASE]: '매입',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

export default function InvoicesPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<InvoiceDirection | undefined>(undefined);
  const [selectedInvoice, setSelectedInvoice] = useState<TaxInvoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const queryParams = {
    ...(activeTab && { direction: activeTab }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  };

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', queryParams],
    queryFn: () => invoicesApi.getAll(queryParams),
  });

  const createMutation = useMutation({
    mutationFn: invoicesApi.createManual,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setShowCreateModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: invoicesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteTarget(null);
    },
  });

  const totalSupply = invoices.reduce((sum, inv) => sum + Number(inv.supplyAmount), 0);
  const totalTax = invoices.reduce((sum, inv) => sum + Number(inv.taxAmount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">세금계산서</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          수동 등록
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-3">세금계산서 업로드</h2>
        <InvoiceUpload />
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="flex border-b">
          {([undefined, InvoiceDirection.SALES, InvoiceDirection.PURCHASE] as const).map((tab) => (
            <button
              key={tab ?? 'all'}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === undefined ? '전체' : DIRECTION_LABEL[tab]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">기간</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="text-gray-400 text-xs">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              초기화
            </button>
          )}

          {invoices.length > 0 && (
            <div className="ml-auto flex items-center gap-3 text-sm">
              <span className="text-gray-400">{invoices.length}건</span>
              <span className="text-gray-600">
                공급가액 <strong className="text-gray-800">{formatKRW(totalSupply)}</strong>
              </span>
              <span className="text-gray-600">
                세액 <strong className="text-gray-800">{formatKRW(totalTax)}</strong>
              </span>
              <button
                onClick={() => downloadInvoicesCsv(invoices)}
                className="text-xs text-primary-600 hover:text-primary-800 border border-primary-300 rounded px-2 py-1"
              >
                CSV 내보내기
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">불러오는 중...</div>
        ) : (
          <InvoiceTable
            invoices={invoices}
            onDelete={setDeleteTarget}
            onSelect={setSelectedInvoice}
          />
        )}
      </div>

      {showCreateModal && (
        <InvoiceCreateModal
          onSubmit={(data) => createMutation.mutate(data)}
          onClose={() => setShowCreateModal(false)}
          isSubmitting={createMutation.isPending}
        />
      )}

      {selectedInvoice && (
        <InvoiceDetailModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}

      {deleteTarget !== null && (
        <ConfirmModal
          message="이 세금계산서를 삭제할까요? 삭제한 데이터는 복구할 수 없습니다."
          onConfirm={() => deleteMutation.mutate(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
          confirmLabel="삭제"
        />
      )}
    </div>
  );
}

interface InvoiceTableProps {
  invoices: TaxInvoice[];
  onDelete: (id: number) => void;
  onSelect: (invoice: TaxInvoice) => void;
}

function InvoiceTable({ invoices, onDelete, onSelect }: InvoiceTableProps): JSX.Element {
  if (invoices.length === 0) {
    return <div className="p-8 text-center text-gray-400">등록된 세금계산서가 없습니다</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-4 py-3 text-left">구분</th>
            <th className="px-4 py-3 text-left">거래처</th>
            <th className="px-4 py-3 text-right">공급가액</th>
            <th className="px-4 py-3 text-right">세액</th>
            <th className="px-4 py-3 text-left">작성일</th>
            <th className="px-4 py-3 text-center">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {invoices.map((invoice) => (
            <tr
              key={invoice.id}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => onSelect(invoice)}
            >
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    invoice.direction === InvoiceDirection.SALES
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {DIRECTION_LABEL[invoice.direction]}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-900">{invoice.counterpartyName}</td>
              <td className="px-4 py-3 text-right text-gray-900">{formatKRW(invoice.supplyAmount)}</td>
              <td className="px-4 py-3 text-right text-gray-900">{formatKRW(invoice.taxAmount)}</td>
              <td className="px-4 py-3 text-gray-500">{formatDate(invoice.issueDate)}</td>
              <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onDelete(invoice.id)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
