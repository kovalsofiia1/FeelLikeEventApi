// import globals from "globals";
// import pluginJs from "@eslint/js";
// import tseslint from "typescript-eslint";


// /** @type {import('eslint').Linter.Config[]} */
// export default [
//   { files: ["src/**/*.{js,mjs,cjs,ts}"] },
//   { languageOptions: { globals: globals.browser } },
//   pluginJs.configs.recommended,
//   ...tseslint.configs.recommended,
// ];

import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

/** @type {import('eslint').Linter.Config} */
export default {
  files: ["src/**/*.{js,mjs,cjs,ts}"],
  languageOptions: {
    parser: tsParser,
    globals: {
      ...globals.browser, // Для браузера
      ...globals.node, // Додає глобальні змінні Node.js, включно з `process` та `__dirname`
    },
  },
  plugins: {
    "@typescript-eslint": tseslint,
  },
  rules: {
    ...pluginJs.configs.recommended.rules,
    ...tseslint.configs.recommended.rules,
    "@typescript-eslint/no-explicit-any": "off", // Вимкнути правило `no-explicit-any`
  },
};
