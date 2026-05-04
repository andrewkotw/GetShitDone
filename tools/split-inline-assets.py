from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "index.html"
CSS_PATH = ROOT / "styles.css"
JS_PATH = ROOT / "app.js"
SW_PATH = ROOT / "sw.js"

index = INDEX_PATH.read_text(encoding="utf-8")

STYLE_BLOCK_RE = re.compile(r"\s*<style(?:\s[^>]*)?>\s*\n(?P<css>[\s\S]*?)\n\s*</style>", re.IGNORECASE)
PLAIN_SCRIPT_BLOCK_RE = re.compile(r"\s*<script>\s*\n(?P<js>[\s\S]*?)\n\s*</script>", re.IGNORECASE)
EXTERNAL_APP_SCRIPT = '    <script src="app.js" defer></script>'

style_match = STYLE_BLOCK_RE.search(index)
if style_match:
    css = style_match.group("css").strip() + "\n"
    CSS_PATH.write_text(css, encoding="utf-8")
    index = index[: style_match.start()] + '\n    <link rel="stylesheet" href="styles.css" />' + index[style_match.end():]
    print("Extracted inline CSS to styles.css")
else:
    print("No inline CSS block found")

# Re-scan after CSS replacement. Positions before this point are no longer valid.
script_matches = list(PLAIN_SCRIPT_BLOCK_RE.finditer(index))
if script_matches:
    # Keep the final inline app script as app.js. Then remove ALL plain inline scripts from index.html.
    js = script_matches[-1].group("js").strip() + "\n"
    JS_PATH.write_text(js, encoding="utf-8")
    index = PLAIN_SCRIPT_BLOCK_RE.sub("", index)
    print(f"Removed {len(script_matches)} inline JavaScript block(s) from index.html")
else:
    print("No plain inline JavaScript block found")

# Make sure index.html loads app.js exactly once, near the end of body.
index = re.sub(r"\s*<script\s+src=[\"']app\.js[\"']\s+defer\s*>\s*</script>", "", index, flags=re.IGNORECASE)
index = re.sub(r"\s*</body>", "\n" + EXTERNAL_APP_SCRIPT + "\n  </body>", index, count=1, flags=re.IGNORECASE)

# Hard stop if a giant inline app script is still there.
if "// State and Shortcuts" in index or "const state =" in index:
    raise RuntimeError("index.html still appears to contain inline app JavaScript after cleanup")

INDEX_PATH.write_text(index, encoding="utf-8")

if SW_PATH.exists():
    sw = SW_PATH.read_text(encoding="utf-8")
    original_sw = sw

    sw = re.sub(r'const APP_VERSION = "[^"]+";', 'const APP_VERSION = "2026.05.04-4";', sw)

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
