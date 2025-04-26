// .eslintrc.js
module.exports = {
  // Tells ESLint to stop looking in parent folders
  root: true,

  // The ONLY thing needed to understand TypeScript syntax
  parser: '@typescript-eslint/parser',

  // Basic parser options - NO tsconfig link here
  parserOptions: {
    ecmaVersion: 'latest', // Or the JS version you target
    sourceType: 'module',  // Use 'script' if you use commonjs 'require'
  },

  // Include the plugin needed for the parser, but DON'T extend its rules
  plugins: [
    '@typescript-eslint',
  ],

  // *** NO "extends" *** - This means NO eslint:recommended, NO plugin rulesets. ZERO inherited rules.
  extends: [], // Explicitly showing no extends for clarity, same as omitting it

  // *** NO "rules" *** - This means ZERO rules are enabled by this config.
  rules: {},

  // *** ONLY ignore the directory YOU specified ***
  ignorePatterns: [
    '.mastra/',
  ],
};