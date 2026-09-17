import { useState, FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/auth.api';
import useAuthStore from '@/store/useAuthStore';
import { getErrorMessage } from '@/utils/errorMessage';

const INITIAL_PW_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function ProfilePage(): JSX.Element {
  const { user, updateUser } = useAuthStore();

  const [form, setForm] = useState({
    businessName: user?.businessName ?? '',
    businessNumber: user?.businessNumber ?? '',
    isGeneralTaxpayer: user?.isGeneralTaxpayer ?? true,
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [pwForm, setPwForm] = useState(INITIAL_PW_FORM);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      setSuccessMessage('프로필이 저장되었습니다');
      setErrorMessage(null);
    },
    onError: (error) => {
      setErrorMessage(getErrorMessage(error, '저장에 실패했습니다'));
      setSuccessMessage(null);
    },
  });

  const changePwMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      setPwSuccess('비밀번호가 변경되었습니다');
      setPwError(null);
      setPwForm(INITIAL_PW_FORM);
    },
    onError: (error) => {
      setPwError(getErrorMessage(error, '비밀번호 변경에 실패했습니다'));
      setPwSuccess(null);
    },
  });

  const handlePwSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('새 비밀번호가 일치하지 않습니다');
      return;
    }
    changePwMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    updateMutation.mutate({
      businessName: form.businessName,
      businessNumber: form.businessNumber || null,
      isGeneralTaxpayer: form.isGeneralTaxpayer,
    });
  };

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900">프로필 설정</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-1 text-sm text-gray-500">
        <p>이메일: <span className="text-gray-900 font-medium">{user?.email}</span></p>
        <p className="text-xs text-gray-400">이메일은 변경할 수 없습니다</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4">사업자 정보</h2>

        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">{successMessage}</div>
        )}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{errorMessage}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상호명</label>
            <input
              type="text"
              required
              maxLength={100}
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사업자번호
              <span className="text-xs text-gray-400 ml-1">(XML 매출/매입 방향 판별에 사용됩니다)</span>
            </label>
            <input
              type="text"
              maxLength={20}
              placeholder="000-00-00000"
              value={form.businessNumber}
              onChange={(e) => setForm({ ...form, businessNumber: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isGeneralTaxpayer"
              checked={form.isGeneralTaxpayer}
              onChange={(e) => setForm({ ...form, isGeneralTaxpayer: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded"
            />
            <label htmlFor="isGeneralTaxpayer" className="text-sm text-gray-700">
              일반과세자 (체크 해제 시 간이과세자)
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
            >
              {updateMutation.isPending ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4">비밀번호 변경</h2>

        {pwSuccess && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">{pwSuccess}</div>
        )}
        {pwError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{pwError}</div>
        )}

        <form onSubmit={handlePwSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">현재 비밀번호</label>
            <input
              type="password"
              required
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
            <input
              type="password"
              required
              minLength={8}
              value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
              placeholder="8자 이상"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인</label>
            <input
              type="password"
              required
              minLength={8}
              value={pwForm.confirmPassword}
              onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={changePwMutation.isPending}
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
            >
              {changePwMutation.isPending ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
