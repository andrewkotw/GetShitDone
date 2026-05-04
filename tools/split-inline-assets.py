from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "index.html"
CSS_PATH = ROOT / "styles.css"
JS_PATH = ROOT / "app.js"
SW_PATH = ROOT / "sw.js"

index = INDEX_PATH.read_text(encoding="utf-8")

STYLE_BLOCK_RE = re.compile(r"\s*<style(?:\s[^>]*)?>\s*\n(?P<css>[\s\S]*?)\n\s*</style>", re.IGNORECASE)
PLAIN_SCRIPT_BLOCK_RE = re.compile(r"\s*<script(?:\s[^>]*)?>\s*\n(?P<js>[\s\S]*?)\n\s*</script>", re.IGNORECASE)
EXTERNAL_APP_SCRIPT = '    <script src="app.js" defer></script>'
APP_MARKERS = ["// State and Shortcuts", "const state ="]

style_match = STYLE_BLOCK_RE.search(index)
if style_match:
    css = style_match.group("css").strip() + "\n"
    CSS_PATH.write_text(css, encoding="utf-8")
    index = index[: style_match.start()] + '\n    <link rel="stylesheet" href="styles.css" />' + index[style_match.end():]
    print("Extracted inline CSS to styles.css")
else:
    print("No inline CSS block found")

script_matches = list(PLAIN_SCRIPT_BLOCK_RE.finditer(index))
if script_matches:
    # Prefer a script block that contains the app state marker. Fall back to the final inline script.
    app_script_match = None
    for match in script_matches:
        if any(marker in match.group("js") for marker in APP_MARKERS):
            app_script_match = match

    app_script_match = app_script_match or script_matches[-1]
    js = app_script_match.group("js").strip() + "\n"
    JS_PATH.write_text(js, encoding="utf-8")
    index = PLAIN_SCRIPT_BLOCK_RE.sub("", index)
    print(f"Removed {len(script_matches)} inline JavaScript block(s) from index.html")
else:
    print("No regex-matching inline JavaScript block found")

# Fallback cleanup for malformed or oddly-indented leftover app script blocks.
marker_position = -1
for marker in APP_MARKERS:
    marker_position = index.find(marker)
    if marker_position != -1:
        break

if marker_position != -1:
    script_start = index.rfind("<script", 0, marker_position)
    script_end = index.find("</script>", marker_position)

    if script_start == -1 or script_end == -1:
        raise RuntimeError("Found inline app JavaScript marker, but could not find enclosing <script>...</script> tags")

    script_end += len("</script>")
    leftover_script = index[script_start:script_end]
    js_match = re.search(r"<script(?:\s[^>]*)?>(?P<js>[\s\S]*?)</script>", leftover_script, re.IGNORECASE)

    if js_match:
        JS_PATH.write_text(js_match.group("js").strip() + "\n", encoding="utf-8")

    index = index[:script_start] + index[script_end:]
    print("Removed leftover inline app JavaScript block by marker search")

# Make sure index.html loads app.js exactly once, near the end of body.
index = re.sub(r"\s*<script\s+src=[\"']app\.js[\"']\s+defer\s*>\s*</script>", "", index, flags=re.IGNORECASE)
index = re.sub(r"\s*</body>", "\n" + EXTERNAL_APP_SCRIPT + "\n  </body>", index, count=1, flags=re.IGNORECASE)

if any(marker in index for marker in APP_MARKERS):
    raise RuntimeError("index.html still appears to contain inline app JavaScript after cleanup")

INDEX_PATH.write_text(index, encoding="utf-8")

if SW_PATH.exists():
    sw = SW_PATH.read_text(encoding="utf-8")
    original_sw = sw

    sw = re.sub(r'const APP_VERSION = "[^"]+";', 'const APP_VERSION = "2026.05.04-5";', sw)

    if '"./styles.css"' not in sw:
        sw = sw.replace('  "./index.html",\n', '  "./index.html",\n  "./styles.css",\n')

    if '"./app.js"' not in sw:
        if '"./styles.css"' in sw:
            sw = sw.replace('  "./styles.css",\n', '  "./styles.css",\n  "./app.js",\n')
        else:
            sw = sw.replace('  "./index.html",\n', '  "./index.html",\n  "./app.js",\n')

    if sw != original_sw:
        SW_PATH.write_text(sw, encoding="utf-8")
        print("Updated sw.js cache list and app version")

print("Split check complete: index.html now loads styles.css and app.js externally.")
