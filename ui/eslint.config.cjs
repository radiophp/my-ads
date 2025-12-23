const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'public/**',
      'commitlint.config.js',
      'eslint.config.cjs',
    ],
  },
  ...compat.config(require('./.eslintrc.cjs')),
];
