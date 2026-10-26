import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // VITE_DEMO=true(환경변수 또는 .env.demo)일 때만 GitHub Pages 하위 경로로 빌드
  const isDemo = loadEnv(mode, process.cwd(), 'VITE_').VITE_DEMO === 'true';

  return {
    base: isDemo ? '/tax-automation/' : '/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3002,
    },
  };
});
