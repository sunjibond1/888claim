const assert = require('assert');

const { pickMetaMaskProvider, buildBaseAppUrl } = require('../static/wallet-utils.js');

(function testPickMetaMaskProviderPrefersTrueMetaMask() {
  const okx = { isOkxWallet: true, isMetaMask: true, name: 'okx' };
  const metamask = { isMetaMask: true, isOkxWallet: false, name: 'metamask' };
  const injected = {
    providers: [okx, metamask],
    isMetaMask: false,
  };

  const chosen = pickMetaMaskProvider(injected);
  assert.strictEqual(chosen, metamask, 'should prefer the dedicated MetaMask provider over OKX');
})();

(function testPickMetaMaskProviderFallsBackToSingleProvider() {
  const metamask = { isMetaMask: true, name: 'metamask' };
  assert.strictEqual(pickMetaMaskProvider(metamask), metamask);
})();

(function testBuildBaseAppUrlRejectsLocalhost() {
  const result = buildBaseAppUrl('http://127.0.0.1:8123/claim888');
  assert.strictEqual(result.ok, false);
  assert.match(result.message, /public https url/i);
})();

(function testBuildBaseAppUrlAcceptsPublicHttps() {
  const result = buildBaseAppUrl('https://claim888.example.com/claim888');
  assert.strictEqual(result.ok, true);
  assert.strictEqual(
    result.url,
    'https://go.cb-w.com/dapp?cb_url=https%3A%2F%2Fclaim888.example.com%2Fclaim888'
  );
})();

console.log('wallet-utils tests passed');
