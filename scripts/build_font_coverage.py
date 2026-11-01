"""Build exact cmap coverage for the two fonts shipped with the worksheet app."""
import json
from pathlib import Path
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1] / 'web-preview' / 'vendor'
result = {}
for name, filename in [('wenkai', 'wenkai.ttf'), ('italic', 'lora-italic.ttf')]:
    with TTFont(root / filename) as font:
        codes = sorted(font.getBestCmap())
    ranges = []
    for code in codes:
        if ranges and code == ranges[-1][1] + 1:
            ranges[-1][1] = code
        else:
            ranges.append([code, code])
    result[name] = ranges
(root / 'font-coverage.json').write_text(json.dumps(result, separators=(',', ':')) + '\n')
