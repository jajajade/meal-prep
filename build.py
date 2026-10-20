#!/usr/bin/env python3
"""Rebuild index.html from the newest week page (first entry in weeks.js)."""
import re, json, pathlib
root = pathlib.Path(__file__).parent
js = (root/"weeks.js").read_text()
latest = re.search(r'file:\s*"([^"]+)"', js).group(1)
page = (root/latest).read_text()
page = page.replace('href="../styles.css"', 'href="styles.css"')
page = re.sub(r'<div class="topbar">.*?</div>\n', '<div class="topbar">This week · <a href="#archive">Previous weeks ↓</a> · <a href="%s">Permalink</a></div>\n' % latest, page, count=1, flags=re.S)
page = page.replace('<a href="#repeat">Repeat this week</a>', '<a href="#repeat">Repeat this week</a><a href="#archive">Previous weeks</a>')
archive = '''
<section id="archive"><h2>📚 Previous weeks</h2>
<p class="small">Newest first. Tap a week to open it, or to repeat its shop.</p>
<div class="grid archive" id="weeklist"></div>
<noscript><p class="small">Turn on JavaScript to see the archive, or open the <code>weeks/</code> folder.</p></noscript>
</section>
'''
page = page.replace('</main>', archive + '</main>')
script = '''<script src="weeks.js"></script>
<script>
(function(){var el=document.getElementById('weeklist');(window.WEEKS||[]).forEach(function(w,i){
var a=document.createElement('a');a.href=w.file;a.className='card'+(i===0?' current':'');
a.innerHTML='<span class="tag'+(i===0?'':' p')+'">'+(i===0?'This week':'Past week')+'</span><h3>'+w.range+'</h3><p class="meta">'+w.title+'</p><p class="small">'+w.summary+'</p>';
el.appendChild(a);});})();
</script>
</body>'''
page = page.replace('</body>', script)
(root/"index.html").write_text(page)
print("index.html built from", latest)
