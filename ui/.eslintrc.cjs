/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['next/core-web-vitals', 'plugin:@typescript-eslint/recommended', 'plugin:tailwindcss/recommended', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname
  },
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['node_modules/', '.next/', 'public/', 'commitlint.config.js'],
  settings: {
    tailwindcss: {
      callees: ['cn'],
      config: 'tailwind.config.ts'
    }
  },
  overrides: [
    {
      files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
      parserOptions: {
        project: null
      }
    },
    {
      files: ['next.config.ts', 'next-intl.config.ts', 'tailwind.config.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-require-imports': 'off'
      }
    }
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-empty-object-type': 'off',
    'import/no-anonymous-default-export': 'off',
    'tailwindcss/no-custom-classname': 'off'
  }
};
