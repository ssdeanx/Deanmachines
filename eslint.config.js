// .eslintrc.js
export const root = true;
export const parser = '@typescript-eslint/parser';
export const parserOptions = {
  ecmaVersion: 'latest', // Or the JS version you target
  sourceType: 'module', // Use 'script' if you use commonjs 'require'
};
export const plugins = [
  '@typescript-eslint',
  'prettier',
];
export const extendRules = [];export const rules = {};
export const ignorePatterns = [
  '.mastra/',
  'node_modules/',
];