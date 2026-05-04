from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "index.html"
CSS_PATH = ROOT / "styles.css"
JS_PATH = ROOT / "app.js"
SW_PATH = ROOT / "sw.js"

STYLE_BLOCK_RE = re.compile(r"\n?\s*<style>\n(?P<css>[\s\S]*?)\n\s*</style>")
PLAIN_SCRIPT_BLOCK_RE = re.compile(r"\n?\s*<script>\n(?P<js>[\s\S]*?)\n\s*</script>")

index = INDEX_PATH.read_text(encoding="utf-8")
changed = False

style_match = STYLE_BLOCK_RE.search(index)
if style_match:
    css = style_match.group("css").strip() + "\n"
    CSS_PATH.write_text(css, encoding="utf-8")
    index = index[: style_match.start()] + '\n    <link rel="stylesheet" href="styles.css" />' + index[style_match.end():]
    changed = True
    print("Extracted inline CSS to styles.css")
else:
    print("No inline CSS block found")

# Important: search for scripts after the CSS replacement.
# Removing the style block changes character positions, so old regex match positions become unsafe.
script_matches = list(PLAIN_SCRIPT_BLOCK_RE.finditer(index))
if script_matches:
    # Use the final plain inline script as the app script. This avoids accidentally grabbing tiny setup snippets
    # if the app gains a small inline helper earlier in the document later.
    script_match = script_matches[-1]
    js = script_match.group("js").strip() + "\n"
    JS_PATH.write_text(js, encoding="utf-8")
    index = index[: script_match.start()] + '\n    <script src="app.js" defer></script>' + index[script_match.end():]
    changed = True
    print("Extracted inline JavaScript to app.js")
else:
    print("No plain inline JavaScript block found")

if changed:
    INDEX_PATH.write_text(index, encoding="utf-8")
else:
    print("No inline assets needed splitting")

if SW_PATH.exists():
    sw = SW_PATH.read_text(encoding="utf-8")
    original_sw = sw

    sw = re.sub(r'const APP_VERSION = "[^"]+";', 'const APP_VERSION = "2026.05.04-3";', sw)

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
