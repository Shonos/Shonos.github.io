import js from '@eslint/js';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
    globalIgnores(['dist/**', 'public/theme-init.js', 'node_modules/**', 'playwright-report/**', 'test-results/**', '.impeccable/**']),
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: globals.node
        },
        rules: {
            'no-unused-vars': ['error', { args: 'after-used', caughtErrors: 'none', argsIgnorePattern: '^_' }],
            'no-control-regex': 'off',
            'no-useless-assignment': 'off',
            'preserve-caught-error': 'off'
        }
    },
    {
        files: ['src/**/*.js', 'tests/e2e/**/*.js'],
        languageOptions: { globals: globals.browser }
    }
]);
