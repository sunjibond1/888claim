function getPrivyConfig(target = typeof window !== 'undefined' ? window : globalThis) {
  const runtime = target?.__CLAIM888_CONFIG__ || {};
  const appId = (runtime.privyAppId || '').trim();
  const clientId = (runtime.privyClientId || '').trim();
  const baseChainId = Number(runtime.baseChainId || 8453);

  if (!appId) {
    return {
      ok: false,
      message: 'Privy App ID is missing. Add PRIVY_APP_ID to your runtime configuration.',
    };
  }

  return {
    ok: true,
    appId,
    clientId,
    baseChainId,
  };
}

function normalizePrivyUser(user) {
  const accounts = Array.isArray(user?.linked_accounts) ? user.linked_accounts : [];
  const wallet = accounts.find((account) =>
    account?.type === 'wallet' &&
    account?.chain_type === 'ethereum' &&
    account?.wallet_client_type === 'privy' &&
    account?.connector_type === 'embedded'
  );

  if (!wallet?.address) return null;

  return {
    walletAddress: wallet.address,
    walletType: 'Privy',
    walletAccount: wallet,
  };
}

function shouldUseEmailOtp(error) {
  const message = `${error?.message || error || ''}`.toLowerCase();
  return message.includes('guest accounts are not enabled') || message.includes('guest login disabled');
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim());
}

function normalizeOtpCode(value) {
  return `${value || ''}`.replace(/\s+/g, '').trim();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getPrivyConfig,
    normalizePrivyUser,
    shouldUseEmailOtp,
    isValidEmail,
    normalizeOtpCode,
  };
}

if (typeof window !== 'undefined') {
  window.privyUtils = {
    getPrivyConfig,
    normalizePrivyUser,
    shouldUseEmailOtp,
    isValidEmail,
    normalizeOtpCode,
  };
}
