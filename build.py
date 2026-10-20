#!/usr/bin/env python3
"""Rebuild index.html from the newest week page (first entry in weeks.js)."""
import re, pathlib
root = pathlib.Path(__file__).parent
js = (root / "weeks.js").read_text()
latest = re.search(r'file:\s*"([^"]+)"', js).group(1)          # e.g. weeks/2026-10-20.html
page = (root / latest).read_text()
folder = latest.rsplit("/", 1)[0] + "/"
page = page.replace('href="../', 'href="').replace('src="../', 'src="')
page = re.sub(r'src="([^"/]+\.data\.js)"', lambda m: 'src="%s%s"' % (folder, m.group(1)), page)
page = page.replace('<a href="index.html" class="back">All weeks</a>', '<a href="#archive" class="back">Past weeks</a>')
archive = '''  <section class="below quiet anchor" id="archive">
    <h2>Past weeks</h2>
    <ul class="archive" id="weeklist"></ul>
  </section>
'''
page = page.replace('  <p class="small muted foot" id="targets">', archive + '  <p class="small muted foot" id="targets">')
script = '''<script>
(function(){var el=document.getElementById('weeklist');(window.WEEKS||[]).forEach(function(w,i){
var li=document.createElement('li');li.innerHTML='<a href="'+w.file+'"><b>'+w.range+'</b>'+(i===0?' (this week)':'')+'<span>'+w.summary+'</span></a>';el.appendChild(li);});})();
</script>
</body>'''
page = page.replace('</body>', script)
(root / "index.html").write_text(page)
print("index.html built from", latest)
