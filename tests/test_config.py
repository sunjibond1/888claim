import os
import tempfile
import unittest
from pathlib import Path

from claim888.config import load_env_file


class EnvLoadingTests(unittest.TestCase):
    def test_load_env_file_sets_missing_variables(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            env_path = Path(tmpdir) / '.env'
            env_path.write_text('CLAIM888_PORT=9999\nPRIVY_APP_ID=test-app\nPRIVY_CLIENT_ID=test-client\n')
            old_port = os.environ.pop('CLAIM888_PORT', None)
            old_app = os.environ.pop('PRIVY_APP_ID', None)
            old_client = os.environ.pop('PRIVY_CLIENT_ID', None)
            try:
                loaded = load_env_file(env_path)
                self.assertTrue(loaded)
                self.assertEqual(os.environ.get('CLAIM888_PORT'), '9999')
                self.assertEqual(os.environ.get('PRIVY_APP_ID'), 'test-app')
                self.assertEqual(os.environ.get('PRIVY_CLIENT_ID'), 'test-client')
            finally:
                os.environ.pop('CLAIM888_PORT', None)
                os.environ.pop('PRIVY_APP_ID', None)
                os.environ.pop('PRIVY_CLIENT_ID', None)
                if old_port is not None:
                    os.environ['CLAIM888_PORT'] = old_port
                if old_app is not None:
                    os.environ['PRIVY_APP_ID'] = old_app
                if old_client is not None:
                    os.environ['PRIVY_CLIENT_ID'] = old_client

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
