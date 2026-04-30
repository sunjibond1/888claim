const state = {
  walletAddress: '',
  walletType: '',
  chainId: null,
  eligible: false,
  claimed: false,
  gems: 0,
  walletConnectProjectId: '',
};

const headerConnectButton = document.getElementById('headerConnectButton');
const mainActionButton = document.getElementById('mainActionButton');
const walletModal = document.getElementById('walletModal');
const successModal = document.getElementById('successModal');
const statusCard = document.getElementById('statusCard');
const successCopy = document.getElementById('successCopy');

const BASE_CHAIN_ID = 8453;
const BASE_HEX = '0x2105';

async function loadRuntimeConfig() {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) return;
    const payload = await response.json();
    state.walletConnectProjectId = payload.walletConnectProjectId || '';
  } catch (error) {
    console.warn('Config load failed', error);
  }
}

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function showModal(modal) {
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function hideModal(modal) {
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function setStatus({ tone = 'pending', label = 'Status', title = '', copy = '', gems = 0, actionHtml = '' }) {
  statusCard.classList.remove('hidden');
  statusCard.innerHTML = `
    <div class="status-label ${tone}">${label}</div>
    <div class="status-title">${title}</div>
    <p class="status-copy">${copy}</p>
    ${gems ? `<div class="reward-pill">Reward: ${gems} Gems</div>` : ''}
    ${actionHtml ? `<div class="status-actions">${actionHtml}</div>` : ''}
  `;

  const claimButton = document.getElementById('claimButton');
  if (claimButton) {
    claimButton.addEventListener('click', handleClaim);
  }
}

function updateConnectedUi() {
  if (!state.walletAddress) {
    headerConnectButton.textContent = 'Connect wallet';
    mainActionButton.textContent = 'Connect wallet';
    return;
  }
  headerConnectButton.innerHTML = `<span class="connected-badge"><span class="wallet-pill">${state.walletType}</span><span>${shortenAddress(state.walletAddress)}</span></span>`;
  mainActionButton.textContent = 'Check eligibility';
}

async function ensureBaseNetwork(provider, mode = 'metamask') {
  const network = await provider.getNetwork();
  state.chainId = Number(network.chainId);
  if (state.chainId === BASE_CHAIN_ID) return true;
  try {
    if (mode === 'walletconnect' && provider.provider?.request) {
      await provider.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_HEX }],
      });
    } else {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_HEX }],
      });
    }
    state.chainId = BASE_CHAIN_ID;
    return true;
  } catch (error) {
    setStatus({
      tone: 'error',
      label: 'Network',
      title: 'Switch to Base to continue',
      copy: 'Please switch your wallet network to Base before checking eligibility.',
    });
    return false;
  }
}

async function connectMetaMask() {
  const injectedProvider = window.walletUtils?.pickMetaMaskProvider(window.ethereum);
  if (!injectedProvider) {
    setStatus({
      tone: 'error',
      label: 'Wallet',
      title: 'MetaMask not detected',
      copy: 'MetaMask extension was not found. If you only have OKX/Coinbase installed, use WalletConnect or install MetaMask.',
    });
    return;
  }
  const provider = new ethers.BrowserProvider(injectedProvider);
  const accounts = await provider.send('eth_requestAccounts', []);
  state.walletAddress = accounts[0];
  state.walletType = 'MetaMask';
  const isReady = await ensureBaseNetwork(provider, 'metamask');
  hideModal(walletModal);
  updateConnectedUi();
  if (isReady) {
    setStatus({ tone: 'pending', label: 'Wallet connected', title: 'Ready to check eligibility', copy: 'Your wallet is connected. Click “Check eligibility” to continue.' });
  }
}

function connectBaseApp() {
  const baseAppLink = window.walletUtils?.buildBaseAppUrl(window.location.href);
  if (!baseAppLink?.ok) {
    setStatus({
      tone: 'pending',
      label: 'Base App',
      title: 'Base App needs a public URL',
      copy: baseAppLink?.message || 'Open this page from a public HTTPS URL to continue in Base App.',
    });
    hideModal(walletModal);
    return;
  }
  window.location.href = baseAppLink.url;
}

async function connectWalletConnect() {
  if (!state.walletConnectProjectId) {
    setStatus({
      tone: 'pending',
      label: 'WalletConnect',
      title: 'WalletConnect needs a project ID',
      copy: 'Add WALLETCONNECT_PROJECT_ID to enable the QR modal flow. For now, use MetaMask on desktop or Base App on mobile.',
    });
    hideModal(walletModal);
    return;
  }

  const wcNamespace = window['@walletconnect/ethereum-provider'];
  const EthereumProvider = wcNamespace?.EthereumProvider || wcNamespace?.default || wcNamespace;
  if (!EthereumProvider?.init) {
    setStatus({
      tone: 'error',
      label: 'WalletConnect',
      title: 'WalletConnect library unavailable',
      copy: 'The WalletConnect provider did not load correctly. Please use MetaMask or Base App for now.',
    });
    hideModal(walletModal);
    return;
  }

  const wcProvider = await EthereumProvider.init({
    projectId: state.walletConnectProjectId,
    chains: [BASE_CHAIN_ID],
    optionalChains: [BASE_CHAIN_ID],
    showQrModal: true,
    methods: ['eth_sendTransaction', 'personal_sign', 'eth_signTypedData', 'eth_signTypedData_v4'],
    optionalMethods: ['wallet_switchEthereumChain', 'wallet_addEthereumChain'],
    rpcMap: {
      [BASE_CHAIN_ID]: 'https://mainnet.base.org',
    },
    metadata: {
      name: 'SCOR Claiming Hub',
      description: 'Check SCOR 888 campaign eligibility',
      url: window.location.origin,
      icons: [`${window.location.origin}/logo/scor-logo-dark.svg`],
    },
  });

  await wcProvider.enable();
  const provider = new ethers.BrowserProvider(wcProvider);
  const signer = await provider.getSigner();
  state.walletAddress = await signer.getAddress();
  state.walletType = 'WalletConnect';
  const isReady = await ensureBaseNetwork(provider, 'walletconnect');
  hideModal(walletModal);
  updateConnectedUi();
  if (isReady) {
    setStatus({
      tone: 'pending',
      label: 'Wallet connected',
      title: 'Ready to check eligibility',
      copy: 'Your wallet is connected. Click “Check eligibility” to continue.',
    });
  }
}

async function handleCheckEligibility() {
  if (!state.walletAddress) {
    return showModal(walletModal);
  }
  setStatus({ tone: 'pending', label: 'Checking', title: 'Checking eligibility…', copy: 'We’re checking your wallet against the 888 campaign list.' });
  const response = await fetch('/api/claim888/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress: state.walletAddress, walletType: state.walletType, chainId: state.chainId }),
  });
  const payload = await response.json();
  if (!response.ok) {
    setStatus({ tone: 'error', label: 'Error', title: 'Something went wrong', copy: payload.error || 'Please try again in a moment.' });
    return;
  }
  state.eligible = payload.eligible;
  state.claimed = payload.claimed;
  state.gems = payload.gems;
  if (!payload.eligible) {
    setStatus({ tone: 'error', label: 'Not eligible', title: payload.message, copy: 'Stay tuned for future SCOR campaigns.' });
    return;
  }
  if (payload.claimed) {
    setStatus({ tone: 'success', label: 'Claimed', title: 'Rewards already claimed for this wallet.', copy: 'Your rewards have already been sent to your Master Wallet.', gems: payload.gems });
    return;
  }
  setStatus({
    tone: 'success',
    label: 'Eligible',
    title: payload.message,
    copy: 'You can claim your additional Gems now.',
    gems: payload.gems,
    actionHtml: '<button id="claimButton" class="primary-button">Claim</button>'
  });
}

async function handleClaim() {
  setStatus({ tone: 'pending', label: 'Claiming', title: 'Sending rewards…', copy: 'Please wait while we confirm your claim.', gems: state.gems });
  const response = await fetch('/api/claim888/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress: state.walletAddress, gems: state.gems }),
  });
  const payload = await response.json();
  if (!response.ok) {
    setStatus({ tone: 'error', label: 'Claim failed', title: payload.message || 'Claim failed', copy: 'Please try again later.' });
    return;
  }
  state.claimed = true;
  successCopy.textContent = payload.message;
  setStatus({ tone: 'success', label: 'Claimed', title: 'Rewards already claimed for this wallet.', copy: 'Your rewards have already been sent to your Master Wallet.', gems: payload.gems });
  showModal(successModal);
}

headerConnectButton.addEventListener('click', () => showModal(walletModal));
mainActionButton.addEventListener('click', () => {
  if (!state.walletAddress) {
    showModal(walletModal);
  } else {
    handleCheckEligibility();
  }
});

document.querySelectorAll('[data-close]').forEach((element) => {
  element.addEventListener('click', () => hideModal(document.getElementById(element.dataset.close)));
});

document.querySelectorAll('.option-button').forEach((button) => {
  button.addEventListener('click', async () => {
    const wallet = button.dataset.wallet;
    try {
      if (wallet === 'metamask') await connectMetaMask();
      if (wallet === 'base') connectBaseApp();
      if (wallet === 'walletconnect') await connectWalletConnect();
    } catch (error) {
      setStatus({ tone: 'error', label: 'Wallet', title: 'Connection failed', copy: error.message || 'Please try again.' });
      hideModal(walletModal);
    }
  });
});

loadRuntimeConfig();

if (window.ethereum) {
  window.ethereum.on?.('accountsChanged', (accounts) => {
    if (!accounts.length) {
      state.walletAddress = '';
      state.walletType = '';
      updateConnectedUi();
      statusCard.classList.add('hidden');
      return;
    }
    state.walletAddress = accounts[0];
    updateConnectedUi();
  });
}
