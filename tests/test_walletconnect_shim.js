const assert = require('assert');
const { ensureWalletConnectBrowserGlobals } = require('../static/walletconnect-shim.js');

(function testCreatesProcessEnvShim() {
  const fakeWindow = {};
  ensureWalletConnectBrowserGlobals(fakeWindow);
  assert.deepStrictEqual(fakeWindow.process, { env: {} });
})();

(function testPreservesExistingProcessObject() {
  const fakeWindow = { process: { env: { NODE_ENV: 'production' }, version: 'x' } };
  ensureWalletConnectBrowserGlobals(fakeWindow);
  assert.strictEqual(fakeWindow.process.version, 'x');
  assert.strictEqual(fakeWindow.process.env.NODE_ENV, 'production');
})();

console.log('walletconnect shim tests passed');
