function isProbablyMetaMask(provider) {
  return !!provider?.isMetaMask && !provider?.isOkxWallet;
}

function pickMetaMaskProvider(ethereum) {
  if (!ethereum) return null;

  const providers = Array.isArray(ethereum.providers) && ethereum.providers.length
    ? ethereum.providers
    : [ethereum];

  const exactMetaMask = providers.find((provider) => isProbablyMetaMask(provider));
  if (exactMetaMask) return exactMetaMask;

  return isProbablyMetaMask(ethereum) ? ethereum : null;
}

function buildBaseAppUrl(currentUrl) {
  let parsed;
  try {
    parsed = new URL(currentUrl);
  } catch (error) {
    return {
      ok: false,
      message: 'Base App needs a valid public HTTPS URL.',
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname.endsWith('.local');

  if (parsed.protocol !== 'https:' || isLocalHost) {
    return {
      ok: false,
      message: 'Base App works only with a public HTTPS URL, not localhost.',
    };
  }

  return {
    ok: true,
    url: `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(parsed.toString())}`,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    pickMetaMaskProvider,
    buildBaseAppUrl,
  };
}

if (typeof window !== 'undefined') {
  window.walletUtils = {
    pickMetaMaskProvider,
    buildBaseAppUrl,
  };
}
