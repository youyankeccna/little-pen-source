"""Cross-check public metadata from multiple catalog providers; no textbook bodies."""
import concurrent.futures, json, re, urllib.request
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin

class Page(HTMLParser):
    def __init__(self):
        super().__init__();self.href=None;self.parts=[];self.links=[];self.json_mode=False;self.json_parts=[];self.schema=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='a':self.href=attrs.get('href');self.parts=[]
        if tag=='script' and attrs.get('type')=='application/ld+json':self.json_mode=True;self.json_parts=[]
    def handle_data(self,text):
        if self.href:self.parts.append(text)
        if self.json_mode:self.json_parts.append(text)
    def handle_endtag(self,tag):
        if tag=='a' and self.href:self.links.append((' '.join(self.parts).strip(),self.href));self.href=None
        if tag=='script' and self.json_mode:
            self.json_mode=False
            try:self.schema.append(json.loads(''.join(self.json_parts)))
            except ValueError:pass

def read(url):
    try:
        with urllib.request.urlopen(url,timeout=15) as response:
            html=response.read(1500000).decode('utf-8')
        page=Page();page.feed(html);return page,None
    except Exception as error:return None,type(error).__name__

def normalize(value):
    value=re.sub(r'^\s*\d+[.、\s]+', '',value)
    return re.sub(r'[\s·・◎:：()（）]', '',value).lower()

def main():
    base=Path('web-preview/curriculum/sources');catalog=json.loads((base/'catalog.json').read_text())
    home,error=read('https://keben.app/')
    if home is None:raise RuntimeError('Cannot read source index: '+str(error))
    wanted_grades=list('一二三四五六');urls={urljoin('https://keben.app',u) for t,u in home.links if u.startswith('/grade/') and any(u.startswith('/grade/'+g+'/') for g in ['yinianji','ernianji','sannianji','sinianji','wunianji','liunianji']) and u.rsplit('/',1)[-1] in ('yuwen','shuxue','yingyu')}
    candidates={};failures=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for url,(page,error) in zip(sorted(urls),pool.map(read,sorted(urls))):
            if page is None:failures.append(dict(url=url,error=error));continue
            for title,path in page.links:
                if not path.startswith('/book/') or any(mark in title for mark in ('五四制','五•四','五·四')):continue
                if ('语文' in title and '统编版' in title) or ('数学' in title and '人教版' in title) or ('英语' in title and ('PEP' in title or 'pep' in title)):
                    candidates[urljoin('https://keben.app',path)]=title
    details=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for url,(page,error) in zip(sorted(candidates),pool.map(read,sorted(candidates))):
            if page is None:failures.append(dict(url=url,error=error));continue
            schema=next((x for x in page.schema if x.get('@type')=='Book'),None)
            if not schema:continue
            if any('五' in str(x.get('itemListElement',[])) and '四学制' in str(x.get('itemListElement',[])) for x in page.schema if x.get('@type')=='BreadcrumbList'):continue
            title=schema.get('name','');grade=next((i+1 for i,g in enumerate(wanted_grades) if g+'年级' in title),None)
            if not grade:continue
            subject='cn' if '语文' in title else 'math' if '数学' in title else 'en'
            term='upper' if '上册' in title else 'lower' if '下册' in title else None
            if not term or (subject=='en' and grade<3):continue
            details.append(dict(url=url,title=title,grade=grade,subject=subject,term=term,claimedPublicationYear=schema.get('datePublished'),pages=schema.get('numberOfPages'),contents=[x['name'] for x in schema.get('hasPart',[]) if 'name' in x],verification='third-party-metadata-only'))
    current=json.loads((base/'pep-current.json').read_text()) if (base/'pep-current.json').exists() else {'books':[]}
    books=[]
    for original in catalog['books']:
        matches=[d for d in details if all(d[k]==original[k] for k in ('grade','subject','term'))]
        comparisons=[]
        old={normalize(t) for t in original['contents']}
        for m in matches:
            other={normalize(t) for t in m['contents']};common=sorted(old&other)
            comparisons.append(dict(source=m,matchingTitleCount=len(common),secondaryOnlyCount=len(other-old),originalOnlyCount=len(old-other),status='overlapping-catalogs-not-edition-proof' if common else 'no-overlap-or-missing-catalog'))
        publisher=next((entry for entry in current['books'] if all(entry[k]==original[k] for k in ('grade','subject','term')) and entry.get('units')),None)
        updated=original['subject'] in ('cn','math') and original['grade'] in (4,5,6) and original['term']=='upper'
        books.append(dict(bookId=original['id'],comparisons=comparisons,currentPublisherCatalog=publisher,officialRevisionNotice=dict(url='https://jyj.wuhu.gov.cn/xwzx/tzgg/8953250.html',publishedAt='2026-08-31',claim='地方教育局通报本册2026年新编且目录已更新；未给出完整课次或ISBN') if updated else None,decision='current-publisher-catalog-found-edition-review-pending' if publisher else 'candidate-source-needs-copyright-page-review' if matches else 'additional-source-not-found'))
    output=dict(checkedAt='2026-10-15',scope='仅多源书目和目录核对；不证明教材正文已授权，不将旧版替换新版。',sourceSites=['https://jc.pep.com.cn/','https://github.com/siknet/FreePEP/blob/main/pep_catalog.json','https://www.dzkbw.org/textbooks/rjb.html','https://keben.app/','https://jyj.wuhu.gov.cn/xwzx/tzgg/8953250.html'],indexPagesChecked=len(urls),candidateBooksRead=len(details),failures=failures,books=books)
    (base/'crosscheck.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(dict(indexPages=len(urls),candidateBooks=len(details),matchedBooks=sum(bool(b['comparisons']) for b in books),officialRevisionNotices=sum(bool(b['officialRevisionNotice']) for b in books),failures=len(failures))))
if __name__=='__main__':main()
