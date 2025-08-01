import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import json from "@eslint/json";
import { defineConfig } from "eslint/config";
import path from "path";

export default defineConfig([
  { ignores: ["dist/**", "coverage/**"] },
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: { js }, extends: ["js/recommended"] },
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], languageOptions: { globals: globals.node } },
  {
    files: ["src/**/*.{js,mjs,cjs,ts,mts,cts}", "test/**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { "@typescript-eslint": tseslint.plugin },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: path.resolve("./tsconfig.json"),
        tsconfigRootDir: path.resolve("."),
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "no-await-in-loop": "warn"
    }
  },
  tseslint.configs.recommended,
  { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
]);
