// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['supabase/**/*.js'],
    languageOptions: {
      globals: { require: 'readonly', module: 'readonly', process: 'readonly', __dirname: 'readonly' },
    },
  },
]);
