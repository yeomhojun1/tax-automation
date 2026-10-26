/** VITE_DEMO=true 로 빌드했을 때만 true. 서버 없이 브라우저 안의 가짜 API로 동작한다. */
export const IS_DEMO = import.meta.env.VITE_DEMO === 'true';

export const DEMO_ACCOUNT = {
  email: 'demo@example.com',
  password: 'demo1234',
} as const;
