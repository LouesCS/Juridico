import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    clearMocks: true,
    // 5s (padrão) é apertado demais para testes com userEvent (digitação
    // simulada + abertura de Dialog/Select) rodando em paralelo — em
    // máquinas mais lentas isso causa timeout intermitente mesmo em
    // testes que passam sempre quando rodados isolados. Não mascara bug
    // real: nenhuma asserção muda, só o teto de tempo.
    testTimeout: 20000,
    // Suítes em paralelo competindo por CPU nesta máquina causavam timeout
    // intermitente mesmo com testTimeout maior — rodar os arquivos de
    // teste em sequência é mais lento no total, mas determinístico.
    fileParallelism: false,
    env: {
      NEXT_PUBLIC_API_URL: 'http://localhost:3000/api/v1',
      NEXT_PUBLIC_API_MOCKING: 'disabled',
    },
    exclude: ['**/node_modules/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/lib/api/generated/**', 'src/mocks/**', 'src/test/**'],
    },
  },
});
