const path = require('path');
const XLSX = require('xlsx');

function normalizeAddress(address) {
  return (address || '').trim().toLowerCase();
}

async function loadEligibilityMap(xlsxPath) {
  const workbook = XLSX.readFile(xlsxPath);
  const firstSheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { header: 1, raw: true });

  const result = {};
  rows.slice(1).forEach((row) => {
    if (!Array.isArray(row) || row.length < 2) return;
    const address = normalizeAddress(String(row[0] || ''));
    if (!address) return;
    const gems = Number(row[1]);
    if (Number.isNaN(gems)) return;
    result[address] = gems;
  });

  return result;
}

async function checkEligibility(address, eligibilityMap, store) {
  const normalized = normalizeAddress(address);
  const gems = eligibilityMap[normalized] || 0;
  if (!gems) {
    return {
      eligible: false,
      claimed: false,
      gems: 0,
      message: 'Oops! No additional rewards this time. Follow SCOR’s future campaigns to score next time.',
    };
  }

  const claimed = await store.isClaimed(normalized);
  return {
    eligible: true,
    claimed,
    gems,
    message: claimed ? 'Rewards already claimed for this wallet.' : 'Congrats! You’re eligible for additional rewards.',
  };
}

async function claimRewards(address, eligibilityMap, store) {
  const result = await checkEligibility(address, eligibilityMap, store);
  if (!result.eligible) {
    return { success: false, message: result.message, gems: 0, claimed: false };
  }
  if (result.claimed) {
    return { success: false, message: 'Rewards already claimed for this wallet.', gems: result.gems, claimed: true };
  }

  await store.markClaimed(address, result.gems);
  return {
    success: true,
    claimed: true,
    gems: result.gems,
    message: `"${result.gems}" rewards have been sent to your Master Wallet.`,
  };
}

module.exports = {
  normalizeAddress,
  loadEligibilityMap,
  checkEligibility,
  claimRewards,
};
