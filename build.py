#!/usr/bin/env python3
"""Rebuild index.html from the newest week page (first entry in weeks.js).
The History tab (past weeks) is rendered by app.js from weeks.js, so index is just the
newest week page with its paths rewritten for the site root."""
import re, pathlib
root = pathlib.Path(__file__).parent
js = (root / "weeks.js").read_text()
latest = re.search(r'file:\s*"([^"]+)"', js).group(1)          # e.g. weeks/2026-10-20.html
page = (root / latest).read_text()
folder = latest.rsplit("/", 1)[0] + "/"
page = page.replace('href="../', 'href="').replace('src="../', 'src="')
page = re.sub(r'src="([^"/]+\.data\.js)"', lambda m: 'src="%s%s"' % (folder, m.group(1)), page)
(root / "index.html").write_text(page)
print("index.html built from", latest)
