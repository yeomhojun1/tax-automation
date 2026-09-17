const DEFAULT_API_URL = 'http://localhost:4002';

const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;

if (!configuredApiUrl) {
  console.warn(
    `[config] VITE_API_URL이 설정되지 않아 기본값 ${DEFAULT_API_URL} 을 사용합니다. frontend/.env 를 만들어 주세요.`,
  );
}

const env = {
  apiUrl: configuredApiUrl || DEFAULT_API_URL,
};

export default env;
