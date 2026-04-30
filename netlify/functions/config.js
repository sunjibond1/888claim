const path = require('path');
const { loadEligibilityMap } = require('./shared');

let cache = null;

async function getEligibilityMap() {
  if (cache) return cache;
  const xlsxPath = path.resolve(__dirname, '../../data/SCOR_Eligible addresses_888.xlsx');
  cache = await loadEligibilityMap(xlsxPath);
  return cache;
}

exports.handler = async function handler() {
  const eligibility = await getEligibilityMap();
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      privyAppId: process.env.PRIVY_APP_ID || '',
      privyClientId: process.env.PRIVY_CLIENT_ID || '',
      baseChainId: 8453,
      eligibleCount: Object.keys(eligibility).length,
    }),
  };
};
