import useAuthStore from '@/store/useAuthStore';

interface Deadline {
  label: string;
  date: Date;
}

const SHOW_WITHIN_DAYS = 30;

function getUpcomingDeadlines(today: Date): Deadline[] {
  const year = today.getFullYear();
  return [
    { label: `${year - 1}년 2기 부가세 확정신고`, date: new Date(year, 0, 25) },
    { label: `${year}년 1기 부가세 확정신고`, date: new Date(year, 6, 25) },
    { label: `${year}년 2기 부가세 확정신고`, date: new Date(year + 1, 0, 25) },
  ].filter((d) => d.date >= today);
}

function getDaysLeft(today: Date, target: Date): number {
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function VatDeadlineBanner(): JSX.Element | null {
  const isGeneralTaxpayer = useAuthStore((s: { user: { isGeneralTaxpayer?: boolean } | null }) => s.user?.isGeneralTaxpayer);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = getUpcomingDeadlines(today);
  if (upcoming.length === 0) return null;

  const nearest = upcoming[0];

  // 간이과세자는 1기 신고 없음 (연 1회 1월 신고만)
  const isFirst = nearest.label.includes('1기');
  if (isGeneralTaxpayer === false && isFirst) {
    if (upcoming.length < 2) return null;
    const next = upcoming[1];
    const daysToNext = getDaysLeft(today, next.date);
    if (daysToNext > SHOW_WITHIN_DAYS) return null;
    return renderBanner(next.label, next.date, daysToNext);
  }

  const daysLeft = getDaysLeft(today, nearest.date);
  if (daysLeft > SHOW_WITHIN_DAYS) return null;

  return renderBanner(nearest.label, nearest.date, daysLeft);
}

function renderBanner(label: string, date: Date, daysLeft: number): JSX.Element {
  const isUrgent = daysLeft <= 7;
  const dateStr = date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

  return (
    <div
      className={`flex items-center justify-between rounded-xl px-5 py-3.5 text-sm ${
        isUrgent
          ? 'bg-red-50 border border-red-200 text-red-800'
          : 'bg-amber-50 border border-amber-200 text-amber-800'
      }`}
    >
      <div>
        <span className="font-semibold">{label}</span>
        <span className="ml-2 text-xs opacity-70">마감 {dateStr}</span>
      </div>
      <div className={`font-bold text-base tabular-nums ${isUrgent ? 'text-red-600' : 'text-amber-600'}`}>
        D-{daysLeft}
      </div>
    </div>
  );
}
