const js = require('@eslint/js');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const prettier = require('eslint-config-prettier');

module.exports = [
  js.configs.recommended,
  prettier,
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        // Node globals
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        FormData: 'readonly',
        alert: 'readonly',
        confirm: 'readonly'
      }
    },
    plugins: {
      react,
      'react-hooks': reactHooks
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  },
  {
    ignores: ['**/node_modules/**', '**/build/**', '**/dist/**', '**/*.min.js']
  }
];
