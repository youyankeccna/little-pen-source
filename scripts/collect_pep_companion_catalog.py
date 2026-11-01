"""Read unit headings from the publisher's current public companion pages."""
import concurrent.futures,json,re,subprocess
from html.parser import HTMLParser
from pathlib import Path
class Headings(HTMLParser):
 def __init__(self):super().__init__();self.on=False;self.parts=[];self.rows=[]
 def handle_starttag(self,t,a):
  if t=='h4':self.on=True;self.parts=[]
 def handle_data(self,s):
  if self.on:self.parts.append(s)
 def handle_endtag(self,t):
  if t=='h4' and self.on:
   self.on=False;title=''.join(self.parts).strip()
   if re.match(r'^(Unit\s*\d|Revision|Recycle)',title,re.I):self.rows.append(title)
def collect(code):
 url='https://www.pep.com.cn/zslth/yyptzy/xypep/'+code+'/'
 row=dict(grade=int(code[0]),subject='en',term='upper' if code[1]=='s' else 'lower',source=url,sourceKind='publisher-companion-current-path',editionStatus='copyright-page-not-verified')
 try:
  html=subprocess.run(['curl','--fail','--silent','--show-error','--location','--max-time','15',url],capture_output=True,check=True,timeout=18).stdout.decode('utf-8')
  parser=Headings();parser.feed(html);row.update(units=parser.rows,status='publisher-unit-headings' if parser.rows else 'no-unit-headings')
 except Exception as e:row.update(units=[],status='unavailable',error=type(e).__name__)
 return row
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:books=list(pool.map(collect,['3s','3x','4s','4x','5s','5x','6s']))
 out=dict(checkedAt='2026-10-15',note='人教官方当前配套页目录；不是教材正文、词表或已核验版权页。六年级下册不在当前页面导航内，不虚构地址。',books=books)
 Path('web-preview/curriculum/sources/pep-current.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
 Path('web-preview/curriculum/pep-current.js').write_text('(function(root){const data='+json.dumps(out,ensure_ascii=False)+';root.PepCurrentCatalog=data;if(typeof module!=="undefined")module.exports=data;})(typeof globalThis!=="undefined"?globalThis:this);\n')
 print(json.dumps([dict(grade=b['grade'],term=b['term'],status=b['status'],units=b['units']) for b in books],ensure_ascii=False))
