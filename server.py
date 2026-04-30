import json
import mimetypes
import os
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from claim888.backend import ClaimStore, check_eligibility, claim_rewards, load_eligibility_map
from claim888.config import load_env_file

APP_ROOT = Path(__file__).resolve().parent
load_env_file(APP_ROOT / '.env')
STATIC_ROOT = APP_ROOT / 'static'
LOGO_PATH = STATIC_ROOT / 'scor-logo-dark.svg'
XLSX_PATH = APP_ROOT / 'data' / 'SCOR_Eligible addresses_888.xlsx'
CLAIMS_PATH = APP_ROOT / 'data' / 'claims.json'
HOST = os.environ.get('CLAIM888_HOST', '127.0.0.1')
PORT = int(os.environ.get('CLAIM888_PORT', '8123'))
BASE_CHAIN_ID = 8453
WALLETCONNECT_PROJECT_ID = os.environ.get('WALLETCONNECT_PROJECT_ID', '').strip()

ELIGIBILITY_MAP = load_eligibility_map(XLSX_PATH)
CLAIM_STORE = ClaimStore(CLAIMS_PATH)
RATE_LIMITS = {
    'check': {'window': 300, 'limit': 15},
    'claim': {'window': 3600, 'limit': 5},
}
REQUEST_LOG = {'check': {}, 'claim': {}}


def json_response(handler, payload, status=HTTPStatus.OK):
    body = json.dumps(payload).encode('utf-8')
    handler.send_response(status)
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.send_header('Content-Length', str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def read_json(handler):
    length = int(handler.headers.get('Content-Length', '0') or '0')
    raw = handler.rfile.read(length) if length else b'{}'
    return json.loads(raw.decode('utf-8') or '{}')


def is_rate_limited(bucket_name: str, key: str) -> bool:
    bucket = REQUEST_LOG[bucket_name]
    settings = RATE_LIMITS[bucket_name]
    now = time.time()
    values = [item for item in bucket.get(key, []) if now - item < settings['window']]
    if len(values) >= settings['limit']:
        bucket[key] = values
        return True
    values.append(now)
    bucket[key] = values
    return False


class ClaimHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        return

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip('/') or '/'
        if path in {'/claim888', '/'}:
            return self.serve_file(STATIC_ROOT / 'index.html', 'text/html; charset=utf-8')
        if path.startswith('/claim888/'):
            relative = path.replace('/claim888/', '', 1)
            file_path = STATIC_ROOT / relative
            return self.serve_file(file_path)
        if path == '/healthz' or path == '/healthz/':
            return json_response(self, {
                'ok': True,
                'service': 'claim888',
                'eligibleCount': len(ELIGIBILITY_MAP),
            })
        if path == '/logo/scor-logo-dark.svg':
            return self.serve_file(LOGO_PATH, 'image/svg+xml')
        if path == '/api/config' or path == '/api/config/':
            return json_response(self, {
                'walletConnectProjectId': WALLETCONNECT_PROJECT_ID,
                'baseChainId': BASE_CHAIN_ID,
            })
        return self.not_found()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip('/')
        try:
            payload = read_json(self)
        except json.JSONDecodeError:
            return json_response(self, {'error': 'Invalid JSON payload.'}, status=HTTPStatus.BAD_REQUEST)

        client_key = self.client_address[0]
        wallet = (payload.get('walletAddress') or '').strip()
        if path == '/api/claim888/check':
            if is_rate_limited('check', client_key):
                return json_response(self, {'error': 'Too many requests. Please wait and try again.'}, status=HTTPStatus.TOO_MANY_REQUESTS)
            if not wallet:
                return json_response(self, {'error': 'Wallet address is required.'}, status=HTTPStatus.BAD_REQUEST)
            result = check_eligibility(wallet, ELIGIBILITY_MAP, CLAIM_STORE)
            return json_response(self, result)

        if path == '/api/claim888/claim':
            if is_rate_limited('claim', client_key):
                return json_response(self, {'error': 'Too many claim attempts. Please try again later.'}, status=HTTPStatus.TOO_MANY_REQUESTS)
            if not wallet:
                return json_response(self, {'error': 'Wallet address is required.'}, status=HTTPStatus.BAD_REQUEST)
            result = claim_rewards(wallet, ELIGIBILITY_MAP, CLAIM_STORE)
            status = HTTPStatus.OK if result.get('success') else HTTPStatus.BAD_REQUEST
            return json_response(self, result, status=status)

        return self.not_found()

    def serve_file(self, path: Path, content_type: str = None):
        if not path.exists() or not path.is_file():
            return self.not_found()
        data = path.read_bytes()
        self.send_response(HTTPStatus.OK)
        guessed = content_type or mimetypes.guess_type(str(path))[0] or 'application/octet-stream'
        self.send_header('Content-Type', guessed)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def not_found(self):
        self.send_response(HTTPStatus.NOT_FOUND)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.end_headers()
        self.wfile.write(b'Not found')


def run():
    server = ThreadingHTTPServer((HOST, PORT), ClaimHandler)
    print(f'SCOR claim888 server listening on http://{HOST}:{PORT}/claim888')
    server.serve_forever()


if __name__ == '__main__':
    run()
