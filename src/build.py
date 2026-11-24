import os
HERE = os.path.dirname(os.path.abspath(__file__))
import re, shutil
old = open(HERE+'/legacy-index.html', encoding='utf-8').read()
oldcss = open(HERE+'/new.css', encoding='utf-8').read()
patch = open(HERE+'/patch.py', encoding='utf-8').read()

# texture tokens
ns = {}
exec(patch.split("tok={")[0].split("src=open")[0] + "\n" + "def svg(w,h,inner):\n    return 'url(\"data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'%d\\' height=\\'%d\\'>%s</svg>\")'%(w,h,inner)\n"
     "def noise(w,h,freq,octv,seed,matrix):\n    return svg(w,h,\"<filter id='f' x='0' y='0' width='100%%25' height='100%%25'><feTurbulence type='fractalNoise' baseFrequency='%s' numOctaves='%d' seed='%d'/><feColorMatrix values='%s'/></filter><rect width='100%%25' height='100%%25' filter='url(%%23f)'/>\"%(freq,octv,seed,matrix))\n", ns)
noise = ns['noise']
tok = {
 'LEATHER': noise(180,180,'.85',2,3,'0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 -.08'),
 'PAPER':   noise(220,220,'.55 .9',2,11,'0 0 0 0 .32  0 0 0 0 .24  0 0 0 0 .12  0 0 0 .20 0'),
 'GRAIN':   noise(240,240,'.8',1,9,'1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 .1 0'),
}

# book engine CSS from the previous build (stage, book, pages, controls)
i0 = oldcss.index('/* ==========================================================================\n   STAGE')
i1 = oldcss.index('@media (max-width: 759px)')
engine = oldcss[i0:i1]
engine = engine.replace('#stage.on #dim', '#stage.dimmed #dim')
scene = open(HERE+'/scene.css', encoding='utf-8').read()
css = scene + '\n' + engine
for k, v in tok.items(): css = css.replace('{{%s}}' % k, v)
assert '{{' not in css

# content
m = re.search(r'<div id="library-data" hidden>(.*?)</div>\s*\n\s*<script>', old, flags=re.S)
data = m.group(1)
secs = {}
for sm in re.finditer(r'(<section class="vol" data-id="(\w+)".*?</section>)', data, flags=re.S):
    secs[sm.group(2)] = sm.group(1)

# education article goes into About, before "Looking ahead"
edu = re.findall(r'<article class="pg">.*?</article>', secs['education'], flags=re.S)[0]
about = secs['about']
about = about.replace('    <article class="pg">\n      <h3>Looking ahead</h3>', '    ' + edu + '\n    <article class="pg">\n      <h3>Looking ahead</h3>')
assert 'Kansas State University' in about
about = re.sub(r'data-theme="\w+"', 'data-theme="about"', about, count=1)



def kick(s, old_k, new_k): return s.replace('<p class="kicker">%s</p>' % old_k, '<p class="kicker">%s</p>' % new_k)
exp = secs['experience']
wri = kick(secs['writing'], 'Volume V', 'Volume III')
res = kick(secs['research'], 'Volume IV', 'Volume IV')
con = kick(secs['contact'], 'Volume VI', 'Volume V')

# ---- About: add a page about the site itself
site_pg = '''<article class="pg">
      <h3>About this site</h3>
      <p>This site is built as a law library, and each book on the shelf is one part of my portfolio.</p>
      <ol>
        <li><strong>Experience</strong> opens with my r&eacute;sum&eacute; and then walks through each position.</li>
        <li><strong>Writing</strong> holds my writing samples and current scholarship.</li>
        <li><strong>Research</strong> describes my empirical and policy research.</li>
        <li><strong>Contact</strong> is the best way to reach me.</li>
      </ol>
      <p>The globe opens <em>The Legal Wire</em>, a newspaper of headlines from public sources on securities enforcement, privacy, regulation, Congress and the Supreme Court. It updates daily, and every story links to its source.</p>
      <p>The bust of Thomas Jefferson hands you a random passage from his letters and writings, in his own hand.</p>
      <p class="meta">The views on this site are my own. They do not represent my employer, my school, or any government agency.</p>
    </article>
    '''
about = about.replace('<article class="pg">\n      <h3>Looking ahead</h3>', site_pg + '<article class="pg">\n      <h3>Looking ahead</h3>')
assert 'About this site' in about

# ---- Experience: resume on the first page after the title page
resume_pg = '''<article class="pg">
      <h3>R&eacute;sum&eacute;</h3>
      <p>My full r&eacute;sum&eacute; is available as a PDF.</p>
      <p><a href="resume.pdf" target="_blank" rel="noopener">Download r&eacute;sum&eacute; (PDF)</a></p>
      <p>The pages that follow give a closer look at each position.</p>
    </article>
    '''
exp = re.sub(r'\s*<article class="pg">\s*<h3>R&eacute;sum&eacute;</h3>.*?</article>', '', exp, flags=re.S)
exp = exp.replace('<article class="pg">\n      <h3>Experience</h3>', resume_pg + '<article class="pg">\n      <h3>Experience</h3>', 1)
assert exp.count('R&eacute;sum&eacute;</h3>') == 1 and exp.index('R&eacute;sum&eacute;</h3>') < exp.index('<h3>Experience</h3>')

# ---- Writing: samples
wri = re.sub(r'<article class="pg">\s*<h3>Writing samples</h3>.*?</article>', '''<article class="pg">
      <h3>Writing samples</h3>
      <p>Non-confidential samples, available to read or download as PDFs.</p>
      <ol>
        <li><span class="todo">[Sample title, a one-line description, and a link such as samples/your-file.pdf]</span></li>
        <li><span class="todo">[Sample title, a one-line description, and a link such as samples/your-file.pdf]</span></li>
      </ol>
      <p>For anything else, please reach out through the <a data-open="contact">Contact volume</a>.</p>
    </article>''', wri, flags=re.S)
assert 'samples/your-file.pdf' in wri

# ---- Research: add a page on following developments
res = res.replace('    <article class="pg">\n      <h3>What it taught me</h3>', '''    <article class="pg">
      <h3>Following developments</h3>
      <p>Alongside this project I keep up with regulatory and policy developments at the intersection of law, technology and public policy. <em>The Legal Wire</em>, the newspaper behind the globe on the shelf, collects the headlines I follow.</p>
      <p><a data-open="news">Open The Legal Wire</a></p>
    </article>
    <article class="pg">
      <h3>What it taught me</h3>''', 1)
assert 'Following developments' in res

order = [about, exp, wri, res, con]
newdata = '\n\n  '.join(order)
newdata = newdata.replace('sub plain', 'sub').replace('meta plain', 'meta')
# content.html is the source of truth for the books; the assembly above only remains as a fallback
if os.path.exists(HERE + '/content.html'):
    newdata = open(HERE + '/content.html', encoding='utf-8').read().rstrip('\n')

body = open(HERE+'/body.html', encoding='utf-8').read()
js = open(HERE+'/app.js', encoding='utf-8').read()

html = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#070504">
<title>The Willis Writ | Jackson Willis</title>
<meta name="description" content="Portfolio of Jackson Willis, law student at Boston University School of Law: experience, writing, research, and contact.">
<link rel="preload" as="image" href="library.jpg" media="(min-aspect-ratio: 23/20)">
<link rel="preload" as="image" href="library-m.jpg" media="(max-aspect-ratio: 23/20)">
<style>
''' + css + '''</style>
<noscript>
<style>
  html, body { overflow: auto !important; height: auto !important; }
  #viewport { display: none !important; }
  #library-data { display: block !important; max-width: 720px; margin: 2rem auto; padding: 1.5rem; background: #f3e9d2; color: #2a1d12; font-size: 18px; }
  #library-data .vol { margin-bottom: 2rem; }
</style>
</noscript>
</head>

<body>
''' + body + '''
<div id="library-data" hidden>

  ''' + newdata + '''

</div>

<script>
''' + js + '''</script>
</body>
</html>
'''
import re as _re
html = html.replace("'Cormorant Garamond'", "'Times New Roman'").replace("'EB Garamond'", "'Times New Roman'").replace(', Georgia', ', Times')
html = _re.sub(r"('Times New Roman'),\s*'Times New Roman'", r"\1", html)
html = html.replace("'Times New Roman', 'Times New Roman'", "'Times New Roman'")
open(HERE+'/../index.html', 'w', encoding='utf-8').write(html)
print(len(html))
