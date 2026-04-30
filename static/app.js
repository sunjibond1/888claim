const state = {
  walletAddress: '',
  walletType: '',
  chainId: null,
  eligible: false,
  claimed: false,
  gems: 0,
  privyAppId: '',
  privyClientId: '',
  pendingEmail: '',
};

const headerConnectButton = document.getElementById('headerConnectButton');
const mainActionButton = document.getElementById('mainActionButton');
const walletModal = document.getElementById('walletModal');
const successModal = document.getElementById('successModal');
const statusCard = document.getElementById('statusCard');
const successCopy = document.getElementById('successCopy');

const BASE_CHAIN_ID = 8453;

async function loadRuntimeConfig() {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) return;
    const payload = await response.json();
    state.privyAppId = payload.privyAppId || '';
    state.privyClientId = payload.privyClientId || '';
    state.chainId = payload.baseChainId || BASE_CHAIN_ID;
    window.__CLAIM888_CONFIG__ = payload;
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

function renderEmailOtpPrompt(step = 'email', helperCopy = '') {
  const title = step === 'email' ? 'Continue with Privy via email' : 'Enter the 6-digit code';
  const subtitle = step === 'email'
    ? 'Guest login is disabled for this Privy app, so we’ll send a login code to your email instead.'
    : `We sent a code to ${state.pendingEmail}. Enter it to finish connecting your Privy wallet.`;
  const emailValue = state.pendingEmail ? `value="${state.pendingEmail}"` : '';
  walletModal.querySelector('.modal-panel').innerHTML = `
    <button class="modal-close" data-close="walletModal">×</button>
    <h2>${title}</h2>
    <p class="modal-copy">${subtitle}</p>
    <div class="wallet-options otp-flow">
      ${step === 'email' ? `
        <input id="privyEmailInput" class="wallet-input" type="email" placeholder="you@example.com" ${emailValue} />
        <button id="privySendCodeButton" class="option-button">Send code</button>
      ` : `
        <input id="privyCodeInput" class="wallet-input" type="text" inputmode="numeric" placeholder="123456" />
        <button id="privyVerifyCodeButton" class="option-button">Verify code</button>
      `}
      <button id="privyBackButton" class="secondary-button" type="button">Back</button>
    </div>
    <p class="modal-note">${helperCopy || 'Network required: Base'}</p>
  `;

  walletModal.querySelectorAll('[data-close]').forEach((element) => {
    element.addEventListener('click', () => hideModal(document.getElementById(element.dataset.close)));
  });

  const backButton = document.getElementById('privyBackButton');
  backButton?.addEventListener('click', () => renderDefaultWalletPrompt());

  if (step === 'email') {
    document.getElementById('privySendCodeButton')?.addEventListener('click', submitPrivyEmail);
  } else {
    document.getElementById('privyVerifyCodeButton')?.addEventListener('click', submitPrivyOtp);
  }
}

function renderDefaultWalletPrompt() {
  walletModal.querySelector('.modal-panel').innerHTML = `
    <button class="modal-close" data-close="walletModal">×</button>
    <h2>Connect wallet</h2>
    <p class="modal-copy">Connect with Privy to create or restore your wallet on Base.</p>
    <div class="wallet-options">
      <button class="option-button" data-wallet="privy">Continue with Privy</button>
    </div>
    <p class="modal-note">Network required: Base</p>
  `;

  walletModal.querySelectorAll('[data-close]').forEach((element) => {
    element.addEventListener('click', () => hideModal(document.getElementById(element.dataset.close)));
  });

  walletModal.querySelectorAll('.option-button').forEach((button) => {
    button.addEventListener('click', async () => {
      const wallet = button.dataset.wallet;
      try {
        if (wallet === 'privy') await connectPrivy();
      } catch (error) {
        if (error?.code === 'PRIVY_EMAIL_OTP_REQUIRED' || window.privyUtils.shouldUseEmailOtp(error)) {
          renderEmailOtpPrompt('email', 'Guest accounts are disabled in this Privy app, so use email OTP instead.');
          return;
        }
        setStatus({ tone: 'error', label: 'Wallet', title: 'Connection failed', copy: error.message || 'Please try again.' });
        hideModal(walletModal);
      }
    });
  });
}

async function finalizePrivyConnection(result) {
  const provider = new ethers.BrowserProvider(result.provider);
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  if (chainId !== BASE_CHAIN_ID) {
    setStatus({
      tone: 'error',
      label: 'Network',
      title: 'Privy wallet is not on Base',
      copy: 'Your Privy wallet must be connected to Base before you can continue.',
    });
    hideModal(walletModal);
    return;
  }

  state.walletAddress = result.walletAddress;
  state.walletType = result.walletType;
  state.chainId = chainId;
  hideModal(walletModal);
  updateConnectedUi();
  setStatus({
    tone: 'pending',
    label: 'Wallet connected',
    title: 'Ready to check eligibility',
    copy: 'Your Privy wallet is connected. Click “Check eligibility” to continue.',
  });
}

async function connectPrivy() {
  if (!state.privyAppId) {
    setStatus({
      tone: 'error',
      label: 'Privy',
      title: 'Privy is not configured yet',
      copy: 'Add PRIVY_APP_ID to enable Privy wallet login for this site.',
    });
    hideModal(walletModal);
    return;
  }

  if (!window.Claim888Privy?.connectPrivyWallet) {
    setStatus({
      tone: 'error',
      label: 'Privy',
      title: 'Privy bundle unavailable',
      copy: 'The Privy browser bundle did not load correctly. Please refresh and try again.',
    });
    hideModal(walletModal);
    return;
  }

  const result = await window.Claim888Privy.connectPrivyWallet();
  await finalizePrivyConnection(result);
}

async function submitPrivyEmail() {
  const email = document.getElementById('privyEmailInput')?.value?.trim() || '';
  if (!window.privyUtils.isValidEmail(email)) {
    renderEmailOtpPrompt('email', 'Enter a valid email address.');
    return;
  }

  state.pendingEmail = email;
  await window.Claim888Privy.startPrivyEmailOtp(email);
  renderEmailOtpPrompt('code', 'We sent a 6-digit code to your email.');
}

async function submitPrivyOtp() {
  const code = window.privyUtils.normalizeOtpCode(document.getElementById('privyCodeInput')?.value || '');
  if (code.length < 4) {
    renderEmailOtpPrompt('code', 'Enter the full code from your email.');
    return;
  }

  try {
    const result = await window.Claim888Privy.verifyPrivyEmailOtp(state.pendingEmail, code);
    await finalizePrivyConnection(result);
  } catch (error) {
    renderEmailOtpPrompt('code', error.message || 'Verification failed. Try the code again.');
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

renderDefaultWalletPrompt();
loadRuntimeConfig();
