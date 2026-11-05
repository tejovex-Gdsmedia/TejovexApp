// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Deno edge function runtime (npm: specifiers, Deno globals) — not the
    // app's RN/Node environment, and not type-checked by tsc either.
    ignores: ['dist/*', 'supabase/functions/**'],
  },
  {
    files: ['supabase/**/*.js'],
    languageOptions: {
      globals: { require: 'readonly', module: 'readonly', process: 'readonly', __dirname: 'readonly' },
    },
  },
]);
