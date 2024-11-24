import babelParser from "@babel/eslint-parser";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";

const TAB_WIDTH = 2;

export default [
  {
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        ecmaVersion: "latest",
        requireConfigFile: false,
        babelOptions: {
          configFile: "./babel.config.json",
        },
      },
      globals: {
        ...globals.es2021,
        ...globals.webextensions,
      },
    },
    rules: {
      "max-len": ["error", { code: 120, tabWidth: 2 }],
      "no-magic-numbers": ["error", { ignore: [0, 1] }],
      indent: [
        "error",
        TAB_WIDTH,
        {
          ignoredNodes: ["TemplateLiteral", "SwitchCase"],
        },
      ],
    },
  },
  {
    ignores: ["dist/*", ".scripts/*"],
  },
  eslintConfigPrettier,
];
