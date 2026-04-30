import Privy from '../node_modules/@privy-io/js-sdk-core/dist/esm/client/Privy.mjs';
import { LocalStorage, getUserEmbeddedEthereumWallet } from '../node_modules/@privy-io/js-sdk-core/dist/esm/index.mjs';

function getPrivyConfig(target = window) {
  return target.privyUtils.getPrivyConfig(target);
}

function ensurePrivyIframe(client) {
  let iframe = document.getElementById('privy-embedded-wallet-frame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'privy-embedded-wallet-frame';
    iframe.title = 'Privy embedded wallet';
    iframe.style.display = 'none';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);
  }

  const nextSrc = client.embeddedWallet.getURL();
  if (iframe.src !== nextSrc) {
    iframe.src = nextSrc;
  }

  client.setMessagePoster({
    postMessage(message, targetOrigin, transfer) {
      iframe.contentWindow?.postMessage(message, targetOrigin, transfer || []);
    },
    reload() {
      iframe.contentWindow?.location.reload();
    },
  });

  return iframe;
}

function normalizePrivyUser(user) {
  const normalized = window.privyUtils.normalizePrivyUser(user);
  if (normalized) return normalized;

  const fallbackWallet = getUserEmbeddedEthereumWallet(user);
  if (!fallbackWallet?.address) return null;

  return {
    walletAddress: fallbackWallet.address,
    walletType: 'Privy',
    walletAccount: fallbackWallet,
  };
}

let privyClientPromise = null;
let privyMessageListenerAttached = false;

async function loadPrivyClient() {
  if (privyClientPromise) return privyClientPromise;

  const config = getPrivyConfig(window);
  if (!config.ok) {
    throw new Error(config.message);
  }

  const client = new Privy({
    appId: config.appId,
    clientId: config.clientId || undefined,
    storage: new LocalStorage(),
    supportedChains: [{
      id: config.baseChainId,
      name: 'Base',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: {
        default: { http: ['https://mainnet.base.org'] },
        public: { http: ['https://mainnet.base.org'] },
      },
      blockExplorers: {
        default: { name: 'BaseScan', url: 'https://basescan.org' },
      },
    }],
  });

  ensurePrivyIframe(client);
  if (!privyMessageListenerAttached) {
    window.addEventListener('message', (event) => {
      if (!event?.data) return;
      client.embeddedWallet.onMessage(event.data);
    });
    privyMessageListenerAttached = true;
  }

  await client.initialize();
  privyClientPromise = Promise.resolve(client);
  return client;
}

async function createWalletProvider(client, user) {
  const normalized = normalizePrivyUser(user);
  if (!normalized?.walletAddress) {
    throw new Error('Privy connected, but no embedded Ethereum wallet was returned.');
  }

  const walletAccount = normalized.walletAccount || getUserEmbeddedEthereumWallet(user);
  if (!walletAccount) {
    throw new Error('Privy wallet account was not found on the authenticated user.');
  }

  const provider = await client.embeddedWallet.getProvider(walletAccount);
  return {
    client,
    provider,
    walletAddress: normalized.walletAddress,
    walletType: normalized.walletType,
  };
}

export async function startPrivyEmailOtp(email) {
  const client = await loadPrivyClient();
  await client.auth.email.sendCode(email);
  return { method: 'email-otp' };
}

export async function verifyPrivyEmailOtp(email, code) {
  const client = await loadPrivyClient();
  const loginResult = await client.auth.email.loginWithCode(email, code, 'login-or-sign-up', {
    embedded: {
      ethereum: {
        createOnLogin: 'users-without-wallets',
      },
    },
  });

  const user = loginResult?.user || (await client.user.get()).user;
  return createWalletProvider(client, user);
}

export async function connectPrivyWallet() {
  const client = await loadPrivyClient();

  try {
    const loginResult = await client.auth.guest.create({
      embedded: {
        ethereum: {
          createOnLogin: 'users-without-wallets',
        },
      },
    });

    const user = loginResult?.user || (await client.user.get()).user;
    return createWalletProvider(client, user);
  } catch (error) {
    if (window.privyUtils.shouldUseEmailOtp(error)) {
      const fallback = new Error('PRIVY_EMAIL_OTP_REQUIRED');
      fallback.code = 'PRIVY_EMAIL_OTP_REQUIRED';
      throw fallback;
    }
    throw error;
  }
}
