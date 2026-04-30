import json
import tempfile
import unittest
from pathlib import Path

from claim888.backend import ClaimStore, check_eligibility, claim_rewards, load_eligibility_map, normalize_address

APP_ROOT = Path(__file__).resolve().parents[1]
XLSX_PATH = APP_ROOT / 'data' / 'SCOR_Eligible addresses_888.xlsx'


class EligibilityBackendTests(unittest.TestCase):
    def test_normalize_address_lowercases_value(self):
        self.assertEqual(normalize_address('0xAbC123'), '0xabc123')

    def test_load_eligibility_map_reads_known_rows(self):
        eligibility = load_eligibility_map(XLSX_PATH)

        self.assertEqual(eligibility['0xeda38655a88bcd58b2da7a4ffa702fb3c725c4ce'], 1000)
        self.assertEqual(eligibility['0xf38f4724adcbeea1704f5fc7ccc6a12d16fbf0d1'], 120)
        self.assertEqual(eligibility['0xee9ae57919402ccb6af05b2176bc450ac9cfce91'], 500)

    def test_check_eligibility_returns_eligible_state(self):
        eligibility = load_eligibility_map(XLSX_PATH)
        with tempfile.TemporaryDirectory() as tmpdir:
            store = ClaimStore(Path(tmpdir) / 'claims.json')
            result = check_eligibility('0xEDa38655a88bcD58b2Da7a4fFA702Fb3c725C4CE', eligibility, store)

        self.assertTrue(result['eligible'])
        self.assertFalse(result['claimed'])
        self.assertEqual(result['gems'], 1000)

    def test_claim_rewards_marks_address_as_claimed(self):
        eligibility = load_eligibility_map(XLSX_PATH)
        with tempfile.TemporaryDirectory() as tmpdir:
            store = ClaimStore(Path(tmpdir) / 'claims.json')

            first = claim_rewards('0xF38f4724ADCBEeA1704F5fC7CcC6A12d16fBF0D1', eligibility, store)
            second = check_eligibility('0xF38f4724ADCBEeA1704F5fC7CcC6A12d16fBF0D1', eligibility, store)
            raw = json.loads(Path(tmpdir, 'claims.json').read_text())

        self.assertTrue(first['success'])
        self.assertTrue(second['claimed'])
        self.assertIn('0xf38f4724adcbeea1704f5fc7ccc6a12d16fbf0d1', raw)


if __name__ == '__main__':
    unittest.main()
