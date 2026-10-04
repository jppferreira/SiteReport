const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
  {
    rules: {
      'import/no-unresolved': 'off',
      // React Compiler's mutability rule doesn't understand Reanimated's
      // useSharedValue/useAnimatedStyle API, which is intentionally mutated
      // via `.value =` outside of render. This is Reanimated's documented
      // usage pattern, not an accidental mutation bug.
      'react-hooks/immutability': 'off',
    },
  },
];
