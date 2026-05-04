from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "index.html"
CSS_PATH = ROOT / "styles.css"
JS_PATH = ROOT / "app.js"
SW_PATH = ROOT / "sw.js"

STYLE_BLOCK_RE = re.compile(r"\s*<style(?:\s[^>]*)?>\s*\n(?P<css>[\s\S]*?)\n\s*</style>", re.IGNORECASE)
PLAIN_SCRIPT_BLOCK_RE = re.compile(r"\s*<script(?:\s[^>]*)?>\s*\n(?P<js>[\s\S]*?)\n\s*</script>", re.IGNORECASE)
EXTERNAL_CSS_LINK = '    <link rel="stylesheet" href="styles.css" />'
EXTERNAL_APP_SCRIPT = '    <script src="app.js" defer></script>'
APP_MARKERS = ["// State and Shortcuts", "const state ="]


def read_backup_index():
    try:
        return subprocess.check_output(
            ["git", "show", "origin/backup-before-split:index.html"],
            cwd=ROOT,
            text=True,
        )
    except subprocess.CalledProcessError as error:
        raise RuntimeError("Could not read index.html from origin/backup-before-split") from error


def extract_css_from_backup(backup_index):
    style_match = STYLE_BLOCK_RE.search(backup_index)
    if not style_match:
        raise RuntimeError("Could not find full inline CSS in backup-before-split index.html")

    css = style_match.group("css").strip() + "\n"
    CSS_PATH.write_text(css, encoding="utf-8")
    print("Restored full CSS from backup-before-split into styles.css")


def extract_app_js(index):
    script_matches = list(PLAIN_SCRIPT_BLOCK_RE.finditer(index))
    if script_matches:
        app_script_match = None
        for match in script_matches:
            if any(marker in match.group("js") for marker in APP_MARKERS):
                app_script_match = match

        app_script_match = app_script_match or script_matches[-1]
        js = app_script_match.group("js").strip() + "\n"
        JS_PATH.write_text(js, encoding="utf-8")
        index = PLAIN_SCRIPT_BLOCK_RE.sub("", index)
        print(f"Removed {len(script_matches)} inline JavaScript block(s) from index.html")
        return index

    marker_position = -1
    for marker in APP_MARKERS:
        marker_position = index.find(marker)
        if marker_position != -1:
            break

    if marker_position == -1:
        print("No inline app JavaScript found in index.html")
        return index

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
    return index


def ensure_external_links(index):
    index = STYLE_BLOCK_RE.sub("\n" + EXTERNAL_CSS_LINK, index)

    if 'href="styles.css"' not in index:
        index = index.replace('    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />', '    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />\n' + EXTERNAL_CSS_LINK)

    index = re.sub(r"\s*<script\s+src=[\"']app\.js[\"']\s+defer\s*>\s*</script>", "", index, flags=re.IGNORECASE)
    index = re.sub(r"\s*</body>", "\n" + EXTERNAL_APP_SCRIPT + "\n  </body>", index, count=1, flags=re.IGNORECASE)

    return index


def update_service_worker():
    if not SW_PATH.exists():
        return

    sw = SW_PATH.read_text(encoding="utf-8")
    original_sw = sw

    sw = re.sub(r'const APP_VERSION = "[^"]+";', 'const APP_VERSION = "2026.05.04-6";', sw)

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


backup_index = read_backup_index()
extract_css_from_backup(backup_index)

index = INDEX_PATH.read_text(encoding="utf-8")
index = extract_app_js(index)
index = ensure_external_links(index)

if any(marker in index for marker in APP_MARKERS):
    raise RuntimeError("index.html still appears to contain inline app JavaScript after cleanup")

INDEX_PATH.write_text(index, encoding="utf-8")
update_service_worker()

print("Split check complete: index.html now loads full styles.css and app.js externally.")
