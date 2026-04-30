import os
import tempfile
import unittest
from pathlib import Path

from claim888.config import load_env_file


class EnvLoadingTests(unittest.TestCase):
    def test_load_env_file_sets_missing_variables(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            env_path = Path(tmpdir) / '.env'
            env_path.write_text('CLAIM888_PORT=9999\nWALLETCONNECT_PROJECT_ID=test-project\n')
            old_port = os.environ.pop('CLAIM888_PORT', None)
            old_wc = os.environ.pop('WALLETCONNECT_PROJECT_ID', None)
            try:
                loaded = load_env_file(env_path)
                self.assertTrue(loaded)
                self.assertEqual(os.environ.get('CLAIM888_PORT'), '9999')
                self.assertEqual(os.environ.get('WALLETCONNECT_PROJECT_ID'), 'test-project')
            finally:
                os.environ.pop('CLAIM888_PORT', None)
                os.environ.pop('WALLETCONNECT_PROJECT_ID', None)
                if old_port is not None:
                    os.environ['CLAIM888_PORT'] = old_port
                if old_wc is not None:
                    os.environ['WALLETCONNECT_PROJECT_ID'] = old_wc

    def test_load_env_file_keeps_existing_environment_values(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            env_path = Path(tmpdir) / '.env'
            env_path.write_text('CLAIM888_PORT=9999\n')
            old_port = os.environ.get('CLAIM888_PORT')
            os.environ['CLAIM888_PORT'] = '8123'
            try:
                load_env_file(env_path)
                self.assertEqual(os.environ.get('CLAIM888_PORT'), '8123')
            finally:
                os.environ.pop('CLAIM888_PORT', None)
                if old_port is not None:
                    os.environ['CLAIM888_PORT'] = old_port


if __name__ == '__main__':
    unittest.main()
