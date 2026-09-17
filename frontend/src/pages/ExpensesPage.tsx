import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi, CreateExpenseRequest, ExpenseQueryParams } from '@/api/expenses.api';
import { Expense, ExpenseCategory, EXPENSE_CATEGORY_LABEL } from '@/types';
import ConfirmModal from '@/components/common/ConfirmModal';
import { downloadExpensesCsv } from '@/utils/csv';
import { getErrorMessage } from '@/utils/errorMessage';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2022 }, (_, i) => CURRENT_YEAR - i);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

const INITIAL_FORM: CreateExpenseRequest = {
  category: ExpenseCategory.MISC,
  amount: 0,
  description: '',
  expenseDate: new Date().toISOString().split('T')[0],
};

export default function ExpensesPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateExpenseRequest>(INITIAL_FORM);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const [filterYear, setFilterYear] = useState<number | undefined>(undefined);
  const [filterMonth, setFilterMonth] = useState<number | undefined>(undefined);
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | undefined>(undefined);
  const [filterSearch, setFilterSearch] = useState('');

  const filterParams: ExpenseQueryParams = {
    ...(filterYear !== undefined && { year: filterYear }),
    ...(filterMonth !== undefined && { month: filterMonth }),
    ...(filterCategory !== undefined && { category: filterCategory }),
    ...(filterSearch && { search: filterSearch }),
  };

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', filterParams],
    queryFn: () => expensesApi.getAll(filterParams),
  });

  const createMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setForm(INITIAL_FORM);
    },
    onError: (error) => setErrorMessage(getErrorMessage(error, '경비 등록에 실패했습니다')),
  });

  const deleteMutation = useMutation({
    mutationFn: expensesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteTarget(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateExpenseRequest> }) =>
      expensesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setErrorMessage(null);
    createMutation.mutate(form);
  };

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">경비관리</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4">경비 추가</h2>

        {errorMessage && (
          <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-md text-sm">{errorMessage}</div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">카테고리</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {Object.values(ExpenseCategory).map((cat) => (
                <option key={cat} value={cat}>{EXPENSE_CATEGORY_LABEL[cat]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">금액 (원)</label>
            <input
              type="number"
              required
              min={0}
              value={form.amount || ''}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">날짜</label>
            <input
              type="date"
              required
              value={form.expenseDate}
              onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">설명</label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
            >
              {createMutation.isPending ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100">
          <input
            type="text"
            placeholder="설명 검색..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-40"
          />

          <select
            value={filterYear ?? ''}
            onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : undefined)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">연도 전체</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>

          <select
            value={filterMonth ?? ''}
            onChange={(e) => setFilterMonth(e.target.value ? Number(e.target.value) : undefined)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">월 전체</option>
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}월</option>
            ))}
          </select>

          <select
            value={filterCategory ?? ''}
            onChange={(e) =>
              setFilterCategory(e.target.value ? (e.target.value as ExpenseCategory) : undefined)
            }
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">카테고리 전체</option>
            {Object.values(ExpenseCategory).map((cat) => (
              <option key={cat} value={cat}>{EXPENSE_CATEGORY_LABEL[cat]}</option>
            ))}
          </select>

          {(filterYear !== undefined || filterMonth !== undefined || filterCategory !== undefined || filterSearch) && (
            <button
              onClick={() => {
                setFilterYear(undefined);
                setFilterMonth(undefined);
                setFilterCategory(undefined);
                setFilterSearch('');
              }}
              className="text-xs text-gray-400 hover:text-gray-600 px-2"
            >
              초기화
            </button>
          )}

          {expenses.length > 0 && (
            <div className="ml-auto flex items-center gap-3 text-sm">
              <span className="text-gray-400">{expenses.length}건</span>
              <span className="text-gray-300">·</span>
              <span className="font-semibold text-gray-700">{formatKRW(totalAmount)}</span>
              <button
                onClick={() => downloadExpensesCsv(expenses)}
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
          <ExpenseTable
            expenses={expenses}
            onDelete={setDeleteTarget}
            onUpdate={(id, data) => updateMutation.mutate({ id, data })}
            isUpdating={updateMutation.isPending}
          />
        )}
      </div>

      {deleteTarget !== null && (
        <ConfirmModal
          message="이 경비를 삭제할까요? 삭제한 데이터는 복구할 수 없습니다."
          onConfirm={() => deleteMutation.mutate(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
          confirmLabel="삭제"
        />
      )}
    </div>
  );
}

interface ExpenseTableProps {
  expenses: Expense[];
  onDelete: (id: number) => void;
  onUpdate: (id: number, data: Partial<CreateExpenseRequest>) => void;
  isUpdating: boolean;
}

function ExpenseTable({ expenses, onDelete, onUpdate, isUpdating }: ExpenseTableProps): JSX.Element {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<CreateExpenseRequest>>({});

  const startEdit = (expense: Expense): void => {
    setEditingId(expense.id);
    setEditForm({
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      expenseDate: expense.expenseDate.split('T')[0],
    });
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = (): void => {
    if (editingId === null) return;
    onUpdate(editingId, editForm);
    setEditingId(null);
    setEditForm({});
  };

  if (expenses.length === 0) {
    return <div className="p-8 text-center text-gray-400">등록된 경비가 없습니다</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-4 py-3 text-left">카테고리</th>
            <th className="px-4 py-3 text-left">설명</th>
            <th className="px-4 py-3 text-right">금액</th>
            <th className="px-4 py-3 text-left">날짜</th>
            <th className="px-4 py-3 text-center">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {expenses.map((expense) =>
            editingId === expense.id ? (
              <tr key={expense.id} className="bg-blue-50">
                <td className="px-4 py-2">
                  <select
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm({ ...editForm, category: e.target.value as ExpenseCategory })
                    }
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-full"
                  >
                    {Object.values(ExpenseCategory).map((cat) => (
                      <option key={cat} value={cat}>{EXPENSE_CATEGORY_LABEL[cat]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={editForm.description ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-full"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min={0}
                    value={editForm.amount ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-full text-right"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="date"
                    value={editForm.expenseDate ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, expenseDate: e.target.value })}
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-full"
                  />
                </td>
                <td className="px-4 py-2 text-center space-x-2 whitespace-nowrap">
                  <button
                    onClick={saveEdit}
                    disabled={isUpdating}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium disabled:opacity-50"
                  >
                    저장
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="text-gray-500 hover:text-gray-700 text-xs"
                  >
                    취소
                  </button>
                </td>
              </tr>
            ) : (
              <tr key={expense.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                    {EXPENSE_CATEGORY_LABEL[expense.category]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-900">{expense.description}</td>
                <td className="px-4 py-3 text-right text-gray-900">{formatKRW(expense.amount)}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(expense.expenseDate)}</td>
                <td className="px-4 py-3 text-center space-x-3 whitespace-nowrap">
                  <button
                    onClick={() => startEdit(expense)}
                    className="text-blue-500 hover:text-blue-700 text-xs"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => onDelete(expense.id)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
