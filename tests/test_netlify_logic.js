const assert = require('assert');

const {
  normalizeAddress,
  checkEligibility,
  claimRewards,
} = require('../netlify/functions/shared.js');

function makeStore(initial = {}) {
  const claimed = { ...initial };
  return {
    async isClaimed(address) {
      return Object.prototype.hasOwnProperty.call(claimed, normalizeAddress(address));
    },
    async markClaimed(address, gems) {
      claimed[normalizeAddress(address)] = { claimed: true, gems };
    },
    snapshot() {
      return claimed;
    },
  };
}

(async function testCheckEligibilityEligible() {
  const store = makeStore();
  const eligibility = { '0xabc': 1000 };
  const result = await checkEligibility('0xAbC', eligibility, store);
  assert.strictEqual(result.eligible, true);
  assert.strictEqual(result.claimed, false);
  assert.strictEqual(result.gems, 1000);
})();

(async function testClaimRewardsMarksClaimed() {
  const store = makeStore();
  const eligibility = { '0xabc': 1000 };
  const result = await claimRewards('0xAbC', eligibility, store);
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.claimed, true);
  assert.deepStrictEqual(store.snapshot()['0xabc'], { claimed: true, gems: 1000 });
})();

(async function testClaimRewardsRejectsRepeatClaim() {
  const store = makeStore({ '0xabc': { claimed: true, gems: 1000 } });
  const eligibility = { '0xabc': 1000 };
  const result = await claimRewards('0xAbC', eligibility, store);
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.claimed, true);
})();

console.log('netlify logic tests passed');
