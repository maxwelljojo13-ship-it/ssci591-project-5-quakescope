"""Reduce public source data to the attributes used by QuakeScope."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
data = root / 'dist' / 'data'
raw = root / 'source_data'
raw.mkdir(exist_ok=True)
for name in ('earthquakes', 'countries'):
    source = data / f'{name}.geojson'
    original = raw / source.name
    if not original.exists():
        original.write_bytes(source.read_bytes())
    obj = json.loads(original.read_text(encoding='utf-8'))
    if name == 'earthquakes':
        obj['features'] = [f for f in obj['features'] if 1704067200000 <= f['properties']['time'] < 1706745600000]
        for f in obj['features']:
            f['properties'] = {k: f['properties'][k] for k in ('mag', 'place', 'time', 'url', 'magType', 'status')}
        obj['metadata'] = {'source': 'USGS ComCat', 'period': '2024-01-01 to 2024-01-31 UTC', 'minMagnitude': 4.5, 'count': len(obj['features']), 'retrieved': '2026-11-24', 'query': 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2024-01-01T00:00:00&endtime=2024-02-01T00:00:00&minmagnitude=4.5&eventtype=earthquake&orderby=time-asc'}
        obj.pop('bbox', None)
    else:
        for f in obj['features']:
            f['properties'] = {'name': f['properties']['NAME_EN']}
            f.pop('bbox', None)
        obj.pop('bbox', None)
    source.write_text(json.dumps(obj, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(name, len(obj['features']), source.stat().st_size)
