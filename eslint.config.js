// eslint.config.js
import js from '@eslint/js'; // Import base JavaScript recommended rules
import tseslint from 'typescript-eslint'; // Import typescript-eslint utilities
import pluginPrettier from 'eslint-plugin-prettier'; // Import prettier plugin
import configPrettier from 'eslint-config-prettier'; // Import prettier config to disable conflicting rules

export default [
  // 1. Global ignores
  {
    ignores: [
      '.mastra/**/*',       // Use glob patterns
      'node_modules/**/*',
      '.vscode/**/*',     // Add other build/output directories if needed
    ],
  },

  // 2. Base JavaScript configuration (applies to all JS/TS files unless overridden)
  js.configs.recommended,

  // 3. TypeScript configuration
  // This uses the recommended configs from typescript-eslint v9+
  // It applies the parser and plugin to TS/JS files.
  ...tseslint.configs.recommended, // Or use .recommendedTypeChecked for type-aware rules

  // Example override if you *only* want TS rules on TS files:
  // {
  //   files: ['**/*.{ts,tsx,mts,cts}'],
  //   ...tseslint.configs.recommended, // Apply TS recommended rules
  //   // Add any TS-specific rule overrides here
  //   rules: {
  //     '@typescript-eslint/no-unused-vars': 'warn',
  //   }
  // },

  // 4. Prettier configuration (MUST be last)
  // Apply prettier plugin and disable conflicting rules
  {
    // Optional: If you only want prettier rules on specific files
    // files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
    plugins: {
      prettier: pluginPrettier,
    },
    rules: {
      ...configPrettier.rules, // Disable ESLint rules that conflict with Prettier
      'prettier/prettier': 'error', // Report Prettier differences as ESLint errors
    },
  },

  // 5. Custom global rules (if any) for all files
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Add any global variables if needed e.g., browser: true, node: true
        // Example:
        // ...globals.browser,
        // ...globals.node,
      },
    },
    // Your custom rules from the original `rules: {}` would go here
    rules: {
      // Add your specific rule overrides here
      // Example:
      // 'no-console': 'warn',
    },
  },
];

// Optional: If using type-aware linting (tseslint.configs.recommendedTypeChecked)
// You might need to configure the parser project path within the TS config object:
// ... rest of type-checked config ...