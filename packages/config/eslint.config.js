const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.next/**'],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['**/*.config.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
