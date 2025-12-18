module.exports = {
  root: true,
  extends: ['@react-native-community', 'prettier'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier'],
  env: {
    'react-native/react-native': true,
  },
  overrides: [
    {
      files: ['**/*.test.{js,jsx,ts,tsx}', '**/__tests__/**/*.{js,jsx,ts,tsx}'],
      env: {
        jest: true,
      },
    },
  ],
  rules: {
    'prettier/prettier': 'error',
    'react/react-in-jsx-scope': 'off',
  },
  ignorePatterns: [
    'node_modules/',
    'babel.config.js',
    'jest.config.js',
    'jest.setup.js',
    'metro.config.js',
  ],
};
