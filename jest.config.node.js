// Separate Jest config for the plain-Node (CommonJS) code that lives
// outside src/ — the Vercel serverless functions in api/*.js and the
// Express helpers in server-utils/*.js. `react-scripts test` (used for
// everything under src/) hardcodes its Jest config to root at src/ and run
// under jsdom, which doesn't fit this code: it's untranspiled CommonJS
// meant to run under plain Node, not bundled through webpack.
//
// Run via `npm run test:api` (also included in `npm run test:ci`, so CI
// gates on both suites).
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/api/**/*.test.js',
    '<rootDir>/server-utils/**/*.test.js',
  ],
  testPathIgnorePatterns: ['/node_modules/'],
};
