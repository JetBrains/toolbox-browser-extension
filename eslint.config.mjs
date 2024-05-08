import babelParser from '@babel/eslint-parser';
import globals from 'globals';

export default [
  {
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        ecmaVersion: 'latest',
        requireConfigFile: false,
        babelOptions: {
          configFile: './babel.config.json'
        }
      },
      globals: {
        ...globals.es2021,
        ...globals.webextensions
      }
    },
    rules: {
      'max-len': ['error', {'code': 120, 'tabWidth': 2}],
      'no-magic-numbers': ['error', {'ignore': [0, 1]}],
      'indent': ['error', 2, {
        'ignoredNodes': ['TemplateLiteral', 'SwitchCase']
      }]
    }
  },
  {
    ignores: ['dist/*', '.scripts/*', 'eslint.config.mjs'],
  }
];
