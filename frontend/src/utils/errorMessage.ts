import axios from 'axios';

const DEFAULT_MESSAGE = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요';
const NETWORK_MESSAGE = '서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해 주세요';

function extractServerMessage(data: unknown): string | null {
  if (data && typeof data === 'object' && 'message' in data) {
    const { message } = data as { message?: unknown };
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
    if (Array.isArray(message) && message.length > 0) {
      return message.join(', ');
    }
  }
  return null;
}

export function getErrorMessage(error: unknown, fallback: string = DEFAULT_MESSAGE): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  if (!error.response) {
    return NETWORK_MESSAGE;
  }

  const serverMessage = extractServerMessage(error.response.data);

  switch (error.response.status) {
    case 400:
      return serverMessage ?? '입력값이 올바르지 않습니다';
    case 401:
      return serverMessage ?? '인증에 실패했습니다. 이메일과 비밀번호를 확인해 주세요';
    case 403:
      return serverMessage ?? '권한이 없습니다';
    case 404:
      return serverMessage ?? '대상을 찾을 수 없습니다';
    case 409:
      return serverMessage ?? '이미 등록된 데이터입니다';
    default:
      return serverMessage ?? fallback;
  }
}

export { NETWORK_MESSAGE };
