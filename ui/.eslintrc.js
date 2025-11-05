/** @type {import('eslint').Linter.Config} */
export default {
  root: true,
  extends: ['next/core-web-vitals', 'plugin:@typescript-eslint/recommended', 'plugin:tailwindcss/recommended', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json'
  },
  plugins: ['@typescript-eslint'],
  settings: {
    tailwindcss: {
      callees: ['cn'],
      config: 'tailwind.config.ts'
    }
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'tailwindcss/no-custom-classname': 'off'
  }
};
