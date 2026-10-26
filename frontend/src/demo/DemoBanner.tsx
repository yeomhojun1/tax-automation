import { resetDemoData } from './mockAdapter';

export default function DemoBanner(): JSX.Element {
  const handleReset = (): void => {
    if (!window.confirm('데모 데이터를 처음 상태로 되돌릴까요? 직접 추가·수정한 내용은 사라집니다.')) return;
    resetDemoData();
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.reload();
  };

  return (
    <div className="sticky top-0 z-50 bg-amber-100 border-b border-amber-300 text-amber-900 text-sm px-4 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
      <span className="font-medium">
        데모 모드: 실제 서버 없이 브라우저 안에서 가짜 데이터로 동작합니다
      </span>
      <span className="text-amber-700">(입력한 내용은 이 브라우저에만 저장됩니다)</span>
      <button
        type="button"
        onClick={handleReset}
        className="underline hover:text-amber-950"
      >
        데이터 초기화
      </button>
    </div>
  );
}
