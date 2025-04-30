// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';


export default tseslint.config(
  // ... ignores ...
  js.configs.recommended,

  // Explicitly configure for your source files
  {
    // Target your source files (adjust patterns if needed)
    files: ['src/**/*.ts', 'src/**/*.js', 'src/**/*.tsx', 'src/**/*.jsx'],
    languageOptions: {
      parser: tseslint.parser, // Ensure the TypeScript parser is used
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module', // Explicitly set sourceType to module
        project: true, // If using type-aware linting
        tsconfigRootDir: import.meta.dirname, // If using type-aware linting
      },
    },
    // Add the recommended TS rules here if not using the spread above
    // extends: [...tseslint.configs.recommended],
    rules: {
      // ... your rules
    },
  },

  // Ensure the spread config is still included for other potential settings
  ...tseslint.configs.recommended, // Keep this if it provides other necessary configurations



  // ... custom overrides ...
);