import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import { dashboardApi } from '@/api/dashboard.api';
import { EXPENSE_CATEGORY_LABEL } from '@/types';
import VatDeadlineBanner from '@/components/common/VatDeadlineBanner';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2022 }, (_, i) => CURRENT_YEAR - i);

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

function formatBillions(amount: number): string {
  if (Math.abs(amount) >= 100_000_000) return (amount / 100_000_000).toFixed(1) + '억';
  if (Math.abs(amount) >= 10_000) return Math.round(amount / 10_000) + '만';
  return amount.toLocaleString('ko-KR');
}

function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function BarTooltip({ active, payload, label }: ChartTooltipProps): JSX.Element | null {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="leading-5" style={{ color: entry.color }}>
          {entry.name}: {formatKRW(entry.value)}
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: ChartTooltipProps): JSX.Element | null {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-gray-700">{payload[0].name}</p>
      <p className="text-gray-500">{formatKRW(payload[0].value)}</p>
    </div>
  );
}

export default function DashboardPage(): JSX.Element {
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard', 'summary', selectedYear],
    queryFn: () => dashboardApi.getSummary(selectedYear),
  });

  const chartData = summary?.monthlyTrend.map((t) => ({
    month: `${t.month}월`,
    매출: t.salesAmount,
    매입: t.purchaseAmount,
  })) ?? [];

  const pieData = (summary?.categoryBreakdown ?? [])
    .filter((c) => c.total > 0)
    .map((c) => ({ name: EXPENSE_CATEGORY_LABEL[c.category], value: c.total }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm animate-pulse">불러오는 중...</div>
      </div>
    );
  }

  const vat = summary?.estimatedVat ?? 0;

  return (
    <div className="space-y-5">
      <VatDeadlineBanner />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </select>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="연간 매출" amount={summary?.salesSupplyAmount ?? 0} sub={`세액 ${formatBillions(summary?.salesTaxAmount ?? 0)}`} accent="blue" />
        <KpiCard label="연간 매입" amount={summary?.purchaseSupplyAmount ?? 0} sub={`세액 ${formatBillions(summary?.purchaseTaxAmount ?? 0)}`} accent="emerald" />
        <KpiCard label="납부 예상 부가세" amount={vat} sub="매출세액 − 매입세액" accent={vat >= 0 ? 'rose' : 'emerald'} />
        <KpiCard label="총 경비" amount={summary?.totalExpenses ?? 0} sub="등록된 경비 합계" accent="violet" />
      </div>

      {/* 월별 추이 차트 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5">월별 매출 / 매입 추이</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v: number) => formatBillions(v)}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip content={<BarTooltip />} cursor={{ fill: '#F9FAFB' }} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" iconSize={7} />
            <Bar dataKey="매출" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="매입" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 하단 2열 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 경비 도넛 차트 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">카테고리별 경비</h2>
            {pieData.length > 0 && (
              <span className="text-xs text-gray-400">{formatKRW(summary?.totalExpenses ?? 0)}</span>
            )}
          </div>
          {pieData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-44 gap-2">
              <div className="w-20 h-20 rounded-full border-4 border-dashed border-gray-200" />
              <p className="text-xs text-gray-400">등록된 경비가 없습니다</p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="shrink-0">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={46} outerRadius={72} paddingAngle={2} dataKey="value" strokeWidth={0}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {pieData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-gray-500 truncate">{item.name}</span>
                    </div>
                    <span className="font-medium text-gray-800 shrink-0">{formatBillions(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 부가세 계산 요약 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">부가세 계산 요약</h2>
          <div className="space-y-3">
            <SummaryRow label="매출 공급가액" value={summary?.salesSupplyAmount ?? 0} color="blue" />
            <SummaryRow label="매출 세액 (10%)" value={summary?.salesTaxAmount ?? 0} color="blue" sub />
            <div className="border-t border-gray-100 pt-3 space-y-3">
              <SummaryRow label="매입 공급가액" value={summary?.purchaseSupplyAmount ?? 0} color="emerald" />
              <SummaryRow label="매입 세액 (공제)" value={summary?.purchaseTaxAmount ?? 0} color="emerald" sub />
            </div>
            <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
              <p className="font-semibold text-gray-800 text-sm">납부 예상 부가세</p>
              <p className={`text-xl font-bold ${vat >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatKRW(vat)}
              </p>
            </div>
            <p className="text-xs text-gray-400 text-right">
              {vat >= 0 ? '납부해야 합니다' : '환급 예정입니다'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface KpiCardProps {
  label: string;
  amount: number;
  sub: string;
  accent: 'blue' | 'emerald' | 'rose' | 'violet';
}

const ACCENT = {
  blue:    { bar: 'bg-blue-500',    text: 'text-blue-700',    bg: 'bg-blue-50' },
  emerald: { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  rose:    { bar: 'bg-rose-500',    text: 'text-rose-700',    bg: 'bg-rose-50' },
  violet:  { bar: 'bg-violet-500',  text: 'text-violet-700',  bg: 'bg-violet-50' },
};

function KpiCard({ label, amount, sub, accent }: KpiCardProps): JSX.Element {
  const c = ACCENT[accent];
  return (
    <div className={`rounded-xl border border-gray-100 shadow-sm p-5 ${c.bg} relative overflow-hidden`}>
      <div className={`absolute left-0 top-0 w-1 h-full ${c.bar}`} />
      <p className="text-xs text-gray-500 font-medium pl-2 mb-1">{label}</p>
      <p className={`text-2xl font-bold pl-2 ${c.text}`}>
        {formatBillions(Math.abs(amount))}
        {amount < 0 && <span className="text-sm font-normal ml-0.5">환급</span>}
      </p>
      <p className="text-xs text-gray-400 pl-2 mt-0.5">{sub}</p>
    </div>
  );
}

interface SummaryRowProps {
  label: string;
  value: number;
  color: 'blue' | 'emerald';
  sub?: boolean;
}

function SummaryRow({ label, value, color, sub = false }: SummaryRowProps): JSX.Element {
  const textColor = color === 'blue' ? 'text-blue-700' : 'text-emerald-700';
  return (
    <div className={`flex items-center justify-between text-sm ${sub ? 'pl-4' : ''}`}>
      <span className={sub ? 'text-xs text-gray-400' : 'text-gray-600'}>{label}</span>
      <span className={`font-semibold ${sub ? 'text-xs' : ''} ${textColor}`}>{formatBillions(value)}</span>
    </div>
  );
}
