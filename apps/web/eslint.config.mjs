import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * Fronteiras de import (docs/frontend/01-arquitetura.md §1.4) — regras
 * customizadas de `no-restricted-imports`, escopadas por `files`, em vez
 * de um plugin dedicado (`eslint-plugin-boundaries`), para manter o setup
 * mínimo nesta etapa; reavaliar se o número de exceções crescer.
 */
const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // components/ (fora de ui/) nunca importa features/ — componente
    // compartilhado não pode conhecer domínio.
    files: ['src/components/**/*.{ts,tsx}'],
    ignores: ['src/components/ui/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@/features/*'], message: 'components/ não pode importar de features/ — ver docs/frontend/01-arquitetura.md §1.4.' }] },
      ],
    },
  },
  {
    // lib/ é a camada mais baixa: nunca importa features/ ou components/.
    files: ['src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/features/*'], message: 'lib/ não pode importar de features/ — ver docs/frontend/01-arquitetura.md §1.4.' },
            { group: ['@/components/*'], message: 'lib/ não pode importar de components/ — ver docs/frontend/01-arquitetura.md §1.4.' },
          ],
        },
      ],
    },
  },
  {
    // stores/ é consumido por features/, nunca o contrário — reafirma
    // docs/frontend/01-arquitetura.md §1.4.
    files: ['src/stores/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@/features/*'], message: 'stores/ não pode importar de features/ — ver docs/frontend/01-arquitetura.md §1.4.' }] },
      ],
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'src/lib/api/generated/**'],
  },
];

export default eslintConfig;
