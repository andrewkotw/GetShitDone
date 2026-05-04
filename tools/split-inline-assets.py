from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "index.html"
CSS_PATH = ROOT / "styles.css"
JS_PATH = ROOT / "app.js"
SW_PATH = ROOT / "sw.js"

index = INDEX_PATH.read_text(encoding="utf-8")

style_match = re.search(r"\n?\s*<style>\n(?P<css>[\s\S]*?)\n\s*</style>", index)
script_matches = list(re.finditer(r"\n?\s*<script>\n(?P<js>[\s\S]*?)\n\s*</script>", index))

if not style_match and not script_matches:
    print("No inline <style> or plain inline <script> block found. Nothing to split.")
    raise SystemExit(0)

if style_match:
    css = style_match.group("css").strip() + "\n"
    CSS_PATH.write_text(css, encoding="utf-8")
    index = index[: style_match.start()] + '\n    <link rel="stylesheet" href="styles.css" />' + index[style_match.end():]
    print("Extracted inline CSS to styles.css")

if script_matches:
    # Use the final plain inline script as the app script. This avoids accidentally grabbing tiny setup snippets
    # if the app gains a small inline helper earlier in the document later.
    script_match = script_matches[-1]
    js = script_match.group("js").strip() + "\n"
    JS_PATH.write_text(js, encoding="utf-8")
    index = index[: script_match.start()] + '\n    <script src="app.js" defer></script>' + index[script_match.end():]
    print("Extracted inline JavaScript to app.js")

INDEX_PATH.write_text(index, encoding="utf-8")

if SW_PATH.exists():
    sw = SW_PATH.read_text(encoding="utf-8")
    sw = re.sub(r'const APP_VERSION = "[^"]+";', 'const APP_VERSION = "2026.05.04-2";', sw)

    if '"./styles.css"' not in sw:
        sw = sw.replace('  "./index.html",\n', '  "./index.html",\n  "./styles.css",\n')

    if '"./app.js"' not in sw:
        sw = sw.replace('  "./styles.css",\n', '  "./styles.css",\n  "./app.js",\n')

    SW_PATH.write_text(sw, encoding="utf-8")
    print("Updated sw.js cache list and app version")
