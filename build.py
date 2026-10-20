#!/usr/bin/env python3
"""Rebuild index.html from the newest week page (first entry in weeks.js), and
stamp every local asset URL (css, js, data, icons, manifest) with ?v=<content hash>
in all week pages, index.html and the manifest, so phones/home-screen apps never
mix a new page with a cached old app.js/styles.css (GitHub Pages sends max-age=600)."""
import re, json, hashlib, pathlib
root = pathlib.Path(__file__).parent
h = hashlib.sha1()
for p in sorted(root.glob("*.js")) + sorted(root.glob("weeks/*.js")) + [root / "styles.css", root / "favicon.svg"] + sorted(root.glob("icons/*.png")):
    h.update(p.read_bytes())
V = h.hexdigest()[:10]
ASSET = r'((?:href|src)="(?!https?:|#|mailto:)[^"?#]+\.(?:css|js|svg|png|ico|webmanifest))(?:\?v=[^"]*)?"'
stamp = lambda s: re.sub(ASSET, lambda m: m.group(1) + '?v=' + V + '"', s)
for wk in root.glob("weeks/*.html"):
    wk.write_text(stamp(wk.read_text()))
man = root / "manifest.webmanifest"
m = json.loads(man.read_text())
for ic in m.get("icons", []):
    ic["src"] = ic["src"].split("?")[0] + "?v=" + V
man.write_text(json.dumps(m, indent=2, ensure_ascii=False) + "\n")
js = (root / "weeks.js").read_text()
latest = re.search(r'file:\s*"([^"]+)"', js).group(1)
page = (root / latest).read_text()
folder = latest.rsplit("/", 1)[0] + "/"
page = page.replace('href="../', 'href="').replace('src="../', 'src="')
page = re.sub(r'src="([^"/]+\.data\.js\?v=[^"]*)"', lambda m: 'src="%s%s"' % (folder, m.group(1)), page)
(root / "index.html").write_text(page)
print("index.html built from", latest, "assets v=" + V)
