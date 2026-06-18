import { useState, FormEvent } from 'react';
import { InvoiceDirection } from '@/types';
import { CreateInvoiceRequest } from '@/api/invoices.api';

interface InvoiceCreateModalProps {
  onSubmit: (data: CreateInvoiceRequest) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

const INITIAL_FORM: CreateInvoiceRequest = {
  direction: InvoiceDirection.SALES,
  counterpartyName: '',
  counterpartyBizNumber: '',
  supplyAmount: 0,
  taxAmount: 0,
  issueDate: new Date().toISOString().split('T')[0],
};

export default function InvoiceCreateModal({
  onSubmit,
  onClose,
  isSubmitting,
}: InvoiceCreateModalProps): JSX.Element {
  const [form, setForm] = useState<CreateInvoiceRequest>(INITIAL_FORM);

  const handleSupplyAmountChange = (value: number): void => {
    setForm((prev) => ({
      ...prev,
      supplyAmount: value,
      taxAmount: Math.round(value * 0.1),
    }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    onSubmit({
      ...form,
      counterpartyBizNumber: form.counterpartyBizNumber || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-800">세금계산서 수동 등록</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">구분</label>
            <div className="flex gap-3">
              {([InvoiceDirection.SALES, InvoiceDirection.PURCHASE] as const).map((dir) => (
                <label key={dir} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="direction"
                    value={dir}
                    checked={form.direction === dir}
                    onChange={() => setForm({ ...form, direction: dir })}
                    className="accent-primary-600"
                  />
                  {dir === InvoiceDirection.SALES ? '매출' : '매입'}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">거래처명 *</label>
            <input
              type="text"
              required
              value={form.counterpartyName}
              onChange={(e) => setForm({ ...form, counterpartyName: e.target.value })}
              placeholder="예) 주식회사 홍길동"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">거래처 사업자번호</label>
            <input
              type="text"
              value={form.counterpartyBizNumber ?? ''}
              onChange={(e) => setForm({ ...form, counterpartyBizNumber: e.target.value })}
              placeholder="예) 123-45-67890"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">공급가액 (원) *</label>
              <input
                type="number"
                required
                min={0}
                value={form.supplyAmount || ''}
                onChange={(e) => handleSupplyAmountChange(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">세액 (원) *</label>
              <input
                type="number"
                required
                min={0}
                value={form.taxAmount || ''}
                onChange={(e) => setForm({ ...form, taxAmount: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">작성일 *</label>
            <input
              type="date"
              required
              value={form.issueDate}
              onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-primary-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
