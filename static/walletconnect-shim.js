function ensureWalletConnectBrowserGlobals(target = typeof window !== 'undefined' ? window : globalThis) {
  if (!target) return target;

  if (!target.process) {
    target.process = { env: {} };
  } else if (!target.process.env) {
    target.process.env = {};
  }

  if (!target.global) {
    target.global = target;
  }

  return target;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ensureWalletConnectBrowserGlobals };
}

if (typeof window !== 'undefined') {
  ensureWalletConnectBrowserGlobals(window);
}
