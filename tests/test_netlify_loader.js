const assert = require('assert');
const path = require('path');
const { loadEligibilityMap } = require('../netlify/functions/shared.js');

(async function testLoadEligibilityMapReadsKnownRows() {
  const eligibility = await loadEligibilityMap(
    path.resolve(__dirname, '../data/SCOR_Eligible addresses_888.xlsx')
  );

  assert.strictEqual(eligibility['0xeda38655a88bcd58b2da7a4ffa702fb3c725c4ce'], 1000);
  assert.strictEqual(eligibility['0xf38f4724adcbeea1704f5fc7ccc6a12d16fbf0d1'], 120);
  assert.strictEqual(eligibility['0xee9ae57919402ccb6af05b2176bc450ac9cfce91'], 500);
})();

console.log('netlify loader tests passed');
