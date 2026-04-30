const assert = require('assert');

function createFakeWindow(overrides = {}) {
  return {
    location: { origin: 'https://claim.scor.io', href: 'https://claim.scor.io/claim888' },
    ...overrides,
  };
}

const {
  getPrivyConfig,
  normalizePrivyUser,
  shouldUseEmailOtp,
  isValidEmail,
  normalizeOtpCode,
} = require('../static/privy-utils.js');

(function testGetPrivyConfigRequiresAppId() {
  const win = createFakeWindow({ __CLAIM888_CONFIG__: {} });
  const result = getPrivyConfig(win);
  assert.strictEqual(result.ok, false);
  assert.match(result.message, /Privy App ID/i);
})();

(function testGetPrivyConfigReturnsRuntimeValues() {
  const win = createFakeWindow({
    __CLAIM888_CONFIG__: {
      privyAppId: 'app-123',
      privyClientId: 'client-456',
      baseChainId: 8453,
    },
  });

  const result = getPrivyConfig(win);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.appId, 'app-123');
  assert.strictEqual(result.clientId, 'client-456');
  assert.strictEqual(result.baseChainId, 8453);
})();

(function testNormalizePrivyUserUsesEmbeddedWalletAddress() {
  const user = {
    linked_accounts: [
      {
        type: 'wallet',
        chain_type: 'ethereum',
        wallet_client_type: 'privy',
        connector_type: 'embedded',
        wallet_index: 0,
        address: '0xAbC123',
      },
    ],
  };

  const result = normalizePrivyUser(user);
  assert.strictEqual(result.walletAddress, '0xAbC123');
  assert.strictEqual(result.walletType, 'Privy');
})();

(function testNormalizePrivyUserReturnsNullWithoutWallet() {
  const result = normalizePrivyUser({ linked_accounts: [] });
  assert.strictEqual(result, null);
})();

(function testShouldUseEmailOtpForGuestAccountErrors() {
  assert.strictEqual(shouldUseEmailOtp(new Error('Guest accounts are not enabled for this app')), true);
  assert.strictEqual(shouldUseEmailOtp(new Error('guest login disabled')), true);
  assert.strictEqual(shouldUseEmailOtp(new Error('Something else happened')), false);
})();

(function testValidatesEmailAndOtpNormalization() {
  assert.strictEqual(isValidEmail('alice@example.com'), true);
  assert.strictEqual(isValidEmail('not-an-email'), false);
  assert.strictEqual(normalizeOtpCode(' 12 34 56 '), '123456');
})();

console.log('privy runtime tests passed');
