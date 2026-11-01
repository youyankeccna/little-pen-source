"""Build title-practice metadata only; never copies textbook passages."""
import json,re
from pathlib import Path
base=Path(__file__).resolve().parents[1]/'web-preview/curriculum'
source=json.loads((base/'sources/catalog.json').read_text())
review=json.loads((base/'sources/github-content-review.json').read_text())
rows=[]
for book in source['books']:
 if book['subject']=='en':continue
 unit='课次目录'
 for index,raw in enumerate(book.get('contents',[])):
  title=raw.strip()
  if re.match(r'^第[一二三四五六七八九十]+单元',title) or (book['subject']=='math' and re.match(r'^[一二三四五六七八九十]+[ 、]',title)):
   unit=title;continue
  # Mathematical numbers belong to the title; the source has no separate lesson-number field.
  if book['subject']=='cn':title=re.sub(r'^\d+\s+\*?\s*','',title)
  title=title.replace('*','').strip()
  if not title or re.search(r'识字表|写字表|词语表|笔画名称|偏旁名称|目录|附录|习作例文[:：]?$|5引|____',title):continue
  if title in ['语文园地','数学游戏']:title=unit+' · '+title
  if any(r['grade']==book['grade'] and r['subject']==book['subject'] and r['term']==book['term'] and r['unit']==unit and r['title']==title for r in rows):continue
  rows.append(dict(id=f"topic-{book['id']}-{index}",grade=book['grade'],subject=book['subject'],term=book['term'],unit=unit,title=title,source=book.get('catalogResolvedUrl') or book.get('candidateCatalogUrl'),catalogStatus='secondary-topic-reference',edition='人教出版 · 已收录目录参考，非限定新版；版次待核验'))
# The existing official English units cover seven volumes; supplement only missing 6 lower.
for b in review['books']:
 if '/english/' in b['path'] and '六年级下册' in b['path']:
  for i,t in enumerate(b['unitTitles']):
   rows.append(dict(id=f'topic-en-6-lower-{i}',grade=6,subject='en',term='lower',unit=t,title=t,source=b['source'],catalogStatus='legacy-topic-reference',edition='人教 PEP 三年级起点 · 历史目录参考，非新版'))
payload={'note':'目录元数据用于课题书写及本站自编主题练习，不含教材原文或指定词表。','lessons':rows}
(base/'topic-catalog.js').write_text('(function(root){const data='+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+';root.TopicCatalog=data;if(typeof module!=="undefined")module.exports=data;})(typeof globalThis!=="undefined"?globalThis:this);\n')
print('Generated',len(rows),'topic entries')
