const path = require('path');
const { checkEligibility, loadEligibilityMap } = require('./shared');

let eligibilityCache = null;
const claimed = global.__claim888_claimed || (global.__claim888_claimed = {});

function makeStore() {
  return {
    async isClaimed(address) {
      return Object.prototype.hasOwnProperty.call(claimed, address);
    },
    async markClaimed(address, gems) {
      claimed[address] = { claimed: true, gems };
    },
  };
}

async function getEligibilityMap() {
  if (eligibilityCache) return eligibilityCache;
  const xlsxPath = path.resolve(__dirname, '../../data/SCOR_Eligible addresses_888.xlsx');
  eligibilityCache = await loadEligibilityMap(xlsxPath);
  return eligibilityCache;
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const payload = JSON.parse(event.body || '{}');
  const walletAddress = (payload.walletAddress || '').trim();
  if (!walletAddress) {
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: 'Wallet address is required.' }),
    };
  }

  const eligibility = await getEligibilityMap();
  const result = await checkEligibility(walletAddress, eligibility, makeStore());
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(result),
  };
};
