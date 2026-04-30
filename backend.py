import json
from pathlib import Path
from typing import Dict
from zipfile import ZipFile
import xml.etree.ElementTree as ET

NS = {'a': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def normalize_address(address: str) -> str:
    return (address or '').strip().lower()


def _load_shared_strings(archive: ZipFile):
    if 'xl/sharedStrings.xml' not in archive.namelist():
        return []
    root = ET.fromstring(archive.read('xl/sharedStrings.xml'))
    values = []
    for si in root.findall('a:si', NS):
        texts = [node.text or '' for node in si.findall('.//a:t', NS)]
        values.append(''.join(texts))
    return values


def load_eligibility_map(xlsx_path: Path) -> Dict[str, int]:
    result: Dict[str, int] = {}
    with ZipFile(xlsx_path) as archive:
        shared = _load_shared_strings(archive)
        sheet = ET.fromstring(archive.read('xl/worksheets/sheet1.xml'))
        for row_index, row in enumerate(sheet.findall('a:sheetData/a:row', NS)):
            if row_index == 0:
                continue
            values = []
            for cell in row.findall('a:c', NS):
                cell_type = cell.get('t')
                value_node = cell.find('a:v', NS)
                value = value_node.text if value_node is not None else ''
                if cell_type == 's' and value != '':
                    value = shared[int(value)]
                values.append(value)
            if len(values) < 2:
                continue
            address = normalize_address(values[0])
            if not address:
                continue
            gems = int(float(values[1]))
            result[address] = gems
    return result


class ClaimStore:
    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.path.write_text('{}')

    def _load(self):
        try:
            return json.loads(self.path.read_text())
        except json.JSONDecodeError:
            return {}

    def _save(self, payload):
        self.path.write_text(json.dumps(payload, indent=2))

    def is_claimed(self, address: str) -> bool:
        return normalize_address(address) in self._load()

    def mark_claimed(self, address: str, gems: int):
        payload = self._load()
        payload[normalize_address(address)] = {'claimed': True, 'gems': gems}
        self._save(payload)


def check_eligibility(address: str, eligibility_map: Dict[str, int], store: ClaimStore):
    normalized = normalize_address(address)
    gems = eligibility_map.get(normalized, 0)
    if not gems:
        return {
            'eligible': False,
            'claimed': False,
            'gems': 0,
            'message': 'Oops! No additional rewards this time. Follow SCOR’s future campaigns to score next time.'
        }
    claimed = store.is_claimed(normalized)
    return {
        'eligible': True,
        'claimed': claimed,
        'gems': gems,
        'message': 'Rewards already claimed for this wallet.' if claimed else 'Congrats! You’re eligible for additional rewards.'
    }


def claim_rewards(address: str, eligibility_map: Dict[str, int], store: ClaimStore):
    result = check_eligibility(address, eligibility_map, store)
    if not result['eligible']:
        return {'success': False, 'message': result['message'], 'gems': 0, 'claimed': False}
    if result['claimed']:
        return {'success': False, 'message': 'Rewards already claimed for this wallet.', 'gems': result['gems'], 'claimed': True}
    store.mark_claimed(address, result['gems'])
    return {
        'success': True,
        'claimed': True,
        'gems': result['gems'],
        'message': f'"{result["gems"]}" rewards have been sent to your Master Wallet.'
    }
