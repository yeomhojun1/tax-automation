import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/auth.api';
import useAuthStore from '@/store/useAuthStore';
import { DEMO_ACCOUNT } from './isDemo';

export default function DemoLoginButton(): JSX.Element {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const mutation = useMutation({
    mutationFn: () => authApi.login({ ...DEMO_ACCOUNT }),
    onSuccess: (result) => {
      login(result.user, result.accessToken);
      navigate('/dashboard');
    },
  });

  return (
    <div className="mb-6 p-4 rounded-md bg-amber-50 border border-amber-200">
      <p className="text-sm text-amber-900 mb-3">
        가상의 빵집 데이터가 미리 들어 있는 데모 계정으로 바로 둘러볼 수 있습니다.
      </p>
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="w-full bg-amber-500 text-white py-2 px-4 rounded-md hover:bg-amber-600 disabled:opacity-50 font-medium"
      >
        {mutation.isPending ? '들어가는 중...' : '데모 계정으로 바로 시작'}
      </button>
      <p className="mt-2 text-xs text-amber-800">
        직접 입력하려면 {DEMO_ACCOUNT.email} / {DEMO_ACCOUNT.password}
      </p>
    </div>
  );
}
