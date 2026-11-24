const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: [
      'dist/*',
      'node_modules/*',
      '.expo/*',
      '.cursor-tmp/**',
      'android/**',
      'ios/**',
      // One-off store / marketing scripts and the static site — not app runtime.
      'store/**',
      'website/**',
      'scripts/**',
    ],
  },
  {
    files: ['jest.setup.js'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        require: 'readonly',
      },
    },
  },
  {
    rules: {
      'import/no-unresolved': 'off',
      // React Compiler's mutability rule doesn't understand Reanimated's
      // useSharedValue/useAnimatedStyle API, which is intentionally mutated
      // via `.value =` outside of render. This is Reanimated's documented
      // usage pattern, not an accidental mutation bug.
      'react-hooks/immutability': 'off',
      // Same class of false positives: prop→state sync in sheets/modals,
      // lazy controller refs, and writing latest props into refs for
      // gesture handlers. Keep CI focused on real issues until those
      // call sites are migrated to compiler-friendly patterns.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
];
